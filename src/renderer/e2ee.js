import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
const { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } = naclUtil;

const PBKDF2_ITERATIONS = 210000;

async function deriveWrappingKey(password, saltBytes) {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function generateKeyPair() {
  return nacl.box.keyPair();
}

export function encodePublicKey(publicKeyBytes) {
  return encodeBase64(publicKeyBytes);
}

export function encodeKeyBytes(bytes) {
  return encodeBase64(bytes);
}

export function decodeKeyBytes(base64) {
  return decodeBase64(base64);
}

export async function wrapPrivateKey(secretKey, password) {
  const salt = nacl.randomBytes(16);
  const iv = nacl.randomBytes(12);
  const wrappingKey = await deriveWrappingKey(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, secretKey);
  return {
    wrappedPrivateKey: encodeBase64(new Uint8Array(encrypted)),
    keySalt: encodeBase64(salt),
    keyIv: encodeBase64(iv),
  };
}

export async function unwrapPrivateKey(wrappedPrivateKeyB64, keySaltB64, keyIvB64, password) {
  const salt = decodeBase64(keySaltB64);
  const iv = decodeBase64(keyIvB64);
  const wrappingKey = await deriveWrappingKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    decodeBase64(wrappedPrivateKeyB64),
  );
  return new Uint8Array(decrypted);
}

export function encryptMessage(plaintext, recipientPublicKeyB64, mySecretKey) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const recipientPublicKey = decodeBase64(recipientPublicKeyB64);
  const box = nacl.box(decodeUTF8(plaintext), nonce, recipientPublicKey, mySecretKey);
  return { ciphertext: encodeBase64(box), nonce: encodeBase64(nonce) };
}

export function decryptMessage(ciphertextB64, nonceB64, otherPartyPublicKeyB64, mySecretKey) {
  try {
    const box = decodeBase64(ciphertextB64);
    const nonce = decodeBase64(nonceB64);
    const otherPartyPublicKey = decodeBase64(otherPartyPublicKeyB64);
    const opened = nacl.box.open(box, nonce, otherPartyPublicKey, mySecretKey);
    return opened ? encodeUTF8(opened) : null;
  } catch {
    return null;
  }
}
