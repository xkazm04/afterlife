// Pure state of the "press closed it, so the click must not reopen it" guard of usePopover.
//
// A sticky popover closes on a mousedown outside it. When that press lands on its own trigger, the click that follows
// the press would call toggle()/show() on a closed popover and reopen it, so the trigger could never close it. The
// guard remembers the trigger whose press closed the popover and swallows exactly one reopen for it.

export interface ReopenGuard<A> {
  /** A press outside the popover closed it. `onAnchor`: the press landed on the anchor the popover was shown for. */
  pressClosed: (anchor: A, onAnchor: boolean) => void;
  /** True once, for the anchor whose press just closed the popover: the click that follows it must not reopen. */
  swallows: (anchor: A) => boolean;
  /** Forget it (the next press began, so no click follows the old one). */
  reset: () => void;
}

export function createReopenGuard<A>(): ReopenGuard<A> {
  let armed: { anchor: A } | null = null;
  return {
    pressClosed: (anchor, onAnchor) => {
      armed = onAnchor ? { anchor } : null;
    },
    swallows: (anchor) => {
      const hit = armed !== null && armed.anchor === anchor;
      armed = null;
      return hit;
    },
    reset: () => {
      armed = null;
    },
  };
}
