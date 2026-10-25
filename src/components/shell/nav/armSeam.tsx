'use client';

// The bake-off seam: a thin dispatcher to the arm useNavArm() picks. It holds no arm logic, so the three arm packages each
// edit only their own folder (a/, b/, c/) and this file never changes. Hooks stay unconditional: each arm's hook runs
// inside that arm's own link component, and switching arms swaps the component type (a remount), never the hook order.
import Link from 'next/link';
import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import * as armA from './a';
import * as armB from './b';
import * as armC from './c';
import { isSampleHref, type NavArm } from './navArm';
import type { ArmImpl } from './types';
import { useNavArm } from './useNavArm';

export type { ArmScreenKey } from './navArm';
export type { SidebarNav } from './types';

const ARMS: Record<NavArm, ArmImpl> = { A: armA, B: armB, C: armC };

type LinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'onClick'> & {
  href: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

/** One arm's sidebar link: the caller's onClick first, then the arm's; the arm's prefetch over the default. */
function armLink(impl: ArmImpl) {
  return function ArmLinkFor({ onClick, ...props }: LinkProps) {
    const nav = impl.useSidebarNav(props.href);
    const click = onClick || nav.onClick ? (e: MouseEvent<HTMLAnchorElement>) => { onClick?.(e); nav.onClick?.(e); } : undefined;
    return <Link {...props} {...(nav.prefetch === undefined ? {} : { prefetch: nav.prefetch })} onClick={click} />;
  };
}

const LINKS: Record<NavArm, (p: LinkProps) => ReactNode> = { A: armLink(armA), B: armLink(armB), C: armLink(armC) };

/** A sidebar <Link>: the sample modules' links go through the active arm; every other tab stays a plain Link. */
export function ArmLink(props: LinkProps) {
  const arm = useNavArm();
  if (!isSampleHref(props.href)) return <Link {...props} />;
  const L = LINKS[arm];
  return <L {...props} />;
}

/** Mounted once around the (app) layout's children; the active arm renders its host around/above them. */
export function ArmHost({ children }: { children?: ReactNode }) {
  const Host = ARMS[useNavArm()].ArmHost;
  return <Host>{children}</Host>;
}
