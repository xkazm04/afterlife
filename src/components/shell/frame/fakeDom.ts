// A small DOM, enough for react-dom/client to mount, update and unmount a tree in plain node (the test environment has
// no jsdom). Nodes are real objects, so a test can tell whether React kept a node or made a new one. Events are not
// dispatched (a test drives state through React, not through clicks), only recorded.

type Listener = () => void;

class FakeNode {
  childNodes: FakeNode[] = [];
  parentNode: FakeNode | null = null;
  ownerDocument: FakeDocument | null = null;
  constructor(
    readonly nodeType: number,
    readonly nodeName: string,
  ) {}
  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null;
  }
  get lastChild(): FakeNode | null {
    return this.childNodes.at(-1) ?? null;
  }
  get nextSibling(): FakeNode | null {
    const sibs = this.parentNode?.childNodes ?? [];
    return sibs[sibs.indexOf(this) + 1] ?? null;
  }
  appendChild(c: FakeNode) {
    c.parentNode?.removeChild(c);
    this.childNodes.push(c);
    c.parentNode = this;
    return c;
  }
  insertBefore(c: FakeNode, before: FakeNode | null) {
    if (!before) return this.appendChild(c);
    c.parentNode?.removeChild(c);
    this.childNodes.splice(this.childNodes.indexOf(before), 0, c);
    c.parentNode = this;
    return c;
  }
  removeChild(c: FakeNode) {
    this.childNodes = this.childNodes.filter((n) => n !== c);
    c.parentNode = null;
    return c;
  }
  /** The listeners added and not yet removed, by type: a test reads what is listening, nothing dispatches to them. */
  listeners = new Map<string, Set<Listener>>();
  addEventListener(t: string, l: Listener) {
    this.listeners.set(t, (this.listeners.get(t) ?? new Set()).add(l));
  }
  removeEventListener(t: string, l: Listener) {
    this.listeners.get(t)?.delete(l);
  }
  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join('');
  }
  set textContent(v: string) {
    this.childNodes = [];
    if (v) this.appendChild(Object.assign(new FakeText(String(v)), { ownerDocument: this.ownerDocument }));
  }
}

class FakeText extends FakeNode {
  constructor(public nodeValue: string) {
    super(3, '#text');
  }
  override get textContent() {
    return this.nodeValue;
  }
  override set textContent(v: string) {
    this.nodeValue = v;
  }
  set data(v: string) {
    this.nodeValue = v;
  }
}

export class FakeElement extends FakeNode {
  attributes = new Map<string, string>();
  style: Record<string, string> & { setProperty: (k: string, v: string) => void } = Object.assign(Object.create(null), {
    setProperty(this: Record<string, string>, k: string, v: string) {
      this[k] = v;
    },
  });
  constructor(
    readonly tagName: string,
    readonly namespaceURI = 'http://www.w3.org/1999/xhtml',
  ) {
    super(1, tagName.toUpperCase());
  }
  setAttribute(k: string, v: unknown) {
    this.attributes.set(k, String(v));
  }
  getAttribute(k: string) {
    return this.attributes.get(k) ?? null;
  }
  hasAttribute(k: string) {
    return this.attributes.has(k);
  }
  removeAttribute(k: string) {
    this.attributes.delete(k);
  }
  setAttributeNS(_ns: string, k: string, v: unknown) {
    this.setAttribute(k, v);
  }
  removeAttributeNS(_ns: string, k: string) {
    this.removeAttribute(k);
  }
  /** Every element below this one, depth first. */
  all(): FakeElement[] {
    return this.childNodes.flatMap((c) => (c instanceof FakeElement ? [c, ...c.all()] : []));
  }
}

class FakeDocument extends FakeNode {
  activeElement: FakeElement | null = null;
  documentElement: FakeElement;
  body: FakeElement;
  constructor() {
    super(9, '#document');
    this.ownerDocument = null;
    this.documentElement = this.createElement('html');
    this.body = this.createElement('body');
    this.documentElement.appendChild(this.body);
  }
  createElement(tag: string) {
    return Object.assign(new FakeElement(tag), { ownerDocument: this });
  }
  createElementNS(ns: string, tag: string) {
    return Object.assign(new FakeElement(tag, ns), { ownerDocument: this });
  }
  createTextNode(text: string) {
    return Object.assign(new FakeText(text), { ownerDocument: this });
  }
  hasFocus() {
    return true;
  }
}

/** Installs window, document and navigator on globalThis; returns the document and a container in its body. */
export function installFakeDom() {
  const document = new FakeDocument();
  const g = globalThis as Record<string, unknown>;
  const window = {
    document,
    navigator: { platform: 'Linux x86_64', userAgent: 'node' },
    HTMLIFrameElement: class {},
    addEventListener() {},
    removeEventListener() {},
    getSelection: () => null,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  };
  Object.assign(g, { window, document, IS_REACT_ACT_ENVIRONMENT: true });
  if (!('navigator' in g)) g.navigator = window.navigator;
  const container = document.createElement('div');
  document.body.appendChild(container);
  return { document, container };
}
