/**
 * The cycle a key walks to: Left and Right step, Home and End jump to the first and the last (the planned one),
 * clamped to the cycles there are. Any other key, or a key with a modifier, walks nowhere (null).
 */
export function walkTo(key: string, index: number, count: number, modified = false): number | null {
  if (modified || count < 1) return null;
  const to: Record<string, number> = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: count - 1 };
  if (!Object.hasOwn(to, key)) return null;
  return Math.max(0, Math.min(count - 1, to[key] as number));
}
