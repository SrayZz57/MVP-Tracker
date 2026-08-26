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
  // Les trois armes ci-dessous partageaient un même réglage jamais vérifié
  // visuellement (juste une estimation de départ) : trop grosses et trop
  // proches du bord droit, elles débordaient du cadre. Reculées (z plus
  // négatif) et recentrées (x réduit) ; `viewSize` (la taille normalisée du
  // viewmodel, voir AimTrainerGame.jsx) est aussi plus petit que celui du
  // fusil (0.75) pour éviter qu'elles remplissent tout l'écran.
  pistol9mm: {
    labelKey: 'aimTrainer.weapons.pistol9mm',
    icon: '🔫',
    // Modèle arme seule (pas de mains ni d'animation propre) : le viewmodel
    // flotte, sans mains visibles — acceptable pour un modèle secondaire,
    // à améliorer si un modèle avec mains équivalent est trouvé plus tard.
    hasHands: false,
    animationClip: null,
    viewSize: 0.55,
    holderOffset: { x: 0.16, y: -0.2, z: -0.6 },
    holderRotation: { x: 0, y: -0.1, z: 0 },
    // Confirmé par capture d'écran : ce modèle est déjà orienté canon vers
    // -Z (comme le fusil), aucune correction nécessaire.
    yawFix: 0,
  },
  pistolGeneric: {
    labelKey: 'aimTrainer.weapons.pistolGeneric',
    icon: '🔫',
    hasHands: false,
    animationClip: null,
    viewSize: 0.55,
    holderOffset: { x: 0.16, y: -0.2, z: -0.6 },
    holderRotation: { x: 0, y: -0.1, z: 0 },
    yawFix: 0,
  },
  lawgiver: {
    labelKey: 'aimTrainer.weapons.lawgiver',
    icon: '🔫',
    hasHands: false,
    animationClip: null,
    viewSize: 0.55,
    holderOffset: { x: 0.16, y: -0.2, z: -0.6 },
    holderRotation: { x: 0, y: -0.1, z: 0 },
    // Confirmé par capture d'écran : le canon pointait sur le côté, hors
    // cadre. Vérifié dans les données du modèle (accessors POSITION, en
    // recomposant toute la hiérarchie de nœuds du .glb — plusieurs matrices
    // de conversion FBX→glTF imbriquées) : son axe le plus long est X
    // (canon), pas Z comme les autres armes. Une rotation de 90° autour de
    // Y ramène cet axe vers l'avant caméra (-Z) — vérifié par le calcul
    // matriciel exact, pas juste déduit à l'œil.
    yawFix: Math.PI / 2,
  },
};

export const DEFAULT_WEAPON = 'rifle';
