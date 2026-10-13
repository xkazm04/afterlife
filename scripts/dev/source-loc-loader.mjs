// Dev-only Turbopack loader: stamps every host JSX element (<div>, <button>, ...) with
// data-loc="src/.../File.tsx:LINE:COL" so the DevInspector (Ctrl+Shift+L) can map a DOM node back to its source.
// Wired in next.config.ts only when BELAY_INSPECTOR=1 (npm run dev:inspect); a build or a plain `npm run dev` never loads it.
// It splices text instead of printing the AST, so the TSX reaches the compiler byte-for-byte apart from the attribute.
import ts from 'typescript';

export default function sourceLocLoader(source) {
  const file = this.resourcePath.replace(/\\/g, '/');
  const at = file.lastIndexOf('/src/');
  if (at === -1 || file.includes('/src/lib/dev/') || !file.endsWith('.tsx')) return source;
  const rel = file.slice(at + 1);

  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const inserts = [];
  const visit = (node) => {
    const isEl = ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node);
    if (isEl && ts.isIdentifier(node.tagName) && /^[a-z]/.test(node.tagName.text)) {
      const stamped = node.attributes.properties.some((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === 'data-loc');
      if (!stamped) {
        const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        inserts.push({ pos: node.tagName.getEnd(), text: ` data-loc="${rel}:${line + 1}:${character + 1}"` });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  let out = source;
  for (const { pos, text } of inserts.sort((a, b) => b.pos - a.pos)) out = out.slice(0, pos) + text + out.slice(pos);
  return out;
}
