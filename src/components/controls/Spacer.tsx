/** Flexible gap in a toolbar or status bar: pushes what follows to the far edge. */
export function Spacer() {
  return <div aria-hidden="true" style={{ flex: 1, minWidth: 6 }} />;
}
