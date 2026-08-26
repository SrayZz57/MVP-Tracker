// Block-out générique inspiré de la disposition du site C de Haven — PAS une
// reproduction : formes géométriques simples uniquement (pavés, cubes,
// plan), matériaux neutres, aucune texture ni couleur propre au jeu.
//
// Une reproduction 3D fan-made de ce site existe sur Sketchfab
// ("Site C Haven Valorant Low Poly") — volontairement PAS utilisée comme
// source : sa licence est à usage non-commercial explicite (incompatible
// avec une app monétisée), et surtout, recréer même fidèlement sa
// disposition ne changerait rien au fait que la disposition réelle de la
// map reste la propriété de Riot Games — la licence d'un fan-art ne peut pas
// lever ça. Seuls des callouts communautaires publics (texte, pas d'assets)
// ont servi de référence pour les proportions : C Long, C Cubby, Garage,
// C Window, C Short, C Site, C Platform, C Logs.
//
// Repère : 1 unité = 1 mètre. Origine au centre du site. +Z = vers le fond du
// site (loin des spawns), -Z = vers C Long / spawn attaquant, +X/-X = les
// deux flancs (Garage et C Short arrivent tous deux du côté Mid, -X).
//
// Donnée pure ({ type, position, size, rotationY }), aucun Three.js ici —
// voir mapGeometryBuilder.js. Réutilisable telle quelle pour un futur mode
// d'entraînement 3D et un futur outil de setup tactique.

const WALL_HEIGHT = 4;
const WALL_THICKNESS = 0.4;

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

export const HAVEN_SITE_C = {
  id: 'haven-site-c',
  label: 'Haven — Site C (générique)',
  floorY: 0,
  wallHeight: WALL_HEIGHT,
  // Spawn suggéré : fond de C Long, face au site.
  spawn: { x: 4, y: 1.7, z: -21, yawDeg: 0 },

  floors: [
    // C Long, décalé côté +X (Garage/Short arrivent tous deux du côté -X).
    { id: 'floor-long', position: { x: 4, z: -13 }, size: { w: 5, d: 18 } },
    // C Cubby, alcôve à mi-parcours de Long.
    { id: 'floor-cubby', position: { x: 7.3, z: -12 }, size: { w: 2.2, d: 2.6 } },
    // Garage, stub côté Mid.
    { id: 'floor-garage', position: { x: -9.5, z: 1 }, size: { w: 4.5, d: 5.5 } },
    // C Short, second accès côté Mid, plus au nord.
    { id: 'floor-short', position: { x: -9, z: 7.5 }, size: { w: 3, d: 3 } },
    // Site.
    { id: 'floor-site', position: { x: 0, z: 3 }, size: { w: 15, d: 14 } },
  ],

  blocks: [
    // --- C Long : long couloir depuis le spawn attaquant ------------------
    { id: 'long-wall-left', type: 'wall', position: { x: 1.5, y: WALL_HEIGHT / 2, z: -13 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 18 } },
    // Mur droit de Long, en deux segments : l'écart entre les deux est
    // l'embouchure de C Cubby (renfoncement, pas un couloir séparé).
    { id: 'long-wall-right-south', type: 'wall', position: { x: 6.5, y: WALL_HEIGHT / 2, z: -17.65 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 8.7 } },
    { id: 'long-wall-right-north', type: 'wall', position: { x: 6.5, y: WALL_HEIGHT / 2, z: -7.35 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 6.7 } },

    // C Cubby : petite poche dans laquelle se plaquer, à mi-parcours de Long
    // ("petite poche" du vrai callout, pas un couloir séparé).
    { id: 'cubby-wall-south', type: 'wall', position: { x: 7.3, y: WALL_HEIGHT / 2, z: -13.3 }, size: { w: 2.2, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'cubby-wall-north', type: 'wall', position: { x: 7.3, y: WALL_HEIGHT / 2, z: -10.7 }, size: { w: 2.2, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'cubby-wall-east', type: 'wall', position: { x: 8.4, y: WALL_HEIGHT / 2, z: -12 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 2.6 } },

    // --- Site : périmètre, avec ouvertures vers Long / Garage / Short ----
    { id: 'site-wall-back', type: 'wall', position: { x: 0, y: WALL_HEIGHT / 2, z: 10 }, size: { w: 15, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'site-wall-east', type: 'wall', position: { x: 7.5, y: WALL_HEIGHT / 2, z: 3 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 14 } },
    // Mur sud, avec l'ouverture vers C Long (alignée sur la largeur réelle
    // du couloir, x=1.5 à 6.5).
    { id: 'site-wall-south-west', type: 'wall', position: { x: -3, y: WALL_HEIGHT / 2, z: -4 }, size: { w: 9, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    { id: 'site-wall-south-east', type: 'wall', position: { x: 7, y: WALL_HEIGHT / 2, z: -4 }, size: { w: 1, h: WALL_HEIGHT, d: WALL_THICKNESS } },
    // Mur ouest, avec les deux ouvertures vers Garage et C Short.
    { id: 'site-wall-west-south', type: 'wall', position: { x: -7.5, y: WALL_HEIGHT / 2, z: -1.5 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 5 } },
    { id: 'site-wall-west-mid', type: 'wall', position: { x: -7.5, y: WALL_HEIGHT / 2, z: 5 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 2 } },
    { id: 'site-wall-west-north', type: 'wall', position: { x: -7.5, y: WALL_HEIGHT / 2, z: 9.5 }, size: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 1 } },

    // Porte d'entrée côté Long (montants + linteau), même traitement que sur
    // le block-out précédent pour bien lire le seuil.
    { id: 'gate-long-post-left', type: 'pillar', position: { x: 1.5, y: 1.6, z: -3.8 }, size: { w: 0.5, h: 3.2, d: 0.5 } },
    { id: 'gate-long-post-right', type: 'pillar', position: { x: 6.5, y: 1.6, z: -3.8 }, size: { w: 0.5, h: 3.2, d: 0.5 } },
    { id: 'gate-long-lintel', type: 'pillar', position: { x: 4, y: 3.3, z: -3.8 }, size: { w: 5.5, h: 0.5, d: 0.6 } },

    // "Garage Door" : cadre de porte à la jonction Garage → Site (ouverture
    // du mur ouest entre z=1 et z=4).
    { id: 'garage-door-post-south', type: 'pillar', position: { x: -7.5, y: 1.6, z: 1 }, size: { w: 0.5, h: 3.2, d: 0.5 } },
    { id: 'garage-door-post-north', type: 'pillar', position: { x: -7.5, y: 1.6, z: 4 }, size: { w: 0.5, h: 3.2, d: 0.5 } },
    { id: 'garage-door-lintel', type: 'pillar', position: { x: -7.5, y: 3.3, z: 2.5 }, size: { w: 0.6, h: 0.5, d: 3.6 } },

    // Entrée C Short : second accès côté Mid, plus au nord que Garage.
    { id: 'short-door-post-south', type: 'pillar', position: { x: -7.5, y: 1.6, z: 6 }, size: { w: 0.5, h: 3.2, d: 0.5 } },
    { id: 'short-door-post-north', type: 'pillar', position: { x: -7.5, y: 1.6, z: 9 }, size: { w: 0.5, h: 3.2, d: 0.5 } },
    { id: 'short-door-lintel', type: 'pillar', position: { x: -7.5, y: 3.3, z: 7.5 }, size: { w: 0.6, h: 0.5, d: 3.6 } },

    // --- C Platform : plateforme surélevée au fond du site, sur toute sa
    // largeur, accessible par un escalier depuis le centre du site ---------
    { id: 'platform-slab', type: 'platform', position: { x: 0, y: 1.4, z: 8 }, size: { w: 14.6, h: 0.3, d: 3.4 } },
    { id: 'platform-rail', type: 'crate', position: { x: 0, y: 1.9, z: 6.4 }, size: { w: 14.6, h: 0.9, d: 0.15 } },
    ...stairBlocks({
      id: 'platform-stairs',
      base: { x: 3.5, z: 3 },
      stepCount: 6,
      stepWidth: 2.2,
      stepDepth: 0.4,
      stepHeight: 0.24,
      direction: 1,
    }),

    // "C Logs" : caisses de couverture dans le coin, à côté de la
    // plateforme, côté Garage (comme sur le vrai callout).
    { id: 'logs-1', type: 'crate', position: { x: -5.7, y: 0.55, z: 6.2 }, size: { w: 1.3, h: 1.1, d: 1.3 } },
    { id: 'logs-2', type: 'crate', position: { x: -5.7, y: 1.35, z: 6.2 }, size: { w: 1.1, h: 0.5, d: 1.1 } },
    { id: 'logs-3', type: 'crate', position: { x: -4.3, y: 0.5, z: 6.4 }, size: { w: 1, h: 1, d: 1 } },

    // Caisse de couverture isolée au centre du site (cover générique, comme
    // sur le vrai C Site — une caisse au milieu casse la ligne de vue depuis
    // Short/Garage).
    { id: 'mid-crate', type: 'crate', position: { x: -1.5, y: 0.55, z: 1.5 }, size: { w: 1.2, h: 1.1, d: 1.2 } },
  ],
};
