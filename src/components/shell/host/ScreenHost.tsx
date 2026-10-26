'use client';

// The screen host, mounted once by the (app) layout around the route's children. It draws every claimed screen itself:
// the URL matches the route table, the screen's Frame paints at once inside <Activity>, and its slices stream in over
// one request. Visited screens stay mounted, hidden (LRU, cap 10) and keep their state; a key no module claims yet
// shows the route's page (children) as before. A hard load renders the same Frame on the server, every slice unread.
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Activity, Fragment, Suspense, useEffect, useMemo, type ComponentType, type ReactNode } from 'react';
import { followRouter, followSearch, hostReplace, installHost } from './hooks/navigation';
import { ScreenScope } from './hooks/scope';
import { configureHost, useHostSelect, useHostState, type Loc } from './hooks/store';
import { matchRoute } from './model/routes';
import type { ScreenDef } from './model/types';
import { HostNotFound } from './HostNotFound';
import { declaredSlices, isReady, SCREEN_ORDER, SCREENS } from './registry';
import styles from './host.module.css';

const sessionIds = new WeakMap<ComponentType<{ children: ReactNode }>, string>();
let sessionCount = 0;
/** A stable React key per Session component: its group keeps its state while other groups come and go. */
const sessionKey = (s: ComponentType<{ children: ReactNode }>): string => {
  if (!sessionIds.has(s)) sessionIds.set(s, `session-${++sessionCount}`);
  return sessionIds.get(s) ?? 'session';
};

function ScreenBody({ def, loc }: { def: ScreenDef; loc: Loc }) {
  const notFound = useHostSelect((s) => s.entries[def.key]?.notFound === true, false);
  const search = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  if (notFound) return def.NotFound ? <def.NotFound params={loc.params} /> : <HostNotFound />;
  // a new instance (another param) is a new screen: its state starts over
  return <def.Frame key={loc.path} params={loc.params} search={search} />;
}

/** Follows a query-only change under the same screen (useSearchParams is request data: its own Suspense, no fallback). */
function SearchSync() {
  const q = useSearchParams().toString();
  useEffect(() => followSearch(), [q]);
  return null;
}

function HostBody({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const st = useHostState();

  useEffect(() => {
    configureHost({ isReady, declared: declaredSlices, redirect: (to) => void (hostReplace(to) || router.replace(to)) });
    return installHost();
  }, [router]);
  useEffect(() => followRouter(pathname), [pathname]);

  // Next has rendered a pathname the store has not seen yet (the first render, a router navigation): the pathname
  // decides; otherwise the store does (it is ahead of Next right after the host's own pushState).
  let active: Loc | null = st.loc;
  if (pathname !== st.seenPath) {
    const m = matchRoute(pathname);
    active = m && isReady(m.key) ? { key: m.key, params: m.params, path: m.path, search: st.loc?.path === m.path ? st.loc.search : '' } : null;
  }
  const activeDef = active ? SCREENS[active.key] : undefined;
  const title = activeDef && active ? activeDef.title(active.params, new URLSearchParams(active.search)) : null;
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  const shown = SCREEN_ORDER.filter((d) => d.key === active?.key || st.order.includes(d.key));
  const groups: { Session?: ScreenDef['Session']; defs: ScreenDef[] }[] = [];
  for (const d of shown) {
    const g = d.Session ? groups.find((x) => x.Session === d.Session) : undefined;
    if (g) g.defs.push(d);
    else groups.push({ Session: d.Session, defs: [d] });
  }
  const screen = (d: ScreenDef) => {
    const loc = d.key === active?.key ? active : st.locs[d.key];
    if (!loc) return null;
    return (
      <Activity key={d.key} mode={d.key === active?.key ? 'visible' : 'hidden'}>
        <ScreenScope screen={d.key}>
          <ScreenBody def={d} loc={loc} />
        </ScreenScope>
      </Activity>
    );
  };

  return (
    <>
      {title ? <title>{title}</title> : null}
      <Suspense fallback={null}>
        <SearchSync />
      </Suspense>
      {/* The route's own page hides only once the host is installed (seenPath set by its first effect): on the server
          and in hydration it renders as it is (on a claimed route a thin shell drawing nothing), since a hidden
          <Activity> is skipped on the server and Next then reports a page segment that never rendered. */}
      <Activity mode={active && st.seenPath !== null ? 'hidden' : 'visible'}>
        <div className={styles.route}>{children}</div>
      </Activity>
      {groups.map((g) =>
        g.Session ? <g.Session key={sessionKey(g.Session)}>{g.defs.map(screen)}</g.Session> : <Fragment key={g.defs[0]?.key}>{g.defs.map(screen)}</Fragment>,
      )}
    </>
  );
}

/**
 * The host. Its pathname read sits behind Suspense (a dynamic route's pathname is request data under Cache Components);
 * on a static route it resolves while prerendering, so the claimed screen's frame is in the static shell. The fallback
 * is nothing: never a skeleton.
 */
export function ScreenHost({ children }: { children?: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <HostBody>{children}</HostBody>
    </Suspense>
  );
}
