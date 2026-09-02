const enabled = import.meta.env.DEV;

export function debug(...args) {
  if (enabled) console.log(...args);
}

export function debugLazy(build) {
  if (enabled) console.log(...[].concat(build()));
}
