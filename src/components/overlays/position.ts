// Pure placement maths for menus and popovers. Everything is in viewport pixels.

export interface Point {
  x: number;
  y: number;
}
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export interface Size {
  w: number;
  h: number;
}

/** Keep a box of size (w, h) with its corner at (x, y) fully inside the viewport, `pad` px from every edge. */
export function clampToViewport(at: Point, size: Size, viewport: Size, pad = 4): Point {
  return {
    x: Math.max(pad, Math.min(at.x, viewport.w - size.w - pad)),
    y: Math.max(pad, Math.min(at.y, viewport.h - size.h - pad)),
  };
}

/**
 * Place a popover next to an anchor, centred on it. `below` flips above when it would overflow the bottom;
 * `above` flips below when it would overflow the top. The result is clamped horizontally and vertically.
 */
export function placeNear(anchor: Box, size: Size, viewport: Size, prefer: 'below' | 'above' = 'below', gap = 6): Point {
  const x = anchor.left + (anchor.right - anchor.left) / 2 - size.w / 2;
  const below = anchor.bottom + gap;
  const above = anchor.top - size.h - gap;
  let y: number;
  if (prefer === 'below') y = below + size.h > viewport.h - gap ? above : below;
  else y = above < gap ? below : above;
  return clampToViewport({ x, y }, size, viewport, gap);
}
