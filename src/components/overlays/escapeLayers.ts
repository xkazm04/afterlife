// One Escape owner for every open overlay. A Sheet holds the content pane while the status bar's "?" popover and the
// toolbar menus stay reachable, so overlays stack; each used to bind its own capture listener on document, and
// stopPropagation cannot part two listeners on one node, so one Escape closed the sheet under an open popover too, and
// a menu over a sheet never heard it. Here the layer opened last hears Escape (the key is consumed); the rest do not.

interface Layer {
  close: () => void;
}
const stacks = new WeakMap<EventTarget, Layer[]>();

const onKey = (e: Event) => {
  if ((e as KeyboardEvent).key !== 'Escape') return;
  const top = e.currentTarget ? stacks.get(e.currentTarget)?.at(-1) : undefined;
  if (!top) return;
  e.preventDefault();
  e.stopPropagation();
  top.close();
};

/** Open a layer that `close`s on Escape while it is the top one. Call the result when the layer goes away. */
export function onEscape(close: () => void, root: EventTarget = document): () => void {
  const layer: Layer = { close };
  let stack = stacks.get(root);
  if (!stack) {
    stack = [];
    stacks.set(root, stack);
    root.addEventListener('keydown', onKey, true);
  }
  stack.push(layer);
  return () => {
    const s = stacks.get(root);
    const i = s ? s.indexOf(layer) : -1;
    if (!s || i < 0) return;
    s.splice(i, 1);
    if (s.length) return;
    stacks.delete(root);
    root.removeEventListener('keydown', onKey, true);
  };
}
