// A stand-in for `claude -p --output-format stream-json`: reads the prompt from stdin, prints canned
// stream-json. Behaviour is chosen by the step marker the runner appends to every prompt:
//   plan    -> JSON lines from FAKE_PLAN (an array of {lane,title}); costs $0.25
//   lane    -> by lane id prefix: ok-* edits <lane>.txt and says DONE ($0.50); red-* also drops red.flag;
//              wire-* also appends its id to wiring.txt
//              (the test gate fails on it); cfg-* also writes .claude/settings.json; exp-* is DONE at $9;
//              park-* PARKs; hang-* never answers
//   reflect -> a one-line "nothing to change"
// FAKE_CALLS names a file each call appends its argv and --settings content to (permission tests).
import fs from 'node:fs';

const prompt = fs.readFileSync(0, 'utf8');
const step = /belay:step=(\w+)/.exec(prompt)?.[1] ?? 'unknown';
const lane = /belay:step=lane lane=([\w-]+)/.exec(prompt)?.[1] ?? '';

// FAKE_CALLS=<file>: append {step, lane, argv, settings} per call, the settings file read while it exists.
if (process.env.FAKE_CALLS) {
  const argv = process.argv.slice(2);
  const at = argv.indexOf('--settings');
  const settings = at >= 0 ? JSON.parse(fs.readFileSync(argv[at + 1], 'utf8')) : null;
  fs.appendFileSync(process.env.FAKE_CALLS, `${JSON.stringify({ step, lane, argv, settings })}
`);
}

function finish(text, cost) {
  const usage = { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 5, cache_creation_input_tokens: 7 };
  const out = [
    { type: 'system', subtype: 'init', model: 'fake-model-1', session_id: `fake-${step}-${lane}` },
    { type: 'assistant', message: { model: 'fake-model-1', content: [{ type: 'text', text }] } },
    { type: 'result', subtype: 'success', is_error: false, result: text, total_cost_usd: cost, usage, modelUsage: { 'fake-model-1': {} } },
  ];
  process.stdout.write(out.map((o) => JSON.stringify(o)).join('\n') + '\n');
}

if (step === 'plan') {
  const items = JSON.parse(process.env.FAKE_PLAN ?? '[]');
  finish(items.map((i) => JSON.stringify({ files: [], why: 'fake:1', challenge: 'challenge ran: nothing surfaced', ...i })).join('\n'), 0.25);
} else if (step === 'lane') {
  if (lane.startsWith('hang-')) setTimeout(() => {}, 60_000);
  else if (lane.startsWith('park-')) finish('PARK: needs a gate-surface edit: vitest.config.ts', 0.1);
  else {
    fs.writeFileSync(`${lane}.txt`, `${lane}\n`);
    if (lane.startsWith('red-')) fs.writeFileSync('red.flag', 'x');
    // wire-* also appends to one shared file, as a module split also edits lib.rs: two of them conflict from one base.
    if (lane.startsWith('wire-')) fs.appendFileSync('wiring.txt', `${lane}\n`);
    if (lane.startsWith('cfg-')) {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/settings.json', '{"hooks":{}}\n');
    }
    finish(`did it\nDONE: edited ${lane}.txt`, lane.startsWith('exp-') ? 9 : 0.5);
  }
} else {
  finish('Nothing worth changing.', 0.05);
}
