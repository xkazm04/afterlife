// Where the X-ray's card goes beside the part it labels, and where its leader line runs. Pure: boxes in, boxes out.
import type { Box } from './types';

const GAP = 18;
const EDGE = 10;

const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: Box, area: Box): boolean => a.x >= area.x && a.y >= area.y && a.x + a.w <= area.x + area.w && a.y + a.h <= area.y + area.h;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** The target clipped to the area (a table taller than the window is labelled where it shows). Null when nothing shows. */
export function clip(t: Box, area: Box): Box | null {
  const x = Math.max(t.x, area.x);
  const y = Math.max(t.y, area.y);
  const w = Math.min(t.x + t.w, area.x + area.w) - x;
  const h = Math.min(t.y + t.h, area.y + area.h) - y;
  return w > 1 && h > 1 ? { x, y, w, h } : null;
}

/**
 * The card's box: right of the target, then left, below, above, each kept inside the area and clear of the `avoid` box (the
 * docked panel). A target that fills most of the area (a table) gets the card inside its own top-right corner.
 */
export function placeCard(t: Box, card: { w: number; h: number }, area: Box, avoid: Box | null): Box {
  const { w, h } = card;
  const midY = clamp(t.y + t.h / 2 - h / 2, area.y + EDGE, area.y + area.h - h - EDGE);
  const midX = clamp(t.x + t.w / 2 - w / 2, area.x + EDGE, area.x + area.w - w - EDGE);
  const big = t.w > area.w * 0.5 && t.h > area.h * 0.45;
  const tries: Box[] = big
    ? [
        { x: t.x + t.w - w - 3 * GAP, y: t.y + 3 * GAP, w, h },
        // the docked panel sits in that corner (a map that fills the window): left of the panel, then the target's other corner
        ...(avoid ? [{ x: avoid.x - w - GAP, y: t.y + 3 * GAP, w, h }] : []),
        { x: t.x + 3 * GAP, y: t.y + 3 * GAP, w, h },
      ]
    : [
        { x: t.x + t.w + GAP, y: midY, w, h },
        { x: t.x - w - GAP, y: midY, w, h },
        { x: midX, y: t.y + t.h + GAP, w, h },
        { x: midX, y: t.y - h - GAP, w, h },
        // a wide card beside the docked panel: slid left of it, below then above the target
        ...(avoid ? [{ x: avoid.x - w - GAP, y: t.y + t.h + GAP, w, h }, { x: avoid.x - w - GAP, y: t.y - h - GAP, w, h }] : []),
      ];
  const fits = tries.find((b) => inside(b, area) && !(avoid && overlaps(b, avoid)) && (big || !overlaps(b, t)));
  if (fits) return fits;
  const first = tries.find((b) => inside(b, area)) ?? tries[0]!;
  return { ...first, x: clamp(first.x, area.x + EDGE, area.x + area.w - w - EDGE), y: clamp(first.y, area.y + EDGE, area.y + area.h - h - EDGE) };
}

/** The leader line: from the card's nearest edge point to the target's nearest edge point. */
export function leader(card: Box, t: Box): { x1: number; y1: number; x2: number; y2: number } {
  const cx = card.x + card.w / 2;
  const cy = card.y + card.h / 2;
  const x2 = clamp(cx, t.x, t.x + t.w);
  const y2 = clamp(cy, t.y, t.y + t.h);
  return { x1: clamp(x2, card.x, card.x + card.w), y1: clamp(y2, card.y, card.y + card.h), x2, y2 };
}
