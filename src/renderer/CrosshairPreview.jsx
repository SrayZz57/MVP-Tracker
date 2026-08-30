import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const PALETTE_HEX = {
  0: 'FFFFFF',
  1: '00FF00',
  2: '7FFF00',
  3: 'DFFF00',
  4: 'FFFF00',
  5: '00FFFF',
  6: 'FF00FF',
  7: 'FF0000',
};

// @valapi/crosshair a un bug qui empêche l'import correct des champs de type
// "couleur" (String) — on décode donc nous-mêmes le code, en se basant sur le
// vrai format et les vraies valeurs par défaut lus dans son code source.
const PRIMARY_FIELDS = {
  b: { type: 'bool', default: 0 },
  c: { type: 'str', default: '0' },
  u: { type: 'str', default: 'FFFFFF' },
  h: { type: 'bool', default: 1 },
  t: { type: 'int', default: 1 },
  o: { type: 'float', default: 0.5 },
  d: { type: 'bool', default: 0 },
  z: { type: 'int', default: 2 },
  a: { type: 'float', default: 1 },
  '0b': { type: 'bool', default: 1 },
  '0t': { type: 'int', default: 2 },
  '0l': { type: 'int', default: 6 },
  '0v': { type: 'int', default: 6 },
  '0o': { type: 'int', default: 3 },
  '0a': { type: 'float', default: 0.8 },
  '1b': { type: 'bool', default: 1 },
  '1t': { type: 'int', default: 2 },
  '1l': { type: 'int', default: 2 },
  '1v': { type: 'int', default: 2 },
  '1o': { type: 'int', default: 10 },
  '1a': { type: 'float', default: 0.35 },
};

function parseValue(type, raw) {
  if (type === 'int') return Number.parseInt(raw, 10);
  if (type === 'float') return Number.parseFloat(raw);
  if (type === 'bool') return Number.parseInt(raw, 10);
  return raw;
}

export function parseCrosshair(code) {
  const tokens = code.split(';');
  if (tokens[0] !== '0') return null;

  const values = {};
  Object.entries(PRIMARY_FIELDS).forEach(([key, field]) => {
    values[key] = field.default;
  });

  // Suit exactement l'algorithme de ValCrosshair.import() : seuls "P"/"A"/"S"
  // changent de catégorie ; "0" n'est spécial que comme tout premier token
  // (déjà consommé ci-dessus), sinon "0" est une valeur comme une autre.
  let category = '0';
  let pendingKey = null;
  let expecting = 'value';
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === 'P' || token === 'A' || token === 'S') {
      category = token;
      expecting = 'value';
      continue;
    }
    if (expecting === 'value') {
      pendingKey = token;
      expecting = 'key';
    } else {
      if (category === 'P' && PRIMARY_FIELDS[pendingKey]) {
        values[pendingKey] = parseValue(PRIMARY_FIELDS[pendingKey].type, token);
      }
      expecting = 'value';
    }
  }

  const color = values.b ? `#${values.u}` : `#${PALETTE_HEX[values.c] ?? 'FFFFFF'}`;

  return {
    color,
    dot: { enabled: !!values.d, size: values.z, opacity: values.a },
    inner: {
      enabled: !!values['0b'],
      thickness: values['0t'],
      length: values['0l'],
      offset: values['0o'],
      opacity: values['0a'],
    },
    outer: {
      enabled: !!values['1b'],
      thickness: values['1t'],
      length: values['1l'],
      offset: values['1o'],
      opacity: values['1a'],
    },
  };
}

const SCALE = 2;
const CENTER = 50;

function lineSegments(spec, keyPrefix) {
  if (!spec.enabled) return [];
  const offset = spec.offset * SCALE;
  const length = spec.length * SCALE;
  const thickness = Math.max(spec.thickness * SCALE, 1);

  const positions = [
    [CENTER, CENTER - offset - length, CENTER, CENTER - offset],
    [CENTER, CENTER + offset, CENTER, CENTER + offset + length],
    [CENTER - offset - length, CENTER, CENTER - offset, CENTER],
    [CENTER + offset, CENTER, CENTER + offset + length, CENTER],
  ];

  return positions.map(([x1, y1, x2, y2], i) => (
    <line
      key={`${keyPrefix}-${i}`}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth={thickness}
      opacity={spec.opacity}
      strokeLinecap="square"
    />
  ));
}

// `bare` : sans fond ni grille, pour un usage en surimpression (overlay de
// visée dans l'Aim Trainer) plutôt qu'en vignette de bibliothèque.
function CrosshairPreview({ code, bare = false, size = 100, className }) {
  const { t } = useTranslation();
  const parsed = useMemo(() => parseCrosshair(code), [code]);
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');

  if (!parsed) {
    if (bare) return null;
    return <p style={{ color: 'red' }}>{t('crosshairs.invalidCode')}</p>;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className ?? 'crosshair-preview-svg'}
      stroke={parsed.color}
    >
      {!bare && (
        <>
          <defs>
            <radialGradient id={`chbg-${uid}`} cx="50%" cy="50%" r="72%">
              <stop offset="0%" stopColor="#2a2a33" />
              <stop offset="100%" stopColor="#16161b" />
            </radialGradient>
            <pattern id={`chgrid-${uid}`} width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#34343c" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill={`url(#chbg-${uid})`} stroke="none" />
          <rect width="100" height="100" fill={`url(#chgrid-${uid})`} opacity="0.5" stroke="none" />
        </>
      )}
      {lineSegments(parsed.outer, 'outer')}
      {lineSegments(parsed.inner, 'inner')}
      {parsed.dot.enabled && (
        <circle
          cx={CENTER}
          cy={CENTER}
          r={Math.max((parsed.dot.size * SCALE) / 2, 1)}
          fill={parsed.color}
          opacity={parsed.dot.opacity}
        />
      )}
    </svg>
  );
}

export default CrosshairPreview;
