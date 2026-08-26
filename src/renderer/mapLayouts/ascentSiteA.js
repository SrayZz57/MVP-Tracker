// Block-out générique inspiré de la disposition d'Ascent, site A — PAS une
// reproduction : formes géométriques simples uniquement (pavés, cubes,
// cylindre, plan), aucune texture ni couleur propre au jeu. Seules les
// proportions générales (largeur des couloirs, position relative des
// caisses/plateformes) suivent la vraie disposition, jamais son apparence.
// Repères utilisés pour ajuster cette disposition : callouts communautaires
// publics (A Main, Generator, Dice/Tetris, Rafters/Heaven, Tree, Wine,
// Double box, Link) + captures fournies par l'utilisateur pour corriger les
// positions relatives (le Generator et les caisses Dice sont juste à côté de
// la porte d'entrée, pas au fond du site ; Rafters est en hauteur juste
// au-dessus de cette même porte, accessible par un escalier, pas une rampe) —
// jamais un asset ni une texture du jeu.
//
// Repère : 1 unité = 1 mètre. Origine au centre du site. +Z = vers le fond du
// site (loin du spawn attaquant), -Z = vers A Main / spawn, +X = côté
// Heaven/Rafters, -X = côté Mid/Link.
//
// Chaque bloc est une donnée pure ({ type, position, size, rotationY,
// material }), sans rien de Three.js — voir mapGeometryBuilder.js pour la
// construction des meshes. Ça permet de réutiliser exactement cette même
// disposition pour un futur mode d'entraînement 3D et un futur outil de
// setup tactique, sans dupliquer les coordonnées.

const WALL_HEIGHT = 4;
const WALL_THICKNESS = 0.4;

// Escalier menant à Rafters : une suite de marches (pas une rampe lisse —
// les références montrent de vraies marches en bois). Génère les blocs à
// partir d'une spécification, en restant de la donnée pure (aucun THREE.js
// ici, juste des nombres).
function stairBlocks({ id, base, stepCount, stepWidth, stepDepth, stepHeight, direction }) {
  return Array.from({ length: stepCount }, (_, i) => ({
    id: `${id}-${i}`,
    type: 'platform',
    position: {
      x: base.x,
      y: stepHeight * (i + 0.5),
      z: base.z + direction * stepDepth * (i + 0.5),
    },
    size: { w: stepWidth, h: stepHeight * (i + 1), d: stepDepth },
  }));
}

export const ASCENT_SITE_A = {
  id: 'ascent-site-a',
  label: 'Ascent — Site A (générique)',
  floorY: 0,
  wallHeight: WALL_HEIGHT,
  // Spawn suggéré : fond de A Main, face à l'entrée du site.
  spawn: { x: 0, y: 1.7, z: -18, yawDeg: 0 },

  floors: [
    { id: 'floor-main', position: { x: 0, z: -13 }, size: { w: 5, d: 14 } },
    { id: 'floor-site', position: { x: 0, z: 1 }, size: { w: 16, d: 14 } },
  ],

  blocks: [
    // --- A Main : couloir d'accès ----------------------------------------
    { id: 'main-wall-left', type: 'wall', position: { x: -2.7, y: WALL_HEIGHT / 2, z: -13 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 14 } },
    { id: 'main-wall-right', type: 'wall', position: { x: 2.7, y: WALL_HEIGHT / 2, z: -13 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 14 } },

    // Porte d'entrée du site : deux montants + linteau, pour lire clairement
    // le seuil Main → Site (visible sur les captures de référence).
    { id: 'gate-post-left', type: 'pillar', position: { x: -2, y: 1.6, z: -6.2 }, size: { w: 0.5, h: 3.2, d: 0.5 } },
    { id: 'gate-post-right', type: 'pillar', position: { x: 2, y: 1.6, z: -6.2 }, size: { w: 0.5, h: 3.2, d: 0.5 } },
    { id: 'gate-lintel', type: 'pillar', position: { x: 0, y: 3.3, z: -6.2 }, size: { w: 4.5, h: 0.5, d: 0.6 } },

    // --- Site : périmètre, avec ouvertures vers Main et vers Link -------
    { id: 'site-wall-back', type: 'wall', position: { x: 0, y: WALL_HEIGHT / 2, z: 8 }, size: { w: 16, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'site-wall-front-left', type: 'wall', position: { x: -6.5, y: WALL_HEIGHT / 2, z: -6 }, size: { w: 3, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'site-wall-front-right', type: 'wall', position: { x: 5, y: WALL_HEIGHT / 2, z: -6 }, size: { w: 6, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'site-wall-left-south', type: 'wall', position: { x: -8, y: WALL_HEIGHT / 2, z: -3.5 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 5 } },
    { id: 'site-wall-left-north', type: 'wall', position: { x: -8, y: WALL_HEIGHT / 2, z: 5.5 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 5 } },
    { id: 'site-wall-right', type: 'wall', position: { x: 8, y: WALL_HEIGHT / 2, z: 1 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 14 } },

    // --- Generator + Dice/Tetris : juste après la porte, pas au fond ------
    // (corrigé d'après les captures : ces éléments sont collés à l'entrée du
    // site, à droite en entrant, au pied de l'escalier vers Rafters.)
    { id: 'generator', type: 'generator', position: { x: 0.8, y: 0.9, z: -4.3 }, size: { w: 1.3, h: 1.8, d: 1.3 } },
    { id: 'dice-1', type: 'crate', position: { x: -0.9, y: 0.5, z: -4.6 }, size: { w: 1, h: 1, d: 1 } },
    { id: 'dice-2', type: 'crate', position: { x: -0.9, y: 1.35, z: -4.6 }, size: { w: 0.85, h: 0.7, d: 0.85 } },
    { id: 'dice-3', type: 'crate', position: { x: -1.9, y: 0.5, z: -4.4 }, size: { w: 0.9, h: 1, d: 0.9 } },

    // --- Rafters / Heaven : plateforme en hauteur juste au-dessus de la
    // porte, accessible par un escalier (pas une rampe) --------------------
    { id: 'rafters-platform', type: 'platform', position: { x: 3.2, y: 2.9, z: -4.8 }, size: { w: 3.6, h: 0.3, d: 4.4 } },
    { id: 'rafters-rail', type: 'crate', position: { x: 1.55, y: 3.55, z: -4.8 }, size: { w: 0.15, h: 1, d: 4.4 } },
    { id: 'rafters-pillar', type: 'pillar', position: { x: 3.2, y: 1.35, z: -4.8 }, size: { w: 0.5, h: 2.7, d: 0.5 } },
    ...stairBlocks({
      id: 'rafters-stairs',
      base: { x: 5.4, z: -7 },
      stepCount: 8,
      stepWidth: 1.4,
      stepDepth: 0.42,
      stepHeight: 0.34,
      direction: 1,
    }),

    // --- Tree : pilier de couverture plus avant sur le site ---------------
    { id: 'tree', type: 'pillar', position: { x: -3.5, y: 1.5, z: -1 }, size: { w: 1, h: 3, d: 1 } },

    // --- Wine : caisse de couverture proche de l'entrée, côté gauche ------
    { id: 'wine', type: 'crate', position: { x: -3.8, y: 0.55, z: -5 }, size: { w: 1.1, h: 1.1, d: 1.1 } },

    // --- Double box : couverture à deux niveaux, fond du site -------------
    { id: 'double-box-1', type: 'crate', position: { x: -1.5, y: 0.55, z: 6 }, size: { w: 1.3, h: 1.1, d: 1.3 } },
    { id: 'double-box-2', type: 'crate', position: { x: -1.5, y: 1.35, z: 6 }, size: { w: 1.1, h: 0.5, d: 1.1 } },
  ],
};
