/** "decision" / "decisions": the word only. */
export function pluralWord(n: number, one: string, other: string = `${one}s`): string {
  return n === 1 ? one : other;
}

/** "1 decision", "3 decisions", "0 decisions". */
export function plural(n: number, one: string, other: string = `${one}s`): string {
  return `${n} ${pluralWord(n, one, other)}`;
}
