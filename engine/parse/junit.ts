// JUnit XML reader with no dependencies. It is a small, forgiving XML tree builder (comments, CDATA,
// entities, self-closing tags, unbalanced closers) plus an extractor for <testcase> results.
export type CaseStatus = 'passed' | 'failed' | 'error' | 'skipped';

export interface TestCase {
  classname: string;
  name: string;
  status: CaseStatus;
  message: string; // the failure or error message attribute
  output: string; // failure text plus system-out and system-err
}

interface XNode {
  name: string;
  attrs: Record<string, string>;
  children: XNode[];
  text: string;
}

const TOKEN = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)|</g;
const ATTR = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, (_, e: string) => {
    if (e === 'lt') return '<';
    if (e === 'gt') return '>';
    if (e === 'amp') return '&';
    if (e === 'quot') return '"';
    if (e === 'apos') return "'";
    const code = e.startsWith('#x') ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
}

function parseTree(xml: string): XNode {
  const root: XNode = { name: '#root', attrs: {}, children: [], text: '' };
  const stack: XNode[] = [root];
  for (const m of xml.matchAll(TOKEN)) {
    const top = stack.at(-1) ?? root;
    if (m[1] !== undefined) top.text += m[1];
    else if (m[3] !== undefined) {
      if (m[2] === '/') {
        const at = stack.map((n) => n.name).lastIndexOf(m[3]);
        if (at > 0) stack.length = at; // tolerate unbalanced closers
        continue;
      }
      const attrs: Record<string, string> = {};
      for (const a of (m[4] ?? '').matchAll(ATTR)) attrs[a[1] ?? ''] = decodeEntities(a[2] ?? a[3] ?? '');
      const node: XNode = { name: m[3], attrs, children: [], text: '' };
      top.children.push(node);
      if (m[5] !== '/') stack.push(node);
    } else if (m[6] !== undefined) top.text += decodeEntities(m[6]);
  }
  return root;
}

function descendants(n: XNode, name: string, out: XNode[] = []): XNode[] {
  for (const c of n.children) {
    if (c.name === name) out.push(c);
    descendants(c, name, out);
  }
  return out;
}

export function parseJUnit(xml: string): TestCase[] {
  return descendants(parseTree(xml), 'testcase').map((tc) => {
    const failure = tc.children.find((c) => c.name === 'failure');
    const error = tc.children.find((c) => c.name === 'error');
    const skipped = tc.children.find((c) => c.name === 'skipped');
    const bad = failure ?? error;
    const extra = tc.children.filter((c) => c.name === 'system-out' || c.name === 'system-err').map((c) => c.text);
    return {
      classname: tc.attrs.classname ?? '',
      name: tc.attrs.name ?? '',
      status: failure ? 'failed' : error ? 'error' : skipped || tc.attrs.status === 'skipped' ? 'skipped' : 'passed',
      message: bad?.attrs.message ?? '',
      output: [bad?.text ?? '', ...extra].join('\n').trim(),
    };
  });
}
