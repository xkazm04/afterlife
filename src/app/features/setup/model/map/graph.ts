// The dependency graph of the unlock map: tracks need steps and other tracks; tracks rely on GitLab capabilities.
// Pure: every function takes the graph, so tests can use a small one.

export interface Graph {
  /** Track id -> needs. A need is a track id or "step:N". */
  needs: Readonly<Record<string, readonly string[]>>;
  /** Capability name -> the tracks that rely on it. */
  capUses: Readonly<Record<string, readonly string[]>>;
}

export const stepKey = (n: number): string => `step:${n}`;
export const isStepKey = (k: string): boolean => k.startsWith('step:');
export const stepOf = (k: string): number => Number(k.slice(5));

const needsOf = (g: Graph, id: string): readonly string[] => g.needs[id] ?? [];

/** Tracks that directly wait on a step. */
export function stepFrees(g: Graph, n: number): string[] {
  return Object.keys(g.needs).filter((id) => needsOf(g, id).includes(stepKey(n)));
}

/** Every track that (transitively) needs `id`, in discovery order. */
export function downstream(g: Graph, id: string): string[] {
  const out = new Set<string>();
  const go = (x: string) => {
    for (const y of Object.keys(g.needs)) {
      if (needsOf(g, y).includes(x) && !out.has(y)) {
        out.add(y);
        go(y);
      }
    }
  };
  go(id);
  return [...out];
}

export interface Upstream {
  tracks: Set<string>;
  steps: Set<number>;
  caps: Set<string>;
}

/** What a track needs, all the way back: tracks, steps, and the capabilities each of them relies on. */
export function upstream(g: Graph, id: string): Upstream {
  const u: Upstream = { tracks: new Set(), steps: new Set(), caps: new Set() };
  const go = (x: string) => {
    for (const k of needsOf(g, x)) {
      if (isStepKey(k)) u.steps.add(stepOf(k));
      else if (!u.tracks.has(k)) {
        u.tracks.add(k);
        go(k);
      }
    }
    for (const c of capsOf(g, x)) u.caps.add(c);
  };
  go(id);
  return u;
}

/** Capabilities a track relies on. */
export function capsOf(g: Graph, id: string): string[] {
  return Object.entries(g.capUses)
    .filter(([, ts]) => ts.includes(id))
    .map(([c]) => c);
}

/** Tracks freed by a step: the direct ones first, then everything behind them. */
export function stepFreesAll(g: Graph, n: number): { direct: string[]; more: string[] } {
  const direct = stepFrees(g, n);
  const more = new Set<string>();
  for (const t of direct) for (const d of downstream(g, t)) more.add(d);
  return { direct, more: [...more] };
}
