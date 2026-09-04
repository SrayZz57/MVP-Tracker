# MVP Tracker — application desktop

Tracker Valorant qui croise performance, réseau et rythme de jeu. Electron 43 +
React 19, JavaScript (pas de TypeScript), Vite via Electron Forge, distribué en
installeur Squirrel Windows publié sur les releases GitHub.

Ce fichier est la source des règles du projet. `CLAUDE.md` y renvoie. Les règles
communes aux trois dépôts MVP Tracker vivent dans le `CLAUDE.md` du dossier
parent.

## Démarrer

```bash
corepack enable
pnpm install
pnpm start        # lance l'app en développement
pnpm lint
pnpm make         # construit l'installeur Windows dans out/
```

Il n'y a pas de typecheck : le projet est en JavaScript. Le seul filet
automatique est ESLint, donc lancer l'app et parcourir l'écran modifié fait
partie du travail, pas du confort.

Pour vérifier qu'un changement compile sans construire l'installeur :

```bash
npx vite build --config vite.renderer.config.mjs --outDir /tmp/check
```

## Où vit quoi

```
src/main.js          processus principal : fenêtres, IPC, disque, réseau
src/preload.js       le pont, seule surface exposée au renderer
src/renderer/        l'interface React, sans accès Node
  tabs/              un onglet = un fichier
  ui/                primitives partagées (Button…)
  charts/            graphiques
  i18n/locales/      fr.json et en.json
src/services/        travail hors interface, appelé depuis le main
  henrikdev.js       API Valorant
  db.js              Supabase
  valorantLocal.js   client Valorant local
  network.js         monitoring de ping
  apiCache.js        cache des réponses
src/styles/          la feuille de style, découpée par domaine
src/logger.js        unique point de journalisation
```

`src/renderer/` est plat : une centaine de composants à la racine. C'est dense,
mais la convention tient en une phrase — un composant vit dans un fichier à son
nom. Un composant réutilisable va dans `ui/`, un onglet dans `tabs/`, un
graphique dans `charts/`.

## La frontière entre les processus est la règle qui prime

`contextIsolation` est actif et les fuses Electron sont verrouillés :
`RunAsNode` désactivé, chargement depuis l'asar uniquement, intégrité de l'asar
validée, arguments d'inspection Node coupés. On ne desserre aucun de ces
réglages.

**Le renderer n'a pas de `require`, pas de `fs`, pas de `net`.** Il ne connaît du
monde extérieur que ce que `preload.js` lui donne. Un besoin nouveau côté
interface, c'est trois ajouts qui vont ensemble :

1. Un `ipcMain.handle` dans `main.js`.
2. Une méthode nommée dans `preload.js`.
3. L'appel côté renderer.

`preload.js` expose déjà une soixantaine de méthodes. On ne l'élargit pas avec
une méthode générique qui prendrait un canal en paramètre : chaque capacité a
son nom et sa signature, c'est ce qui borne la surface d'attaque.

## L'overlay n'est jamais une injection

L'overlay de sélection d'agent est une fenêtre Electron posée à côté du jeu, qui
lit l'état via le client Valorant local. **Ce n'est pas une injection et ça ne
doit jamais le devenir.** Rien qui lise ou écrive dans la mémoire du jeu, rien
qui s'accroche à son processus, rien qui automatise une action en partie.

C'est la ligne qui sépare l'outil autorisé du logiciel banni, et elle
conditionne la candidature à l'API Riot.

## Secrets et données joueur

La clé API Henrik, les identifiants Supabase et le PUUID lié ne transitent pas
par le renderer autrement que sous forme de résultats. Le stockage passe par
`electron-store`, jamais par `localStorage`.

La messagerie est chiffrée de bout en bout (`tweetnacl`) : les clés privées ne
quittent pas la machine et ne sont jamais journalisées. Une trace de débogage
qui affiche une clé, un token ou un PUUID complet est un incident, pas un oubli.

Un composant du renderer n'appelle jamais une URL externe directement : ça passe
par `src/services/`.

## La feuille de style

`src/index.css` ne contient que la déclaration `@layer base` et la liste des
imports. Le vrai contenu est dans `src/styles/`, en quatorze fichiers numérotés.

**L'ordre des imports est l'ordre de la cascade.** Les fichiers sont des tranches
contiguës de l'ancien fichier unique, pas des regroupements thématiques : deux
règles du même composant peuvent vivre dans deux fichiers. Chercher par `grep`
sur tout `src/styles/`, jamais en supposant le fichier.

Ajouter une règle : la poser dans le fichier dont le numéro correspond à
l'endroit où elle doit peser dans la cascade, pas dans celui dont le nom
ressemble le plus.

**Les tokens de `:root` avant toute valeur en dur** (`01-shell.css`) : couleurs,
tailles de texte `--fs-*`, rayons `--r-*`, courbes et durées `--ease-*` et
`--t-*`. Une valeur qui sert deux fois devient un token.

**Deux pièges de cascade connus.** Le fichier est plat et long, donc une règle
générale gagne facilement contre une règle plus spécifique en intention mais pas
en poids : vérifier ce qui l'emporte plutôt qu'ajouter un `!important`. Et
`label { display: flex; flex-direction: column }` est déclaré globalement : tout
`<label>` qu'on veut mettre en ligne doit redéclarer `flex-direction: row`.

**Une media query qui change la disposition change `display` aussi.** Poser des
propriétés flex sur un conteneur resté en `grid` ne fait rien du tout, et le bug
est invisible à la lecture.

## Les textes

`react-i18next`, avec `src/renderer/i18n/locales/fr.json` et `en.json`. Aucune
chaîne visible en dur dans un composant, et les deux fichiers se modifient
ensemble. Une clé qui n'existe que dans une langue affiche la clé brute à
l'écran.

Une URL externe qui sert deux fois vit dans `src/renderer/links.js`.

## Règles de code

**Pas de commentaires.** Ni en tête de fichier, ni en tête de fonction, ni en fin
de ligne, ni JSDoc. Si un bout de code a besoin d'être expliqué, c'est le code
qu'il faut reprendre. Les seules exceptions sont les directives que l'outillage
lit (`eslint-disable`, pragmas). Ce qui doit être expliqué se met dans le message
de commit ou ici.

**`no-console` est une erreur de lint**, `warn` et `error` exceptés.
`src/logger.js` est l'unique point de journalisation. On ne désactive pas la
règle pour déboguer, on retire les traces avant de finir.

**Les variables inutilisées sont un avertissement**, sauf préfixées par `_`.

**`react-hooks/rules-of-hooks` est une erreur**, `exhaustive-deps` un
avertissement : on corrige la dépendance manquante plutôt que de la faire taire.

**Nettoyer ce qu'on branche.** Tout `addEventListener`, `IntersectionObserver`,
`ResizeObserver`, `requestAnimationFrame` ou timer se défait dans le retour du
`useEffect` correspondant.

**Grouper les écritures DOM sur une frame.** Un handler de `mousemove`, de
`scroll` ou de `resize` calcule, puis passe l'écriture à un
`requestAnimationFrame`. Et il ne lit jamais une propriété qui force un calcul de
layout (`scrollHeight`, `getBoundingClientRect`) à chaque événement.

**Pas de fichiers de brouillon.** `tmp-*` est ignoré par git. Un essai temporaire
ne vit pas dans le dépôt.

## Accessibilité

Ce sont des seuils, pas des préférences.

- Élément natif d'abord : `<button>` pour une action, `<a href>` pour une
  navigation. Pas de `<div onClick>`, pas d'ARIA là où le HTML fait le travail.
- Tout contrôle à icône seule porte un nom accessible.
- Tout ce qui s'atteint à la souris s'atteint au clavier, avec un anneau de focus
  visible. `:focus-visible`, jamais `:focus` nu.
- L'état ne passe jamais par la couleur seule : une icône, un texte ou une
  bordure l'accompagne.
- Toute animation est encadrée par `prefers-reduced-motion`.
- Cible de 44×44px au toucher, 40×40px au pointeur.

## Ce qu'on ne fait pas sans demander

- Commiter ou pousser.
- Ajouter une dépendance.
- Changer une version majeure, ou toucher à `pnpm-lock.yaml` autrement que par un
  `pnpm install` normal.
- Desserrer un fuse Electron ou élargir la surface du preload.
- Introduire une nouvelle surface d'interface visible sans validation visuelle.
