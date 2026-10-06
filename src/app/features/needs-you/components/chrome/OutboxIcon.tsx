/** The tray glyph on the toolbar's Outbox button. */
export function OutboxIcon() {
  const w = 'calc(14px * var(--ui-scale))';
  const h = 'calc(12px * var(--ui-scale))';
  return (
    <svg viewBox="0 0 14 12" style={{ width: w, height: h, flex: 'none' }} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 7h3.2l1 1.8h3.6l1-1.8H13" />
      <path d="M1 7l1.8-5.6h8.4L13 7v4H1z" />
    </svg>
  );
}
