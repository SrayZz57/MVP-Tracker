// Traces de développement.
//
// `import.meta.env.DEV` est une constante remplacée par Vite au moment du
// build — et Vite construit aussi bien le process principal (vite.main.config)
// que le renderer. En production, `enabled` vaut donc `false` littéralement,
// le minifieur supprime le `console.log` ci-dessous, et plus rien ne s'affiche
// dans la console d'un joueur.
//
// Ce qui reste : certains messages laissent leur chaîne de caractères dans le
// bundle, quand le minifieur élimine l'appel sans pouvoir prouver que
// l'argument est sans effet de bord. Quelques centaines d'octets, aucun
// affichage. Pour un message dont la composition coûte réellement quelque
// chose, `debugLazy` évite jusqu'à ce calcul.
//
// À utiliser pour tout ce qui sert à comprendre ce que fait l'app pendant
// qu'on la développe. `console.warn` et `console.error` restent en revanche
// appelés directement : ils signalent des problèmes réels, qu'un joueur peut
// avoir besoin de nous remonter depuis sa console.
const enabled = import.meta.env.DEV;

export function debug(...args) {
  if (enabled) console.log(...args);
}

/**
 * Variante paresseuse : la fonction n'est appelée qu'en développement, donc le
 * message n'est même pas construit en production. Utile quand composer la
 * trace coûte quelque chose (parcours d'un tableau, mise en forme, calcul).
 */
export function debugLazy(build) {
  if (enabled) console.log(...[].concat(build()));
}
