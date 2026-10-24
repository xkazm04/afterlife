// A stand-in for `claude -p --output-format stream-json`: reads the prompt from stdin, prints canned
// stream-json. Behaviour is chosen by the step marker the runner appends to every prompt:
//   plan    -> JSON lines from FAKE_PLAN (an array of {lane,title}); costs $0.25
//   lane    -> by lane id prefix: ok-* edits <lane>.txt and says DONE ($0.50); red-* also drops red.flag
//              (the test gate fails on it); wire-* also appends its id to wiring.txt; cfg-* also writes
//              .claude/settings.json; exp-* is DONE at $9; park-* PARKs; hang-* never answers;
//              def-* drops red.flag too (its review cites it, its repair removes it); tst-* also deletes the
//              assertion line of existing.test.mjs; frontier writes size.txt = 50
//   review  -> def-*, pk-* and rt-* lanes get one finding (red.flag); every other lane an empty list (OK); $0.05
//   repair  -> removes red.flag if present, writes <lane>.repair.txt, says DONE ($0.10); a pk-* lane PARKs; an
//              rt-* lane also deletes the assertion line of existing.test.mjs
//   reflect -> a one-line "nothing to change"
// FAKE_CALLS names a file each call appends its argv and --settings content to (permission tests).
import fs from 'node:fs';

const prompt = fs.readFileSync(0, 'utf8');
const step = /belay:step=(\w+)/.exec(prompt)?.[1] ?? 'unknown';
const lane = /belay:step=\w+ lane=([\w-]+)/.exec(prompt)?.[1] ?? '';

// FAKE_CALLS=<file>: append {step, lane, argv, settings, prompt} per call, the settings file read while it exists.
if (process.env.FAKE_CALLS) {
  const argv = process.argv.slice(2);
  const at = argv.indexOf('--settings');
  const settings = at >= 0 ? JSON.parse(fs.readFileSync(argv[at + 1], 'utf8')) : null;
  fs.appendFileSync(process.env.FAKE_CALLS, `${JSON.stringify({ step, lane, argv, settings, prompt })}
`);
}

function finish(text, cost) {
  const usage = { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 5, cache_creation_input_tokens: 7 };
  // A resumed session keeps its id, as the real CLI does (`--resume <id>`).
  const at = process.argv.indexOf('--resume');
  const session = at >= 0 ? process.argv[at + 1] : `fake-${step}-${lane}`;
  const out = [
    { type: 'system', subtype: 'init', model: 'fake-model-1', session_id: session },
    { type: 'assistant', message: { model: 'fake-model-1', content: [{ type: 'text', text }] } },
    { type: 'result', subtype: 'success', is_error: false, result: text, total_cost_usd: cost, usage, modelUsage: { 'fake-model-1': {} } },
  ];
  process.stdout.write(out.map((o) => JSON.stringify(o)).join('\n') + '\n');
}

const review = (findings) => `Read the change.\n\`\`\`json\n${JSON.stringify({ v: 1, findings })}\n\`\`\``;

if (step === 'plan') {
  const items = JSON.parse(process.env.FAKE_PLAN ?? '[]');
  finish(items.map((i) => JSON.stringify({ files: [], why: 'fake:1', challenge: 'challenge ran: nothing surfaced', ...i })).join('\n'), 0.25);
} else if (step === 'lane') {
  if (lane.startsWith('hang-')) setTimeout(() => {}, 60_000);
  else if (lane.startsWith('park-')) finish('PARK: needs a gate-surface edit: vitest.config.ts', 0.1);
  else if (lane === 'frontier') {
    fs.writeFileSync('size.txt', '50\n');
    finish('Halved the size by dropping the duplicate table.\nDONE: size.txt halved (mechanism: dedupe)', 0.5);
  } else {
    fs.writeFileSync(`${lane}.txt`, `${lane}\n`);
    if (lane.startsWith('red-') || lane.startsWith('def-')) fs.writeFileSync('red.flag', 'x');
    // wire-* also appends to one shared file, as a module split also edits lib.rs: two of them conflict from one base.
    if (lane.startsWith('wire-')) fs.appendFileSync('wiring.txt', `${lane}\n`);
    if (lane.startsWith('tst-')) fs.writeFileSync('existing.test.mjs', fs.readFileSync('existing.test.mjs', 'utf8').replace(/^assert\..*\r?\n/m, ''));
    if (lane.startsWith('cfg-')) {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/settings.json', '{"hooks":{}}\n');
    }
    finish(`did it\nDONE: edited ${lane}.txt`, lane.startsWith('exp-') ? 9 : 0.5);
  }
} else if (step === 'review') {
  const cites = lane.startsWith('def-') || lane.startsWith('pk-') || lane.startsWith('rt-');
  finish(review(cites ? [{ file: 'red.flag', line: 1, check: 'test', problem: 'gate.mjs fails while red.flag exists', evidence: 'gate.mjs:1' }] : []), 0.05);
} else if (step === 'repair') {
  if (lane.startsWith('pk-')) finish('PARK: the finding needs a gate edit', 0.1);
  else {
    if (fs.existsSync('red.flag')) fs.unlinkSync('red.flag');
    if (lane.startsWith('rt-')) fs.writeFileSync('existing.test.mjs', fs.readFileSync('existing.test.mjs', 'utf8').replace(/^assert\..*\r?\n/m, ''));
    fs.writeFileSync(`${lane}.repair.txt`, 'repaired\n');
    finish('fixed the finding\nDONE: removed red.flag after the review', 0.1);
  }
} else {
  finish('Nothing worth changing.', 0.05);
}
