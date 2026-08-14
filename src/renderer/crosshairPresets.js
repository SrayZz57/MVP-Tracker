import { ValCrosshair } from '@valapi/crosshair';

function buildCode(setters) {
  const crosshair = new ValCrosshair();
  setters.forEach(([index, value]) => crosshair.set(index, value));
  return crosshair.export();
}

// Les index correspondent à la position exacte des champs dans la structure
// interne de @valapi/crosshair (catégorie Primary) : couleur = 3, point central = 5,
// lignes intérieures = 9, lignes extérieures = 10.
const COLORS = [
  { id: '0', name: 'Blanc' },
  { id: '1', name: 'Vert' },
  { id: '2', name: 'Vert-jaune' },
  { id: '3', name: 'Jaune-vert' },
  { id: '4', name: 'Jaune' },
  { id: '5', name: 'Cyan' },
  { id: '6', name: 'Rose' },
  { id: '7', name: 'Rouge' },
];

const STYLES = [
  {
    id: 'croix',
    name: 'Croix',
    setters: (colorId) => [[[3, 0], colorId]],
  },
  {
    id: 'croix-point',
    name: 'Croix + point',
    setters: (colorId) => [
      [[3, 0], colorId],
      [[5], 1],
      [[5, 0], 2],
      [[5, 1], 1],
    ],
  },
  {
    id: 'point',
    name: 'Point seul',
    setters: (colorId) => [
      [[3, 0], colorId],
      [[9], 0],
      [[10], 0],
      [[5], 1],
      [[5, 0], 3],
      [[5, 1], 1],
    ],
  },
];

export const CROSSHAIR_CATALOG = COLORS.flatMap((color) =>
  STYLES.map((style) => ({
    name: `${color.name} — ${style.name}`,
    colorName: color.name,
    styleName: style.name,
    code: buildCode(style.setters(color.id)),
  })),
);

export const CROSSHAIR_COLOR_NAMES = COLORS.map((color) => color.name);
export const CROSSHAIR_STYLE_NAMES = STYLES.map((style) => style.name);
