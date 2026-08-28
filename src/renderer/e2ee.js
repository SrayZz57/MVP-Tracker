import nacl from 'tweetnacl';
// `tweetnacl-util` est un module CommonJS — l'import ESM nommé n'est pas
// fiable selon l'environnement (testé : échoue sous Node natif, fonctionne
// sous Vite). Le pattern "import par défaut puis déstructuration" marche
// partout, donc c'est celui-là qu'on garde.
import naclUtil from 'tweetnacl-util';
const { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } = naclUtil;

// Chiffrement de bout en bout des messages privés (nacl.box, Curve25519 +
// XSalsa20-Poly1305) : le serveur (et donc quiconque a accès à la table SQL,
// nous y compris) ne voit jamais que du texte chiffré. Seuls l'expéditeur et
// le destinataire, qui possèdent chacun leur clé privée, peuvent lire un
// message — la propriété d'échange de clé Diffie-Hellman de nacl.box fait
// que CHACUN des deux peut déchiffrer avec sa propre clé privée + la clé
// publique de l'autre, peu importe qui a chiffré (pas besoin de chiffrer le
// message deux fois pour que l'expéditeur revoie aussi ses propres envois).

// OWASP recommande au moins 210 000 itérations pour PBKDF2-SHA256 (2023) —
// ça prend quelques dizaines de ms via l'implémentation native du navigateur,
// négligeable pour une opération qui n'arrive qu'à la connexion.
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

// Génériques (marchent pour n'importe quelle clé brute, pas seulement la
// publique) — utilisés pour faire transiter la clé privée vers/depuis le
// cache local chiffré par le système (voir E2EEContext.jsx).
export function encodeKeyBytes(bytes) {
  return encodeBase64(bytes);
}

export function decodeKeyBytes(base64) {
  return decodeBase64(base64);
}

// "Enveloppe" la clé privée avec une clé dérivée du mot de passe du compte —
// c'est CE blob chiffré (pas le mot de passe, jamais lui) qui est stocké
// côté serveur, pour pouvoir retrouver la clé de messagerie depuis n'importe
// quel appareil après une simple connexion.
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

// Lève une erreur si le mot de passe ne correspond pas (AES-GCM est chiffrement
// authentifié : une mauvaise clé fait échouer le déchiffrement lui-même,
// pas de risque de "déverrouiller" silencieusement avec le mauvais mot de
// passe et produire une clé corrompue sans le savoir).
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

// Renvoie `null` si le déchiffrement échoue (mauvaise clé, message corrompu,
// ou message legacy en clair passé par erreur ici) plutôt que de planter —
// l'appelant décide comment l'afficher.
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
