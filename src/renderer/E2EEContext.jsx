import { createContext, useCallback, useContext, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { generateKeyPair, wrapPrivateKey, unwrapPrivateKey, encryptMessage, decryptMessage, encodePublicKey } from './e2ee.js';

const E2EEContext = createContext(null);

// Tient la clé privée de messagerie EN MÉMOIRE pour la durée de la session
// (jamais sur disque, jamais renvoyée au serveur) — voir e2ee.js pour le
// détail du chiffrement. Le mot de passe du compte ne sert qu'un instant,
// juste après authentification, pour déchiffrer (ou créer) cette clé.
export function E2EEProvider({ children }) {
  const [keyPair, setKeyPair] = useState(null); // { publicKey: string base64, secretKey: Uint8Array } | null

  // `allowRegenerate` distingue deux contextes :
  // - true (juste après connexion/inscription/reset) : Supabase vient de
  //   vérifier ce mot de passe lui-même, donc un échec de déchiffrement ne
  //   peut venir que d'une clé devenue orpheline (mot de passe changé depuis
  //   son dernier enveloppement) — sûr de régénérer une nouvelle clé.
  // - false (déverrouillage manuel après redémarrage, session déjà active) :
  //   ce mot de passe n'a été vérifié nulle part ailleurs — un échec peut
  //   très bien être une simple faute de frappe. Régénérer silencieusement
  //   écraserait la vraie clé et rendrait l'historique illisible pour rien,
  //   donc on remonte juste une erreur à afficher ("mot de passe incorrect").
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
        return;
      } catch {
        if (!allowRegenerate) throw new Error('wrong-password');
        // Sinon : clé orpheline (mot de passe changé), on en crée une neuve
        // ci-dessous — les messages chiffrés avec l'ancienne deviennent
        // illisibles, contrepartie inévitable de ne jamais stocker le mot
        // de passe ni la clé en clair côté serveur.
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
  }, []);

  // À la déconnexion — la clé ne doit pas traîner en mémoire pour la session
  // (ou le prochain compte) suivante.
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
    <E2EEContext.Provider value={{ ready: !!keyPair, unlockForUser, lock, encryptFor, decryptFrom }}>
      {children}
    </E2EEContext.Provider>
  );
}

export function useE2EE() {
  const ctx = useContext(E2EEContext);
  if (!ctx) throw new Error('useE2EE doit être utilisé sous E2EEProvider');
  return ctx;
}
