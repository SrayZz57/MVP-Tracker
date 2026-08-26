// Registre des armes disponibles dans l'Aim Trainer. Un seul modèle
// (fusil + mains, CC0) était câblé en dur jusqu'ici ; ce fichier centralise
// tout ce qui distingue une arme d'une autre pour que l'ajout d'un nouveau
// modèle se limite à une entrée ici, sans toucher au moteur du jeu.
//
// `url` est rempli séparément par armSetup.js une fois les fichiers .glb
// posés dans src/assets/models/ — voir CREDITS.md pour la provenance de
// chaque modèle et son attribution (obligatoire, licence CC-BY).

export const WEAPONS = {
  rifle: {
    labelKey: 'aimTrainer.weapons.rifle',
    icon: '🔫',
    // Modèle mains+arme combiné : anime déjà le recul via son clip "fire".
    hasHands: true,
    animationClip: 'fire',
    holderOffset: { x: 0.22, y: -0.2, z: -0.45 },
    holderRotation: { x: 0.03, y: -0.06, z: 0 },
  },
  pistol9mm: {
    labelKey: 'aimTrainer.weapons.pistol9mm',
    icon: '🔫',
    // Modèle arme seule (pas de mains ni d'animation propre) : le viewmodel
    // flotte, sans mains visibles — acceptable pour un modèle secondaire,
    // à améliorer si un modèle avec mains équivalent est trouvé plus tard.
    hasHands: false,
    animationClip: null,
    holderOffset: { x: 0.24, y: -0.22, z: -0.4 },
    holderRotation: { x: 0, y: -0.1, z: 0 },
    // Orientation d'origine inconnue (modèle externe) : à vérifier une fois
    // le fichier posé — mettre à `true` si le canon pointe vers l'arrière
    // une fois chargé (voir la méthode de vérification dans le commit du
    // fusil : inspection directe des accessors min/max du .glb).
    flip180: false,
  },
  pistolGeneric: {
    labelKey: 'aimTrainer.weapons.pistolGeneric',
    icon: '🔫',
    hasHands: false,
    animationClip: null,
    holderOffset: { x: 0.24, y: -0.22, z: -0.4 },
    holderRotation: { x: 0, y: -0.1, z: 0 },
    flip180: false,
  },
  lawgiver: {
    labelKey: 'aimTrainer.weapons.lawgiver',
    icon: '🔫',
    hasHands: false,
    animationClip: null,
    holderOffset: { x: 0.24, y: -0.22, z: -0.4 },
    holderRotation: { x: 0, y: -0.1, z: 0 },
    flip180: false,
  },
};

export const DEFAULT_WEAPON = 'rifle';
