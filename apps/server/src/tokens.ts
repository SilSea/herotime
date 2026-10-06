/** DI tokens shared across modules. Constructor params always use explicit @Inject (no emitted metadata under tsx/esbuild). */
export const CONFIG = Symbol("CONFIG");
export const TIMERS = Symbol("TIMERS");
export const PUBLISHER = Symbol("PUBLISHER");
