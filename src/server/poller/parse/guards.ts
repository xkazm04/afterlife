// Narrowing helpers for text that came from GitLab. Everything parsed here is data: a value that does not have the
// exact shape is dropped, never repaired.
export type Rec = Record<string, unknown>;

export const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
export const isStr = (v: unknown): v is string => typeof v === 'string';
export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const isStrList = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);

/** A non-empty string field, or null. */
export const field = (r: Rec, k: string): string | null => {
  const v = r[k];
  return isStr(v) && v !== '' ? v : null;
};
