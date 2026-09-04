import { createContext, useCallback, useContext, useState } from 'react';
import { supabase } from '../account/supabaseClient.js';
import {
  generateKeyPair,
  wrapPrivateKey,
  unwrapPrivateKey,
  encryptMessage,
  decryptMessage,
  encodePublicKey,
  encodeKeyBytes,
  decodeKeyBytes,
} from './e2ee.js';

const E2EEContext = createContext(null);

export function E2EEProvider({ children }) {
  const [keyPair, setKeyPair] = useState(null);

  const tryAutoUnlock = useCallback(async (userId) => {
    const cached = await window.electronAPI.getCachedMessagingKey(userId);
    if (!cached) return false;
    setKeyPair({ publicKey: cached.publicKey, secretKey: decodeKeyBytes(cached.secretKeyBase64) });
    return true;
  }, []);

  const cacheKeyLocally = useCallback((userId, publicKey, secretKey) => {
    window.electronAPI.cacheMessagingKey({ userId, publicKey, secretKeyBase64: encodeKeyBytes(secretKey) });
  }, []);

  const unlockForUser = useCallback(async (userId, password, { allowRegenerate = true } = {}) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('public_key, wrapped_private_key, key_salt, key_iv')
      .eq('id', userId)
      .single();
    if (error) throw new Error(`profile-fetch-failed: ${error.message}`);

    if (profile?.wrapped_private_key && profile.key_salt && profile.key_iv) {
      try {
        const secretKey = await unwrapPrivateKey(
          profile.wrapped_private_key,
          profile.key_salt,
          profile.key_iv,
          password,
        );
        setKeyPair({ publicKey: profile.public_key, secretKey });
        cacheKeyLocally(userId, profile.public_key, secretKey);
        return;
      } catch {
        if (!allowRegenerate) throw new Error('wrong-password');
      }
    }

    const fresh = generateKeyPair();
    const { wrappedPrivateKey, keySalt, keyIv } = await wrapPrivateKey(fresh.secretKey, password);
    const publicKeyB64 = encodePublicKey(fresh.publicKey);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ public_key: publicKeyB64, wrapped_private_key: wrappedPrivateKey, key_salt: keySalt, key_iv: keyIv })
      .eq('id', userId);
    if (updateError) throw new Error(`key-save-failed: ${updateError.message}`);
    setKeyPair({ publicKey: publicKeyB64, secretKey: fresh.secretKey });
    cacheKeyLocally(userId, publicKeyB64, fresh.secretKey);
  }, [cacheKeyLocally]);

  const lock = useCallback(() => setKeyPair(null), []);

  const encryptFor = useCallback(
    (recipientPublicKeyB64, plaintext) => {
      if (!keyPair || !recipientPublicKeyB64) return null;
      return encryptMessage(plaintext, recipientPublicKeyB64, keyPair.secretKey);
    },
    [keyPair],
  );

  const decryptFrom = useCallback(
    (otherPartyPublicKeyB64, ciphertextB64, nonceB64) => {
      if (!keyPair || !otherPartyPublicKeyB64 || !ciphertextB64 || !nonceB64) return null;
      return decryptMessage(ciphertextB64, nonceB64, otherPartyPublicKeyB64, keyPair.secretKey);
    },
    [keyPair],
  );

  return (
    <E2EEContext.Provider value={{ ready: !!keyPair, unlockForUser, tryAutoUnlock, lock, encryptFor, decryptFrom }}>
      {children}
    </E2EEContext.Provider>
  );
}

export function useE2EE() {
  const ctx = useContext(E2EEContext);
  if (!ctx) throw new Error('useE2EE doit être utilisé sous E2EEProvider');
  return ctx;
}
