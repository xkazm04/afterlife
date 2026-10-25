// Cloud hints from the repo's own infra code: the lines that name an App Insights component or a resource group. A
// subscription-wide component list came back empty on Grinex, so the proposal's cloud hint must come from here (the
// `RG="${RG:-grinex-portal-resource-group}"` of its infra scripts). Lines that carry a key or a connection string are
// never kept.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/** A component named, or a resource group / component name assigned (`RG="${RG:-x}"`, `resourceGroupName: 'x'`). */
const HINT = /Microsoft\.Insights\/components|app-?insights|\b(RG|RESOURCE_GROUP|resourceGroup\w*|APP_INSIGHTS\w*)\s*[=:]\s*\S/i;
const SECRET = /InstrumentationKey|ConnectionString|connection_string|password|secret|token|key\s*=/i;
const EXT = /\.(bicep|bicepparam|sh|ps1|json|tf|ya?ml)$/i;
const MAX_FILES = 300;
const MAX_LINES = 40;

function walk(dir: string, depth: number, out: string[]): void {
  if (depth > 3 || out.length >= MAX_FILES) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') walk(p, depth + 1, out);
    else if (e.isFile() && EXT.test(e.name) && out.length < MAX_FILES) out.push(p);
  }
}

/** `file: line` hints, deduped by line text, at most MAX_LINES. */
export function infraHints(root: string): string[] {
  const files: string[] = [];
  walk(path.join(root, 'infra'), 0, files);
  try {
    for (const f of readdirSync(root)) if (/\.bicep(param)?$/i.test(f)) files.push(path.join(root, f));
  } catch {
    /* unreadable root: no hints */
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of files) {
    try {
      if (statSync(f).size > 512 * 1024) continue;
      for (const raw of readFileSync(f, 'utf8').split(/\r?\n/)) {
        const line = raw.trim();
        if (!HINT.test(line) || SECRET.test(line) || line.length > 200 || seen.has(line)) continue;
        seen.add(line);
        out.push(`${path.relative(root, f).replace(/\\/g, '/')}: ${line}`);
        if (out.length >= MAX_LINES) return out;
      }
    } catch {
      /* unreadable file: skipped */
    }
  }
  return out;
}
