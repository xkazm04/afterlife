// Column sizing helpers: a fixed track in px at the Smaller setting grows with the text-size scale.

/** A fixed track: 88 -> "calc(88px * var(--ui-scale))". */
export const px = (n: number): string => `calc(${n}px * var(--ui-scale))`;

/** A flexible track with a scaled minimum: minmax(150px, 240px) scaled. */
export const range = (min: number, max: number): string => `minmax(${px(min)}, ${px(max)})`;

/** `repeat(n, <px>)` scaled. */
export const repeatPx = (n: number, size: number): string => `repeat(${n}, ${px(size)})`;

/** The scaled form of a total minimum width, for OutlineTable's minWidth. */
export const minWidth = px;
