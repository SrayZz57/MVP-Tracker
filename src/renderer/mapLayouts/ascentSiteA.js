// Block-out générique inspiré de la disposition d'Ascent, site A — PAS une
// reproduction : formes géométriques simples uniquement (pavés, cubes, plan),
// aucune texture ni couleur propre au jeu. Seules les proportions générales
// (largeur des couloirs, position relative des caisses/plateformes) suivent
// la vraie disposition, jamais son apparence. Repères utilisés pour
// construire cette disposition : callouts communautaires publics (A Main,
// Tree, Heaven/Hell, Generator, Double box, Wine, Link/A Switch) — pas une
// capture ni un asset du jeu.
//
// Repère : 1 unité = 1 mètre. Origine au centre du site. +Z = vers le fond du
// site (loin du spawn attaquant), -Z = vers A Main / spawn, +X = côté Heaven,
// -X = côté Mid/Link.
//
// Chaque bloc est une donnée pure ({ type, position, size, rotationY,
// material }), sans rien de Three.js — voir mapGeometryBuilder.js pour la
// construction des meshes. Ça permet de réutiliser exactement cette même
// disposition pour un futur mode d'entraînement 3D et un futur outil de
// setup tactique, sans dupliquer les coordonnées.

const WALL_HEIGHT = 4;
const WALL_THICKNESS = 0.4;

export const ASCENT_SITE_A = {
  id: 'ascent-site-a',
  label: 'Ascent — Site A (générique)',
  // Hauteur du sol du site ; A Main est au même niveau (pas de dénivelé).
  floorY: 0,
  wallHeight: WALL_HEIGHT,
  // Point de spawn suggéré pour l'exploration (fond de A Main, en regardant
  // vers le site).
  spawn: { x: 0, y: 1.7, z: -18, yawDeg: 0 },

  floors: [
    // Sol de A Main (couloir d'entrée).
    { id: 'floor-main', position: { x: 0, z: -13 }, size: { w: 5, d: 14 } },
    // Sol du site.
    { id: 'floor-site', position: { x: 0, z: 1 }, size: { w: 16, d: 14 } },
  ],

  blocks: [
    // --- A Main : couloir d'accès, murs de part et d'autre --------------
    { id: 'main-wall-left', type: 'wall', position: { x: -2.7, y: WALL_HEIGHT / 2, z: -13 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 14 } },
    { id: 'main-wall-right', type: 'wall', position: { x: 2.7, y: WALL_HEIGHT / 2, z: -13 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 14 } },

    // "Tree" : pilier de couverture à la jonction Main → Site, casse la
    // ligne de vue directe depuis le fond de Main.
    { id: 'tree', type: 'pillar', position: { x: 1.4, y: 1.5, z: -6.5 }, size: { w: 1, h: 3, d: 1 } },

    // "Wine" : caisse de couverture proche de l'entrée du site.
    { id: 'wine', type: 'crate', position: { x: -3, y: 0.55, z: -5 }, size: { w: 1.1, h: 1.1, d: 1.1 } },

    // --- Site : périmètre, avec ouvertures vers Main et vers Link -------
    { id: 'site-wall-back', type: 'wall', position: { x: 0, y: WALL_HEIGHT / 2, z: 8 }, size: { w: 16, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'site-wall-front-left', type: 'wall', position: { x: -6.5, y: WALL_HEIGHT / 2, z: -6 }, size: { w: 3, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'site-wall-front-right', type: 'wall', position: { x: 5.5, y: WALL_HEIGHT / 2, z: -6 }, size: { w: 5, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'site-wall-left-south', type: 'wall', position: { x: -8, y: WALL_HEIGHT / 2, z: -3.5 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 5 } },
    { id: 'site-wall-left-north', type: 'wall', position: { x: -8, y: WALL_HEIGHT / 2, z: 5.5 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 5 } },
    { id: 'site-wall-right', type: 'wall', position: { x: 8, y: WALL_HEIGHT / 2, z: 1 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 14 } },

    // --- Heaven : plateforme surélevée côté +X, avec rampe d'accès -------
    { id: 'heaven-pillar', type: 'pillar', position: { x: 7, y: 1.1, z: -1 }, size: { w: 0.6, h: 2.2, d: 0.6 } },
    { id: 'heaven-platform', type: 'platform', position: { x: 7, y: 2.2, z: -1 }, size: { w: 3.4, h: 0.3, d: 5.8 } },
    { id: 'heaven-rail', type: 'crate', position: { x: 5.5, y: 2.85, z: -1 }, size: { w: 0.2, h: 1, d: 5.8 } },
    // Rampe : plan incliné (rotation autour de X) reliant le sol du site à
    // la plateforme, placée au sud de Heaven.
    { id: 'heaven-ramp', type: 'ramp', position: { x: 7, y: 1.1, z: -5.2 }, size: { w: 3, h: 0.3, d: 4.6 }, rotationX: -0.42 },

    // --- Generator / Dice / Tetris : caisses empilées, fond du site ------
    { id: 'gen-1', type: 'crate', position: { x: -1.6, y: 0.5, z: 6.2 }, size: { w: 1, h: 1, d: 1 } },
    { id: 'gen-2', type: 'crate', position: { x: -0.4, y: 0.5, z: 6.4 }, size: { w: 1, h: 1, d: 1 } },
    { id: 'gen-3', type: 'crate', position: { x: -1.6, y: 1.35, z: 6.2 }, size: { w: 0.9, h: 0.7, d: 0.9 } },
    { id: 'gen-4', type: 'crate', position: { x: 0.7, y: 0.45, z: 6.6 }, size: { w: 0.9, h: 0.9, d: 0.9 } },

    // --- Double box : couverture à deux niveaux, côté Link ---------------
    { id: 'double-box-1', type: 'crate', position: { x: -6, y: 0.55, z: 3.5 }, size: { w: 1.3, h: 1.1, d: 1.3 } },
    { id: 'double-box-2', type: 'crate', position: { x: -6, y: 1.35, z: 3.5 }, size: { w: 1.1, h: 0.5, d: 1.1 } },
  ],
};
