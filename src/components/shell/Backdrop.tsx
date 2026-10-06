/** Ghostwire's backdrop behind every window (styles/backdrop.css). Decorative; Window renders it behind every screen. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <span className="traces" />
      <span className="scan" />
    </div>
  );
}
