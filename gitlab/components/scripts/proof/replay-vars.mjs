// For the target's replay job: prints TEST_ID and TEST_PATH from the belay-claims block of the MR description, only after
// both pass a strict pattern. The agent's own `command` is never used, so its text cannot become a shell command.
// Usage: node replay-vars.mjs --mr 41 > .belay/replay.env   (safe to source)
import { api, blocks, die, need } from '../lib/lib.mjs';

const m = api(`projects/${process.env.CI_PROJECT_ID ?? die('CI_PROJECT_ID is not set')}/merge_requests/${need('mr')}`);
const block = blocks(m.description, 'belay-claims').at(-1);
const id = block?.test?.id;
const file = block?.test?.path;
if (typeof id !== 'string' || !/^[A-Za-z0-9_.$#]{1,200}$/.test(id)) die('claims.test.id is missing or not a plain test id');
if (typeof file !== 'string' || !/^[A-Za-z0-9_./-]{1,300}$/.test(file) || file.includes('..') || file.startsWith('/')) die('claims.test.path is missing or not a plain relative path');
console.log(`TEST_ID='${id}'`);
console.log(`TEST_PATH='${file}'`);
