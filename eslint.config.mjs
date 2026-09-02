import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

// Le point de cette configuration est la règle `no-console`.
//
// Une trace de débogage oubliée ne casse rien, elle s'accumule : elle part
// dans le bundle, s'affiche dans la console d'un joueur, et noie les messages
// qui comptent vraiment. Le linter refuse donc `console.log` et renvoie vers
// `debug()` de src/logger.js, qui disparaît du build de production.
//
// `warn` et `error` restent autorisés : ils signalent de vrais problèmes,
// qu'un joueur peut avoir besoin de nous remonter depuis sa console.
export default [
  {
    // `out/` contient l'application empaquetée, plusieurs centaines de Mo :
    // sans cette exclusion, le linter part l'analyser et ne revient pas.
    ignores: ['.vite/**', 'out/**', 'node_modules/**', '__skeleton_lab__/**'],
  },

  js.configs.recommended,

  {
    files: ['src/**/*.{js,jsx,mjs}', '*.mjs', 'forge.config.js'],
    // Le code porte déjà des `eslint-disable-next-line react-hooks/…` :
    // le plugin doit exister pour que ces exceptions veuillent dire quelque
    // chose, et pour que la règle serve là où elle n'est pas désactivée.
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Constantes injectées au build par @electron-forge/plugin-vite :
        // elles n'existent nulle part dans le code source.
        MAIN_WINDOW_VITE_DEV_SERVER_URL: 'readonly',
        MAIN_WINDOW_VITE_NAME: 'readonly',
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // Les variables inutilisées sont du bruit, sauf celles délibérément
      // ignorées dans une déstructuration ou un catch, préfixées d'un _.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  {
    // Le logger EST l'exception : c'est lui qui encapsule console.log.
    files: ['src/logger.js'],
    rules: { 'no-console': 'off' },
  },
];
