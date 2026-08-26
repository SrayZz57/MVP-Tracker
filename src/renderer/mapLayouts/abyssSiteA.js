// Block-out générique inspiré du site A d'Abyss — PAS une reproduction :
// formes géométriques simples uniquement (pavés, cubes, plan), matériaux
// neutres, aucune texture ni couleur propre au jeu.
//
// Contrairement aux dispositions précédentes (construites à partir de
// callouts textuels), celle-ci est mesurée directement sur la minimap
// officielle du jeu (valorant-api.com/v1/maps → displayIcon, un asset public
// déjà utilisé ailleurs dans l'app pour la Heatmap, sans clé requise) :
// analyse pixel par pixel pour repérer le contour de la zone teintée du site,
// le renfoncement du mur arrière-droit, et la position de chaque caisse.
// Seules les PROPORTIONS ET POSITIONS RELATIVES en sont tirées — les
// dimensions réelles des caisses viennent de tailles génériques plausibles
// (les icônes de la minimap ne sont pas à l'échelle exacte), et aucune
// texture ni couleur du jeu n'est utilisée : silhouettes uniquement.
//
// Repère : 1 unité = 1 mètre. Origine au seuil de la porte sud (entrée
// depuis le couloir d'accès). +Z = vers le fond du site, -Z = vers le
// couloir/spawn. +X = côté est (renfoncement du mur, poche latérale),
// -X = côté ouest (salle annexe).
//
// Donnée pure ({ type, position, size, rotationY }), aucun Three.js ici —
// voir mapGeometryBuilder.js. Réutilisable telle quelle pour un futur mode
// d'entraînement 3D et un futur outil de setup tactique.

const WALL_HEIGHT = 4;
const WALL_THICKNESS = 0.4;

export const ABYSS_SITE_A = {
  id: 'abyss-site-a',
  label: 'Abyss — Site A (générique)',
  floorY: 0,
  wallHeight: WALL_HEIGHT,
  // Spawn suggéré : fond du couloir sud, face au site.
  spawn: { x: 0, y: 1.7, z: -16, yawDeg: 0 },

  floors: [
    // Site : forme en L (rectangle avec le coin arrière-droit entaillé).
    { id: 'floor-site-main', position: { x: -0.9, z: 5.3 }, size: { w: 7.2, d: 10.6 } },
    { id: 'floor-site-notch-strip', position: { x: 4.3, z: 3.6 }, size: { w: 2, d: 7.2 } },
    // Couloir d'accès sud.
    { id: 'floor-corridor', position: { x: 0, z: -8 }, size: { w: 4, d: 16 } },
    // Salle annexe côté ouest, sur le couloir.
    { id: 'floor-west-room', position: { x: -6, z: -6 }, size: { w: 5, d: 6 } },
    // Poche latérale est (renfoncement au fond du site).
    { id: 'floor-east-pocket', position: { x: 7, z: 4 }, size: { w: 4, d: 6 } },
  ],

  blocks: [
    // --- Périmètre du site (forme en L) -----------------------------------
    { id: 'site-wall-back', type: 'wall', position: { x: -0.9, y: WALL_HEIGHT / 2, z: 10.6 }, size: { w: 7.2, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'site-wall-west', type: 'wall', position: { x: -4.5, y: WALL_HEIGHT / 2, z: 5.3 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 10.6 } },
    // Mur sud, avec l'ouverture vers le couloir.
    { id: 'site-wall-south-west', type: 'wall', position: { x: -3.25, y: WALL_HEIGHT / 2, z: 0 }, size: { w: 2.5, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'site-wall-south-east', type: 'wall', position: { x: 1.6, y: WALL_HEIGHT / 2, z: 0 }, size: { w: 2.8, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    // Mur est, coupé par l'entaille du coin arrière-droit.
    { id: 'site-wall-east', type: 'wall', position: { x: 2.7, y: WALL_HEIGHT / 2, z: 0.9 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 1.8 } },
    // Entaille (coin arrière-droit) : mur fermant le renfoncement.
    { id: 'notch-wall-south', type: 'wall', position: { x: 4.3, y: WALL_HEIGHT / 2, z: 1.8 }, size: { w: 3.2, h: WALL_HEIGHT, d: WALL_THICKNESS } },

    // Porte d'entrée (montants + linteau) au seuil couloir → site.
    { id: 'gate-post-left', type: 'pillar', position: { x: -0.75, y: 1.6, z: 0.2 }, size: { w: 0.5, h: 3.2, d: 0.5 } },
    { id: 'gate-post-right', type: 'pillar', position: { x: 1.6, y: 1.6, z: 0.2 }, size: { w: 0.5, h: 3.2, d: 0.5 } },
    { id: 'gate-lintel', type: 'pillar', position: { x: 0.4, y: 3.3, z: 0.2 }, size: { w: 3, h: 0.5, d: 0.6 } },

    // --- Amas de caisses au centre du site : trois blocs en escalier,
    // mesurés sur la minimap officielle (silhouette, tailles génériques
    // plausibles — pas les dimensions exactes des icônes). ------------------
    { id: 'boost-crate-tall', type: 'crate', position: { x: -1, y: 0.65, z: 5.2 }, size: { w: 1.3, h: 1.3, d: 1.3 } },
    { id: 'boost-crate-mid', type: 'crate', position: { x: 0.4, y: 0.5, z: 4.5 }, size: { w: 1.1, h: 1, d: 1.1 } },
    { id: 'boost-crate-small', type: 'crate', position: { x: 0.2, y: 0.35, z: 2.9 }, size: { w: 0.9, h: 0.7, d: 0.9 } },

    // Plateforme/seuil surélevé près de l'entaille, au niveau de la poche
    // est (léger step, pas une pièce entière).
    { id: 'east-threshold-step', type: 'platform', position: { x: 3, y: 0.2, z: 7.7 }, size: { w: 1.8, h: 0.4, d: 1.6 } },

    // --- Salle annexe ouest : cadre de porte + deux caisses empilées près
    // de son coin nord-est, comme sur la minimap ----------------------------
    { id: 'west-room-door-post-1', type: 'pillar', position: { x: -3.8, y: 1.5, z: -3.2 }, size: { w: 0.4, h: 3, d: 0.4 } },
    { id: 'west-room-door-post-2', type: 'pillar', position: { x: -3.8, y: 1.5, z: -6 }, size: { w: 0.4, h: 3, d: 0.4 } },
    { id: 'west-room-wall-north', type: 'wall', position: { x: -6, y: WALL_HEIGHT / 2, z: -3 }, size: { w: 5, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'west-room-wall-south', type: 'wall', position: { x: -6, y: WALL_HEIGHT / 2, z: -9 }, size: { w: 5, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'west-room-wall-far', type: 'wall', position: { x: -8.5, y: WALL_HEIGHT / 2, z: -6 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 6 } },
    { id: 'west-room-crate-1', type: 'crate', position: { x: -4.3, y: 0.5, z: -3.9 }, size: { w: 1, h: 1, d: 1 } },
    { id: 'west-room-crate-2', type: 'crate', position: { x: -4.3, y: 1.25, z: -4.5 }, size: { w: 0.7, h: 0.5, d: 0.7 } },

    // --- Couloir sud : légère pente vers le bas en s'éloignant du site
    // (ombrage en dégradé sur la minimap = changement de niveau) -----------
    { id: 'corridor-wall-west', type: 'wall', position: { x: -2, y: WALL_HEIGHT / 2, z: -8 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 16 } },
    { id: 'corridor-wall-east', type: 'wall', position: { x: 2, y: WALL_HEIGHT / 2, z: -8 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 16 } },
    { id: 'corridor-slope', type: 'ramp', position: { x: 0, y: -0.3, z: -3 }, size: { w: 3.6, h: 0.3, d: 6 }, rotationX: 0.1 },

    // --- Poche latérale est : renfoncement accessible depuis le fond du
    // site, avec une caisse près de son entrée -----------------------------
    { id: 'east-pocket-wall-north', type: 'wall', position: { x: 7, y: WALL_HEIGHT / 2, z: 6.8 }, size: { w: 4, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'east-pocket-wall-far', type: 'wall', position: { x: 8.8, y: WALL_HEIGHT / 2, z: 4 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 6 } },
    { id: 'east-pocket-crate', type: 'crate', position: { x: 6.2, y: 0.5, z: 2.2 }, size: { w: 1, h: 1, d: 1 } },
  ],
};
