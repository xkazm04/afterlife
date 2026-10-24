/** A Next search-param value: absent, once (`?a=1`) or repeated (`?a=1&a=2`). */
export type ParamValue = string | string[] | undefined;

/** The first value of a search param, so `?a=1&a=2` reads like `?a=1`; undefined when it is absent. */
export function firstParam(v: ParamValue): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
