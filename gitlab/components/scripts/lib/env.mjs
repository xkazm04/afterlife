// The glue's env under the product's name, the same rule as src/server/env/env.ts (a CI job cannot import TypeScript):
// AFTERLIFE_<KEY>, else the pre-rename BELAY_<KEY>, so a project whose CI/CD variables still say BELAY_* keeps working.

/** AFTERLIFE_<key>, else BELAY_<key>, else undefined; an empty value counts as unset. */
export const envOf = (env, key) => env[`AFTERLIFE_${key}`] || env[`BELAY_${key}`] || undefined;
