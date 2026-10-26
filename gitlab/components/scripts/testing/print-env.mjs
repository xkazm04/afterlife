// Test child for gitlab/apply/lib.mjs glue(): prints, as JSON, the token variables it was given (and GITLAB_TOKEN), so a
// test says which token a child sees.
// Both names of each token (AFTERLIFE_<key>, and the pre-rename BELAY_<key> a project's CI/CD settings may still hold).
const KEYS = ['BOT_TOKEN', 'POLICY_TOKEN', 'LEDGER_TOKEN', 'DISPATCH_TOKEN'];
const NAMES = ['GITLAB_TOKEN', ...KEYS.flatMap((k) => [`AFTERLIFE_${k}`, `BELAY_${k}`])];
console.log(JSON.stringify(Object.fromEntries(NAMES.filter((n) => process.env[n] !== undefined).map((n) => [n, process.env[n]]))));
