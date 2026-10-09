const resetters = new Set();
let generation = 0;
export const cacheGeneration = () => generation;
export function registerCacheReset(reset) { resetters.add(reset); }
export function clearSessionCaches() {
  generation++;
  resetters.forEach(reset => reset());
}
