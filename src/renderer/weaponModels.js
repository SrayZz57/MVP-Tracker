import fpsRifleHandsUrl from '../assets/models/fps-rifle-hands.glb';

// Les deux pistolets sont chargés via import.meta.glob plutôt qu'un import
// statique : leurs fichiers .glb doivent encore être ajoutés manuellement à
// src/assets/models/ (téléchargement Sketchfab nécessitant un compte, voir
// CREDITS.md), et le glob ne casse pas le build tant qu'ils sont absents —
// contrairement à un `import xxx from '...'` sur un fichier inexistant.
const pistolModels = import.meta.glob('../assets/models/pistol-*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
});

function findPistol(filename) {
  const match = Object.entries(pistolModels).find(([path]) => path.endsWith(filename));
  return match?.[1] ?? null;
}

// Retourne l'URL du modèle pour une arme donnée, ou null si le fichier n'a
// pas encore été fourni (permet à l'appelant de retomber sur une autre arme
// plutôt que de planter).
export function getWeaponModelUrl(weaponId) {
  if (weaponId === 'rifle') return fpsRifleHandsUrl;
  if (weaponId === 'pistol9mm') return findPistol('pistol-9mm.glb');
  if (weaponId === 'pistolGeneric') return findPistol('pistol-generic.glb');
  if (weaponId === 'lawgiver') return findPistol('pistol-lawgiver.glb');
  return null;
}
