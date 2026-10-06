// Editing tier-state.yml in place, the way the tripwire does: the document is parsed with comments kept, one record is
// replaced as a flow mapping, and the file is written back. Only the records named change.
import { parseDocument, Scalar, type YAMLMap } from 'yaml';

export interface RecordEdit {
  agent: string;
  class: string;
  record: Record<string, string>;
}

const DATE = /^\d{4}-\d{2}-\d{2}/;

export function editRecords(text: string, edits: readonly RecordEdit[]): string {
  const doc = parseDocument(text);
  if (doc.errors.length) throw new Error(`tier-state.yml is not valid YAML: ${doc.errors[0]?.message}`);
  for (const e of edits) {
    const node = doc.createNode(e.record) as YAMLMap;
    node.flow = true;
    for (const pair of node.items) {
      if (pair.value instanceof Scalar && typeof pair.value.value === 'string' && DATE.test(pair.value.value)) pair.value.type = 'QUOTE_DOUBLE';
    }
    doc.setIn(['agents', e.agent, e.class], node);
  }
  return doc.toString({ lineWidth: 0 });
}

/** "- old" / "+ new" for every line that differs, with the line above it for context when it is a key. */
export function lineDiff(before: string, after: string): string[] {
  const a = before.split('\n');
  const b = after.split('\n');
  if (a.length !== b.length) return [...a.map((l) => `- ${l}`), ...b.map((l) => `+ ${l}`)];
  return b.flatMap((line, i) => (line === a[i] ? [] : [`- ${a[i]}`, `+ ${line}`]));
}
