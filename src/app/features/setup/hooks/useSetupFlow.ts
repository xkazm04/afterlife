'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import { ARM_META } from '../data/armMeta';
import { STEP_DETAIL } from '../data/stepDetail';
import { BASE_MIN, DOCTOR_MS, PROBE_MS, REDUCED_MAX_MS } from '../data/timing';
import { clockLabel } from '../model/flow/probeAge';
import { probeWillPass, setupReducer } from '../model/flow/reducer';
import { armCmd } from '../model/flow/wording';
import type { SetupState } from '../model/types';

export interface FlowActions {
  /** Ask GitLab through Belay's probe: the only thing that moves a step to done. */
  probe: (n: number) => Promise<void>;
  /** Send the step's write as you, then probe. */
  send: (n: number) => Promise<void>;
  skip: (n: number) => void;
  copyStep: (n: number) => void;
  openWhere: (n: number) => void;
  armSend: (id: string) => void;
  armCopy: (id: string) => void;
  armVerify: (id: string) => Promise<void>;
  openMr: (id: string) => void;
  disarm: (id: string) => void;
  reprobe: () => Promise<void>;
  pickGroup: (group: string) => void;
}

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, reduced() ? Math.min(ms, REDUCED_MAX_MS) : ms));

/**
 * The setup state and everything that changes it. Every write is simulated: a click shows a toast and moves the
 * state, and nothing leaves the page. Messages go to a toast and the status bar.
 */
export function useSetupFlow(initial: SetupState, keys: Readonly<Record<string, string>>): { state: SetupState; actions: FlowActions } {
  const [state, dispatch] = useReducer(setupReducer, initial);
  const ref = useRef(state);
  const start = useRef(0);
  const { toast, status } = useToast();
  useEffect(() => {
    ref.current = state;
    if (!start.current) start.current = Date.now();
  });
  const clock = useCallback(() => clockLabel(BASE_MIN, start.current || Date.now(), Date.now()), []);
  const say = useCallback((m: string) => status(m), [status]);

  const actions = useMemo<FlowActions>(() => {
    const copy = (text: string) => {
      const done = () => toast('Copied · nothing sent');
      try {
        navigator.clipboard.writeText(text).then(done, done);
      } catch {
        done();
      }
    };
    const probe = async (n: number) => {
      const cur = ref.current.steps[n];
      if (!cur || cur.st === 'probing' || cur.st === 'done') return;
      dispatch({ t: 'probe-start', n });
      await wait(PROBE_MS);
      const pass = probeWillPass(ref.current, n);
      dispatch({ t: 'probe-end', n, at: clock() });
      const d = STEP_DETAIL[n];
      if (pass) {
        say(`step ${n} · ${d?.probe ?? ''}`);
        toast(`Step ${n} · verified by Belay`);
      } else {
        say(`step ${n} not yet: ${d?.failFirst ?? ''}`);
        toast(`Step ${n} · not yet. Nothing changed in GitLab.`);
      }
    };
    const mrOf = (id: string) => ref.current.arm[id]?.mr ?? ref.current.armMrs[id] ?? '!?';
    const key = (id: string) => keys[id] ?? id.toLowerCase();
    return {
      probe,
      send: async (n) => {
        say(`sent as @you: step ${n}`);
        toast(`Sent as you · step ${n} · probing`);
        await probe(n);
      },
      skip: (n) => {
        say(`step ${n} skipped · nothing sent`);
        toast(`Skipped step ${n} · nothing sent`);
      },
      copyStep: (n) => copy((STEP_DETAIL[n]?.cmd ?? []).join('\n')),
      openWhere: (n) => toast(`Would open: ${STEP_DETAIL[n]?.where ?? 'GitLab'}`),
      armSend: (id) => {
        if (ref.current.arm[id]?.st !== 'ready') return;
        const mr = ref.current.armMrs[id] ?? '!?';
        dispatch({ t: 'arm-send', id });
        say(`sent as @you: ${mr} ${ARM_META[id]?.title ?? id}`);
        toast(`Opened ${mr} as you · merge it, then verify`);
      },
      armCopy: (id) => copy(armCmd(id, key(id))),
      armVerify: async (id) => {
        const a = ref.current.arm[id];
        if (a?.st !== 'open') return;
        const revert = a.revert;
        const mr = mrOf(id);
        dispatch({ t: 'verify-start', id });
        await wait(PROBE_MS);
        dispatch({ t: 'verify-end', id });
        say(revert ? `${id} disarmed · revert merged` : `${id} armed · ${mr} merged on main`);
        toast(revert ? `${id} disarmed · revert merged` : `${id} armed · revert ${mr} to disarm`);
      },
      openMr: (id) => toast(`Would open ${mrOf(id)} in GitLab`),
      disarm: (id) => {
        if (ref.current.arm[id]?.st !== 'armed') return;
        dispatch({ t: 'disarm', id });
        say(`sent as @you: revert ${mrOf(id)}`);
        toast(`Revert of ${mrOf(id)} opened as you · merge it and the track disarms`);
      },
      reprobe: async () => {
        if (ref.current.doctorBusy) return;
        dispatch({ t: 'doctor-start' });
        await wait(DOCTOR_MS);
        dispatch({ t: 'doctor-end', now: Date.now(), at: clock() });
        say(`belay doctor · ${ref.current.group} re-probed`);
        toast(`belay doctor · ${ref.current.group} probed`);
      },
      pickGroup: (group) => {
        if (group === ref.current.group) return;
        dispatch({ t: 'pick-group', group, now: Date.now(), at: clock() });
        say(`group → ${group}`);
      },
    };
  }, [clock, keys, say, toast]);

  return { state, actions };
}
