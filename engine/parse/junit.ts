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

// Tags, text and a lone "<" are matched by regex; comments, processing instructions, doctypes and CDATA are found with
// indexOf, because a lazy [\s\S]*? over an unclosed opener repeated across the file is quadratic.
const TOKEN = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)|</y;
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

interface Tok {
  cdata?: string;
  closing?: boolean;
  name?: string;
  attrs?: string;
  selfClosing?: boolean;
  text?: string;
}

/** Finds the closer of an opener at i. Once a closer is missing from some point on, no later opener of that kind can close either. */
function scanner(xml: string) {
  const dead = new Set<string>();
  const close = (i: number, open: string, end: string): number => {
    if (dead.has(open) || !xml.startsWith(open, i)) return -1;
    const e = xml.indexOf(end, i + open.length);
    if (e === -1) dead.add(open);
    return e;
  };
  /** The skipped markup (comment, PI, doctype) or CDATA at i, as [next index, cdata text]; null when i opens none that closes. */
  return (i: number): [number, string?] | null => {
    let e = close(i, '<!--', '-->');
    if (e !== -1) return [e + 3];
    e = close(i, '<![CDATA[', ']]>');
    if (e !== -1) return [e + 3, xml.slice(i + 9, e)];
    e = close(i, '<?', '?>');
    if (e !== -1) return [e + 2];
    e = close(i, '<!DOCTYPE', '>');
    return e === -1 ? null : [e + 1];
  };
}

function* tokens(xml: string): Generator<Tok> {
  const markup = scanner(xml);
  let i = 0;
  while (i < xml.length) {
    if (xml.charCodeAt(i) === 60 /* < */) {
      const skip = markup(i);
      if (skip) {
        if (skip[1] !== undefined) yield { cdata: skip[1] };
        i = skip[0];
        continue;
      }
    }
    TOKEN.lastIndex = i;
    const m = TOKEN.exec(xml);
    if (!m) break;
    i = TOKEN.lastIndex;
    if (m[2] !== undefined) yield { closing: m[1] === '/', name: m[2], attrs: m[3] ?? '', selfClosing: m[4] === '/' };
    else if (m[5] !== undefined) yield { text: m[5] };
  }
}

function parseTree(xml: string): XNode {
  const root: XNode = { name: '#root', attrs: {}, children: [], text: '' };
  const stack: XNode[] = [root];
  for (const t of tokens(xml)) {
    const top = stack.at(-1) ?? root;
    if (t.cdata !== undefined) top.text += t.cdata;
    else if (t.name !== undefined) {
      if (t.closing) {
        const at = stack.map((n) => n.name).lastIndexOf(t.name);
        if (at > 0) stack.length = at; // tolerate unbalanced closers
        continue;
      }
      const attrs: Record<string, string> = {};
      for (const a of (t.attrs ?? '').matchAll(ATTR)) attrs[a[1] ?? ''] = decodeEntities(a[2] ?? a[3] ?? '');
      const node: XNode = { name: t.name, attrs, children: [], text: '' };
      top.children.push(node);
      if (!t.selfClosing) stack.push(node);
    } else if (t.text !== undefined) top.text += decodeEntities(t.text);
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
