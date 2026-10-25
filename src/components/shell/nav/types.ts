// The contract each arm (a/, b/, c/) fills. armSeam.tsx dispatches to the arm useNavArm() picks; it holds no arm logic.
import type { MouseEvent, ReactNode } from 'react';

/** What an arm adds to a sidebar <Link>. Absent fields leave the Link as it is today. */
export interface SidebarNav {
  /** Runs after the caller's own onClick; preventDefault() here stops the router navigation (arm B swaps in place). */
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  prefetch?: boolean | 'auto';
}

/** One arm's implementation: a hook per sidebar link and a host mounted once around the (app) layout's children. */
export interface ArmImpl {
  /** Called only while this arm is active (the seam renders one arm's link component), so it may hold its own state. */
  useSidebarNav: (href: string) => SidebarNav;
  ArmHost: (props: { children?: ReactNode }) => ReactNode;
}
