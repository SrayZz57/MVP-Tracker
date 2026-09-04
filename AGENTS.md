# MVP Tracker — application desktop

Tracker Valorant qui croise performance, réseau et rythme de jeu. Electron 43 +
React 19, JavaScript, Vite via Electron Forge, installeur Squirrel Windows.

Source des règles du projet. `CLAUDE.md` y renvoie. Les règles communes aux trois
dépôts sont dans le `CLAUDE.md` du dossier parent.

## Démarrer

```bash
pnpm install
pnpm start     # dev
pnpm lint
pnpm make      # installeur dans out/
```

Pas de typecheck, le projet est en JavaScript : ESLint est le seul filet
automatique, donc lancer l'app et parcourir l'écran modifié fait partie du
travail.

Vérifier qu'un changement compile, en 4 secondes :

```bash
npx vite build --config vite.renderer.config.mjs --outDir .tmp-check
```

`pnpm package` et `pnpm make` **vident `out/`** : ne pas les lancer pour une
simple vérification.

## Où vit quoi

```
src/main.js       cycle de vie, fenêtres, tray, mises à jour
src/preload.js    le pont, seule surface exposée au renderer
src/ipc/          handlers IPC adossés au stockage
src/services/     henrikdev (API Valorant) · db (SQLite local) · valorantLocal
                  network (ping) · apiCache · matchSync · telemetry
src/styles/       la feuille de style, 14 fichiers
src/logger.js     unique point de journalisation
src/renderer/
  App · TitleBar · NetworkMonitor      la coquille
  ui/ hooks/ data/                     primitives, hooks, catalogues
  i18n/  config.js + fr/ + en/         11 fichiers par langue
  tabs/ charts/
  account/ aim/ collection/ overlay/ sessions/ social/ stats/
  strategy/ tournaments/ wiki/         une fonctionnalité par dossier
```

Un composant vit dans un fichier à son nom, dans le dossier de sa
fonctionnalité. S'il sert à plusieurs, il va dans `ui/`.

**Ajouter un écran** : le composant dans son dossier, un fichier dans `tabs/`
qui l'enveloppe, l'entrée dans `NAV_SECTIONS` en tête de `App.jsx`.

## La frontière entre les processus prime

`contextIsolation` actif, fuses Electron verrouillés : `RunAsNode` désactivé,
chargement depuis l'asar uniquement, intégrité de l'asar validée, inspection Node
coupée. On n'en desserre aucun.

Le renderer n'a ni `require`, ni `fs`, ni `net`. Il ne connaît du monde que ce
que `preload.js` lui donne. Une capacité nouvelle, c'est trois ajouts
indissociables : `ipcMain.handle` côté main, une méthode nommée dans
`preload.js`, l'appel côté renderer.

Un handler adossé au stockage va dans `src/ipc/` : chaque module y expose un
`register()` qui reçoit ses dépendances plutôt que de fermer sur l'état du
processus principal.

`preload.js` expose une soixantaine de méthodes. **Pas de méthode générique
prenant un canal en paramètre** : chaque capacité a son nom et sa signature,
c'est ce qui borne la surface d'attaque.

## L'overlay n'est jamais une injection

L'overlay de sélection d'agent est une fenêtre posée à côté du jeu, qui lit
l'état via le client Valorant local. Rien qui lise ou écrive dans la mémoire du
jeu, rien qui s'accroche à son processus, rien qui automatise une action en
partie.

C'est la ligne entre l'outil autorisé et le logiciel banni, et elle conditionne
la candidature à l'API Riot.

## Secrets et données joueur

**La clé Supabase de `supabaseConfig.js` n'est pas un secret.** C'est la clé
`anon`, publique par conception, présente dans le bundle de toute app Supabase.
La masquer n'apporte rien.

Ce qui protège les données, c'est **RLS**. Une quinzaine de tables sont
joignables avec cette clé — `profiles`, `friendships`, `messages`,
`personal_goals`, `skin_collection`, `tournament_*`… Chaque nouvelle table part
avec ses politiques, sinon elle est ouverte à tous.

**Une clé `service_role` ne va jamais dans ce dépôt**, ni dans le code, ni dans
un `.env` suivi, ni dans un message de commit. Elle contourne RLS.

La clé API Henrik et le PUUID lié ne transitent par le renderer que sous forme de
résultats ; le stockage passe par `electron-store`, jamais `localStorage`. La
messagerie est chiffrée de bout en bout (`tweetnacl`) : les clés privées ne
quittent pas la machine et ne sont jamais journalisées. Une trace qui affiche une
clé, un token ou un PUUID complet est un incident.

Un composant du renderer n'appelle jamais une URL externe directement : ça passe
par `src/services/`.

**Ce qui vient du renderer est de l'entrée non fiable, même isolé.**
`shell:open-external` n'accepte que `https:` et `http:` : sans ce filtre, une XSS
dans le renderer devient un lancement de programme via `file://` ou un
gestionnaire de protocole Windows. Toute nouvelle capacité du preload qui touche
au système valide son entrée côté main, jamais côté appelant.

Les permissions web sont refusées par défaut. `ALLOWED_PERMISSIONS` n'en ouvre
que trois : `pointerLock` pour l'Aim Trainer, `notifications` pour les messages,
`clipboard-sanitized-write` pour la copie de crosshairs. En ajouter une demande
de savoir quel écran en a besoin.

## La feuille de style

`src/index.css` ne porte que `@layer base` et la liste des imports. Le contenu
est dans `src/styles/`, en quatorze fichiers numérotés.

**L'ordre des imports est l'ordre de la cascade.** Ce sont des tranches contiguës
de l'ancien fichier unique, pas des regroupements thématiques : deux règles d'un
même composant peuvent vivre dans deux fichiers. Chercher par `grep` sur tout
`src/styles/`, jamais en supposant le fichier. Poser une règle dans le fichier
dont le numéro correspond au poids voulu dans la cascade, pas dans celui dont le
nom ressemble le plus.

Les tokens de `:root` (`01-shell.css`) avant toute valeur en dur : `--fs-*`,
`--r-*`, `--ease-*`, `--t-*`. Une valeur qui sert deux fois devient un token.

**Trois pièges vérifiés :**

- Le fichier est plat et long : une règle générale gagne facilement contre une
  règle plus spécifique en intention mais pas en poids. Vérifier ce qui l'emporte
  plutôt qu'ajouter un `!important`.
- `label { display: flex; flex-direction: column }` est global. Tout `<label>`
  qu'on veut en ligne doit redéclarer `flex-direction: row`.
- Une media query qui change la disposition doit changer `display` aussi. Des
  propriétés flex sur un conteneur resté en `grid` ne font rien, et ça ne se voit
  pas à la lecture.

## Les textes

`react-i18next`. `i18n/config.js` porte `LANGS`, `DEFAULT_LANG`, `isLang`,
`HTML_LANG` ; les dictionnaires sont découpés par domaine dans `i18n/fr/` et
`i18n/en/`, comme sur le site.

Aucune chaîne visible en dur dans un composant. Les deux langues se modifient
ensemble : une clé absente d'un côté affiche la clé brute à l'écran.

Une URL externe qui sert deux fois vit dans `renderer/data/links.js`.

## Règles de code

**Pas de commentaires.** Ni en tête de fichier, ni de fonction, ni en fin de
ligne, ni JSDoc. Si un bout de code a besoin d'être expliqué, c'est le code qu'il
faut reprendre. Seules exceptions : les directives que l'outillage lit. Ce qui
doit être expliqué va dans le message de commit ou ici.

**`no-console` est une erreur**, `warn` et `error` exceptés. `src/logger.js` est
l'unique point de journalisation.

**Variables inutilisées : avertissement**, sauf préfixées par `_`.

**`react-hooks/rules-of-hooks` est une erreur.** On corrige la dépendance
manquante plutôt que de la faire taire.

**Nettoyer ce qu'on branche** : tout `addEventListener`, observer, `rAF` ou timer
se défait dans le retour du `useEffect`.

**Grouper les écritures DOM sur une frame.** Un handler de `mousemove`, `scroll`
ou `resize` calcule, puis passe l'écriture à un `requestAnimationFrame`, et ne
lit jamais une propriété qui force un layout à chaque événement.

**Pas de brouillons** : `tmp-*` est ignoré par git.

## Accessibilité

Des seuils, pas des préférences. Élément natif d'abord (`<button>`, `<a href>`,
jamais `<div onClick>`). Nom accessible sur tout contrôle à icône seule. Tout ce
qui s'atteint à la souris s'atteint au clavier, avec `:focus-visible`. L'état ne
passe jamais par la couleur seule. Animation encadrée par
`prefers-reduced-motion`. Cible 44×44px au toucher, 40×40px au pointeur.

## Sans demander

Commiter ou pousser · ajouter une dépendance · changer une version majeure ou
toucher au lockfile hors `pnpm install` · desserrer un fuse ou élargir le preload
· lancer une commande qui écrit dans `out/` · introduire une surface d'interface
visible sans validation.
