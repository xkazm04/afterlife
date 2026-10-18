// A stand-in for `claude -p --output-format stream-json`: reads the prompt from stdin, prints canned
// stream-json. Behaviour is chosen by the step marker the runner appends to every prompt:
//   plan    -> JSON lines from FAKE_PLAN (an array of {lane,title}); costs $0.25
//   lane    -> by lane id prefix: ok-* edits <lane>.txt and says DONE ($0.50); red-* also drops red.flag
//              (the test gate fails on it); exp-* is DONE at $9; park-* PARKs; hang-* never answers
//   reflect -> a one-line "nothing to change"
import fs from 'node:fs';

const prompt = fs.readFileSync(0, 'utf8');
const step = /belay:step=(\w+)/.exec(prompt)?.[1] ?? 'unknown';
const lane = /belay:step=lane lane=([\w-]+)/.exec(prompt)?.[1] ?? '';

function finish(text, cost) {
  const usage = { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 5, cache_creation_input_tokens: 7 };
  const out = [
    { type: 'system', subtype: 'init', model: 'fake-model-1' },
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
    finish(`did it\nDONE: edited ${lane}.txt`, lane.startsWith('exp-') ? 9 : 0.5);
  }
} else {
  finish('Nothing worth changing.', 0.05);
}
