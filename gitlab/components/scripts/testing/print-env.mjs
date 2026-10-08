// Test child for gitlab/apply/lib.mjs glue(): prints, as JSON, the token variables it was given (and GITLAB_TOKEN), so a
// test says which token a child sees.
const NAMES = ['GITLAB_TOKEN', 'BELAY_BOT_TOKEN', 'BELAY_POLICY_TOKEN', 'BELAY_LEDGER_TOKEN', 'BELAY_DISPATCH_TOKEN'];
console.log(JSON.stringify(Object.fromEntries(NAMES.filter((n) => process.env[n] !== undefined).map((n) => [n, process.env[n]]))));
