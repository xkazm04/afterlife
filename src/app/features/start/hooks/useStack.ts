'use client';

// The stack step's run (moved from onboard/wizard/useWizard): a picked repo is proposed (one call), then each spec is
// probed in order with its own request so the checklist streams, then saved on the person's confirm. A new pick or a
// re-run aborts the run before it, and a result that lands for an older run is dropped (the run token).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClaudeRepo } from '@/schemas/vitals';
import type { EngineKey, OnboardError, ProbeAnswer, ProposeAnswer } from '@/server/discover/wire';
import { probe, propose, save } from '../model/stack/api';

export type Phase = 'pick' | 'proposing' | 'probing' | 'review' | 'saving' | 'saved';

export interface WizardState {
  phase: Phase;
  engine: EngineKey;
  /** The path picked or pasted, as given. */
  picked?: string;
  answer?: ProposeAnswer;
  results: (ProbeAnswer | undefined)[];
  /** Index of the probe running now. */
  running: number | null;
  error?: OnboardError;
  /** Seconds since the proposal was asked, while it is made and its lines are probed. */
  elapsedS: number;
  slug?: string;
}

export interface StackRun extends WizardState {
  setEngine: (e: EngineKey) => void;
  pick: (root: string) => void;
  rerun: () => void;
  saveIt: () => void;
  reset: () => void;
}

const START: WizardState = { phase: 'pick', engine: 'sonnet', results: [], running: null, elapsedS: 0 };

export function useStack(): StackRun {
  const [s, setS] = useState<WizardState>(START);
  const run = useRef<{ id: number; abort: AbortController } | null>(null);
  const t0 = useRef(0);

  const start = useCallback(async (root: string, engine: EngineKey) => {
    run.current?.abort.abort();
    const me = { id: (run.current?.id ?? 0) + 1, abort: new AbortController() };
    run.current = me;
    const live = () => run.current === me;
    t0.current = Date.now();
    setS({ ...START, engine, phase: 'proposing', picked: root });
    const p = await propose(root, engine, me.abort.signal);
    if (!live()) return;
    if (!p.ok) return setS((x) => ({ ...x, phase: 'pick', error: p.error }));
    // A line the server names next (a found resource's query) is inserted right behind the one that found it.
    const specs = [...p.body.proposal.probes];
    setS((x) => ({ ...x, phase: 'probing', answer: p.body, results: new Array(specs.length).fill(undefined), running: specs.length ? 0 : null }));
    for (let i = 0; i < specs.length; i++) {
      setS((x) => ({ ...x, running: i }));
      const r = await probe(p.body.root, specs[i]!, me.abort.signal);
      if (!live()) return;
      const got: ProbeAnswer = r.ok ? r.body : { result: { kind: specs[i]!.kind, args: specs[i]!.args, status: 'fail', summary: r.error.error, at: new Date().toISOString(), ms: 0 }, seal: '' };
      const next = got.next && !specs.some((s) => s.kind === got.next!.kind && JSON.stringify(s.args) === JSON.stringify(got.next!.args)) ? got.next : undefined;
      if (next) specs.splice(i + 1, 0, next);
      const probes = [...specs];
      setS((x) => ({
        ...x,
        answer: x.answer && { ...x.answer, proposal: { ...x.answer.proposal, probes } },
        results: next ? [...x.results.slice(0, i), got, undefined, ...x.results.slice(i + 1)] : x.results.map((v, j) => (j === i ? got : v)),
      }));
    }
    setS((x) => ({ ...x, phase: 'review', running: null }));
  }, []);

  // The run's elapsed seconds, ticking only while the proposal is made and its lines are probed.
  const active = s.phase === 'proposing' || s.phase === 'probing';
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setS((x) => ({ ...x, elapsedS: Math.round((Date.now() - t0.current) / 1000) })), 1000);
    return () => clearInterval(t);
  }, [active, s.picked]);

  useEffect(() => () => run.current?.abort.abort(), []);

  const saveIt = useCallback(async () => {
    const a = s.answer;
    if (!a || s.phase !== 'review') return;
    setS((x) => ({ ...x, phase: 'saving', error: undefined }));
    const r = await save(a.root, s.engine, a.proposal, s.results.filter((x): x is ProbeAnswer => !!x && !!x.seal));
    setS((x) => (r.ok ? { ...x, phase: 'saved', slug: r.body.slug } : { ...x, phase: 'review', error: r.error }));
  }, [s.answer, s.engine, s.phase, s.results]);

  return {
    ...s,
    setEngine: (engine) => setS((x) => ({ ...x, engine })),
    pick: (root) => void start(root, s.engine),
    rerun: () => s.picked && void start(s.picked, s.engine),
    saveIt: () => void saveIt(),
    reset: () => {
      run.current?.abort.abort();
      setS((x) => ({ ...START, engine: x.engine }));
    },
  };
}

/** The repo the run is on, when it came from the list. */
export const repoOf = (repos: readonly ClaudeRepo[], root?: string): ClaudeRepo | undefined => repos.find((r) => r.root === root);
