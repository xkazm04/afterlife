// `claude -p --output-format stream-json --verbose` prints one JSON object per line. This reads the
// whole stdout and returns the final result text, the usage block, the cost and the model - pure, so a
// table test pins it. A stream with no `result` event (a killed run) has text from the last assistant
// message and NO usage: absent is absent, never zero.

export interface StreamUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface StreamResult {
  text: string;
  isError: boolean;
  /** The CLI's total_cost_usd; null when it never reported one. */
  costUsd: number | null;
  model: string | null;
  usage: StreamUsage | null;
  /** claude's session id: its transcript is ~/.claude/projects/<cwd as a dir name>/<sessionId>.jsonl. */
  sessionId: string | null;
}

type Json = Record<string, unknown>;
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function assistantText(msg: unknown): string {
  if (!isObj(msg) || !Array.isArray(msg.content)) return '';
  return msg.content
    .filter((b): b is Json => isObj(b) && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('\n');
}

export function parseStream(stdout: string): StreamResult {
  const out: StreamResult = { text: '', isError: false, costUsd: null, model: null, usage: null, sessionId: null };
  let lastAssistant = '';
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.startsWith('{')) continue;
    let o: unknown;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isObj(o)) continue;
    if (o.type === 'system' && typeof o.model === 'string') out.model = o.model;
    if (!out.sessionId && typeof o.session_id === 'string') out.sessionId = o.session_id;
    if (o.type === 'assistant') {
      const t = assistantText(o.message);
      if (t) lastAssistant = t;
      if (!out.model && isObj(o.message) && typeof o.message.model === 'string') out.model = o.message.model;
    }
    if (o.type === 'result') {
      out.text = typeof o.result === 'string' ? o.result : '';
      out.isError = o.is_error === true || (typeof o.subtype === 'string' && o.subtype.startsWith('error'));
      if (typeof o.total_cost_usd === 'number' && Number.isFinite(o.total_cost_usd)) out.costUsd = o.total_cost_usd;
      if (isObj(o.usage)) {
        out.usage = {
          inputTokens: num(o.usage.input_tokens),
          outputTokens: num(o.usage.output_tokens),
          cacheReadTokens: num(o.usage.cache_read_input_tokens),
          cacheWriteTokens: num(o.usage.cache_creation_input_tokens),
        };
      }
      if (isObj(o.modelUsage)) {
        const first = Object.keys(o.modelUsage)[0];
        if (first) out.model = first;
      }
    }
  }
  if (!out.text) out.text = lastAssistant;
  return out;
}
