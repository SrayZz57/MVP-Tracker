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

// Codes publiés par des joueurs pro, récupérés sur thespike.gg/valorant/crosshairs/codes
// (vérifiés : structure de code valide, pas de valeurs aberrantes).
export const PRO_CROSSHAIRS = [
  { name: 'TenZ', code: '0;s;1;P;c;5;h;0;m;1;0l;4;0o;2;0a;1;0f;0;1b;0;S;c;4;o;1' },
  { name: 'ScreaM', code: '0;P;o;1;d;1;0b;0;1b;0' },
  { name: 'Derke', code: '0;s;1;P;u;FFA500FF;o;1;d;1;f;0;s;0;0b;0;1t;0;1l;1;1o;0;1a;1;1m;0;1f;0;S;o;1' },
  { name: 'Chronicle', code: '0;P;c;7;o;1;f;0;0t;1;0l;2;0v;2;0g;1;0o;2;0a;1;0f;0;1b;0' },
  { name: 'Boaster', code: '0;s;1;P;c;5;o;1;d;1;f;0;s;0;0l;0;0a;1;0f;0;1t;0;1l;0;1o;0;1a;0;1f;0;S;c;1;o;1' },
  { name: 'Asuna', code: '0;P;o;1;0t;1;0l;2;0a;1;0f;0;1b;0' },
  { name: 'ANGE1', code: '0;P;h;0;d;1;f;0;0l;3;0o;1;0a;1;0f;0;1b;0' },
  { name: 'Jinggg', code: '0;s;1;P;c;1;o;1;0t;1;0l;2;0o;2;0a;1;0f;0;1b;0;S;c;5' },
  { name: 'aspas', code: '0;P;c;5;o;1;d;1;z;3;f;0;0b;0;1b;0' },
  { name: 'yay', code: '0;P;h;0;f;0;0l;4;0o;0;0a;1;0f;0;1b;0' },
  { name: 'Zekken', code: '0;s;1;P;c;8;u;D099E2FF;o;1;d;1;b;1;0l;0;0o;0;0a;0;0f;0;1b;0;S;c;0;s;0.5;o;1' },
  { name: 'Wardell', code: '0;s;1;P;h;0;0t;1;0l;4;0o;1;0a;1;0f;0;1b;0;S;o;1' },
  { name: 'Shroud', code: '0;P;c;1;o;1;f;0;0t;1;0l;2;0o;2;0a;1;0f;0;1b;0' },
  { name: 's0m', code: '0;P;h;0;0l;4;0v;5;0o;0;0a;1;0f;0;1b;0' },
  { name: 'Sinatraa', code: '0;s;1;P;c;5;o;1;0t;1;0l;3;0a;1;0f;0;1b;0;S;c;5;s;1.178' },
  { name: 'Zellsis', code: '0;P;c;4;h;0;m;1;0a;1.000;0l;4;0o;2;0f;0;1b;0;1m;0;1f;0' },
];
