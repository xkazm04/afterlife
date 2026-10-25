// What the Azure Pipelines and GitHub Actions readers share: how a file is opened, what one reads into, list items through
// template expressions, and a job's other names.
import { isRecord } from '../../core/types';
import type { CiJob } from '../facts';

/** A checkout file's parsed YAML; undefined when it is not a file inside the checkout. Throws when it does not parse. */
export type Open = (rel: string) => unknown;

export interface Read {
  jobs: CiJob[];
  /** References not opened (a template in another repository, a remote reusable workflow): a job may come from them. */
  unresolved: string[];
}

/**
 * A YAML list's items, with template expressions flattened: `- ${{ if eq(...) }}:` and `- ${{ each x in y }}:` wrap the
 * items they guard, and every branch is read (a scan does not evaluate parameters).
 */
export function items(v: unknown): unknown[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((i): unknown[] => {
    if (!isRecord(i)) return [i];
    const keys = Object.keys(i);
    return keys.length > 0 && keys.every((k) => k.startsWith('${{')) ? Object.values(i).flatMap(items) : [i];
  });
}

/** A CamelCase or PascalCase id as words: "BackendDbTests" -> "Backend Db Tests", "E2ETests" -> "E2E Tests". */
export const words = (id: string): string => id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

/** The names a job goes by besides its id: its display name, and the id as words. */
export function aliasesOf(id: string, display: unknown): string[] {
  const all = [typeof display === 'string' ? display : '', words(id)];
  return [...new Set(all)].filter((a) => a !== '' && a !== id);
}
