# Application desktop MVP Tracker

Electron 43 + React 19, JavaScript (pas de TypeScript), Vite via Electron Forge,
distribué en installeur Squirrel Windows publié sur les releases GitHub.

Les règles communes aux trois projets sont dans le `CLAUDE.md` du dossier
parent, celui-ci ne porte que ce qui est propre au client.

## La frontière entre les processus est la règle qui prime

Trois espaces, trois responsabilités, et rien ne traverse en dehors du chemin
prévu :

```
src/main.js       processus principal : fenêtres, IPC, accès disque et réseau
src/preload.js    le pont, seule surface exposée au renderer
src/renderer/     l'interface React, sans accès Node
src/services/     le travail hors interface, appelé depuis le main
```

`contextIsolation` est actif et les fuses Electron sont verrouillés :
`RunAsNode` désactivé, chargement depuis l'asar uniquement, intégrité de l'asar
validée, arguments d'inspection Node coupés. On ne desserre aucun de ces
réglages.

**Le renderer n'a pas de `require`, pas de `fs`, pas de `net`.** Il ne connaît
du monde extérieur que ce que `preload.js` lui donne. Un besoin nouveau côté
interface, c'est trois ajouts qui vont ensemble :

1. Un `ipcMain.handle` dans `main.js`.
2. Une méthode nommée dans `preload.js`.
3. L'appel côté renderer.

`preload.js` expose déjà une soixantaine de méthodes. On ne l'élargit pas avec
une méthode générique qui prendrait un canal en paramètre : chaque capacité a
son nom et sa signature, c'est ce qui borne la surface d'attaque.

## Les secrets et les données joueur

La clé API Henrik, les identifiants Supabase et le PUUID lié ne transitent pas
par le renderer autrement que sous forme de résultats. Le stockage passe par
`electron-store`, jamais par `localStorage`.

La messagerie est chiffrée de bout en bout (`tweetnacl`) : les clés privées ne
quittent pas la machine et ne sont jamais journalisées. Une trace de débogage
qui affiche une clé, un token ou un PUUID complet est un incident, pas un
oubli.

`src/services/` porte les accès externes : `henrikdev.js` pour l'API, `db.js`
pour Supabase, `valorantLocal.js` pour le client Valorant local, `network.js`
pour le monitoring, `apiCache.js` pour le cache. Un composant du renderer
n'appelle jamais une de ces URLs directement.

## L'overlay de sélection d'agent

C'est une fenêtre Electron posée à côté du jeu, qui lit l'état via le client
local. **Ce n'est pas une injection et ça ne doit jamais le devenir.** Rien qui
lise ou écrive dans la mémoire du jeu, rien qui s'accroche à son processus,
rien qui automatise une action en partie. C'est la ligne qui sépare l'outil
autorisé du logiciel banni, et elle conditionne la candidature à l'API Riot.

## Le renderer

`src/renderer/` est plat : une centaine de composants `.jsx` à la racine, plus
`charts/`, `tabs/`, `ui/` et `i18n/`. C'est dense, mais la convention est
qu'un composant vit dans un fichier à son nom. Un nouveau composant réutilisable
va dans `ui/`, un onglet dans `tabs/`, un graphique dans `charts/`.

Les états partagés passent par les contextes existants (`E2EEContext`,
`CollapsedBlocksContext`) plutôt que par du passage de props sur cinq niveaux.

`react-hooks/rules-of-hooks` est une erreur de lint et
`react-hooks/exhaustive-deps` un avertissement : on corrige la dépendance
manquante plutôt que de la faire taire.

## Les textes

`react-i18next`, avec `src/renderer/i18n/locales/fr.json` et `en.json`. Aucune
chaîne visible en dur dans un composant, et les deux fichiers se modifient
ensemble. Une clé qui n'existe que dans une langue affiche la clé brute à
l'écran.

## Les traces

`no-console` est une erreur de lint partout sauf dans `src/logger.js`, qui est
l'unique point de journalisation. `console.warn` et `console.error` restent
autorisés pour les erreurs réelles. On ne laisse pas de trace de débogage dans
un commit.

## Vérification

```bash
pnpm lint
pnpm start        # lance l'app en développement
pnpm make         # construit l'installeur Windows
```

Il n'y a pas de typecheck : le projet est en JavaScript. C'est d'autant plus
important de lancer l'application et de parcourir l'écran modifié, y compris
les cas d'erreur (pas de connexion, clé API invalide, compte non lié).

## Le ménage à faire

`__skeleton_lab__/`, `__auth_lab__/`, `tmp-shot.cjs`, `tmp-shot2.cjs`,
`tmp-shot3.cjs`, `tmp-strip.mjs` traînent à la racine et dans `src/`. Ce sont
des restes d'expérimentation, pas une convention : ne pas s'en inspirer, ne pas
en ajouter. Un essai temporaire va dans un dossier de travail hors du dépôt.
