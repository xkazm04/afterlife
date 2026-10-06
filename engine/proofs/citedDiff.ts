// cited-diff (guardrail). Every finding must quote a hunk that literally exists in the merge request diff.
// Quotes are compared after collapsing whitespace and nothing else: not case, not punctuation, not
// look-alike characters. It proves the quote exists, not that the finding reads it correctly.
import type { Check, Claim } from '../../src/schemas/proof';
import { parseDiff, type DiffFile, type DiffHunk } from '../parse/diff';
import type { Draft } from './common';

export const MIN_QUOTE_CHARS = 6;

export const squashWs = (s: string): string => s.replace(/\s+/g, ' ').trim();

function sameFile(f: DiffFile, quoted: string): boolean {
  const q = quoted.replace(/^\.\//, '').replace(/^[ab]\//, '');
  return f.path === q || f.oldPath === q || f.newPath === q;
}

/** Where in this hunk the quote sits: on added lines, removed lines, or across the whole hunk. */
function foundIn(h: DiffHunk, needle: string): string | null {
  const side = (kinds: readonly string[]): string => squashWs(h.lines.filter((l) => kinds.includes(l.kind)).map((l) => l.text).join(' '));
  if (side(['add']).includes(needle)) return 'added lines';
  if (side(['del']).includes(needle)) return 'removed lines';
  if (side(['add', 'del', 'ctx']).includes(needle)) return 'the hunk';
  return null;
}

function checkClaim(c: Claim, files: readonly DiffFile[]): Check {
  const base = { claim_id: c.id, name: 'quote-in-diff' };
  if (!c.quote) return { ...base, ok: false, detail: 'the finding quotes nothing, so there is nothing to verify' };
  const needle = squashWs(c.quote.text);
  if (needle.length < MIN_QUOTE_CHARS) {
    return { ...base, ok: false, detail: `the quote is shorter than ${MIN_QUOTE_CHARS} characters, too little to show anything`, ref: c.quote.file };
  }
  const candidates = files.filter((f) => sameFile(f, c.quote?.file ?? ''));
  if (candidates.length === 0) return { ...base, ok: false, detail: `${c.quote.file} is not in the diff`, ref: c.quote.file };
  for (const f of candidates) {
    for (const h of f.hunks) {
      const where = foundIn(h, needle);
      if (where) return { ...base, ok: true, detail: `quote found in ${f.path} on ${where} (${h.header.split('@@')[1]?.trim() ?? 'hunk'})`, ref: f.path };
    }
  }
  return { ...base, ok: false, detail: `the quote does not appear in any hunk of ${c.quote.file}`, ref: c.quote.file };
}

export function citedDiff(claims: readonly Claim[], diff: string | undefined): Draft {
  const files = diff ? parseDiff(diff) : [];
  if (files.length === 0) {
    return { checks: [{ claim_id: null, name: 'diff-present', ok: null, detail: 'the input carries no parseable diff' }], evidence: [] };
  }
  const checks: Check[] = [{ claim_id: null, name: 'diff-present', ok: true, detail: `${files.length} file(s) in the diff` }];
  for (const c of claims) checks.push(checkClaim(c, files));
  return { checks, evidence: [] };
}
