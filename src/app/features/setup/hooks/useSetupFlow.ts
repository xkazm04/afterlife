'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import type { ActionResponse } from '@/server/actions/types';
import { commandLines, mrOf, NO_ANSWER, outcomeOf } from '@/server/actions/words';
import { STEP_DETAIL } from '../data/stepDetail';
import { BASE_MIN, DOCTOR_MS, PROBE_MS, REDUCED_MAX_MS } from '../data/timing';
import { clockLabel } from '../model/flow/probeAge';
import { probeWillPass, setupReducer } from '../model/flow/reducer';
import { verdictOf } from '../model/flow/verify';
import { mrName } from '../model/flow/wording';
import type { SetupState } from '../model/types';
import { checkArm, sendArm } from '../write/arm';
import type { ArmWrites } from './useArmWrite';

export interface FlowActions {
  /** Ask GitLab through Belay's probe: the only thing that moves a step to done. */
  probe: (n: number) => Promise<void>;
  /** Send the step's write as you, then probe. */
  send: (n: number) => Promise<void>;
  skip: (n: number) => void;
  copyStep: (n: number) => void;
  openWhere: (n: number) => void;
  /** Confirm the arm MR on screen (previewAction planned it), as you. */
  armSend: (id: string) => Promise<void>;
  /** Copy the planned commands of the write on screen. */
  armCopy: (id: string, revert: boolean) => void;
  armVerify: (id: string) => Promise<void>;
  openMr: (id: string) => void;
  /** Confirm the disarm MR on screen: the revert of the arm block. */
  disarm: (id: string) => Promise<void>;
  reprobe: () => Promise<void>;
  pickGroup: (group: string) => void;
}

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, reduced() ? Math.min(ms, REDUCED_MAX_MS) : ms));

/**
 * The setup state and everything that changes it. Arm and disarm go through the server's preview and confirm (the MR
 * number comes from the confirm's answer); the steps and the doctor are still simulated here. Messages go to a toast
 * and the status bar.
 */
export function useSetupFlow(initial: SetupState, writes: ArmWrites): { state: SetupState; actions: FlowActions } {
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
    const nameOf = (id: string) => {
      const a = ref.current.arm[id];
      return a ? mrName(a) : 'the MR';
    };
    /** The click: confirm exactly the preview on screen. Moves the track only on a done, with what GitLab named. */
    const send = async (id: string, revert: boolean) => {
      if (ref.current.arm[id]?.st !== (revert ? 'armed' : 'ready')) return;
      const what = `${revert ? 'disarm' : 'arm'} ${id}`;
      let r: ActionResponse | null;
      try {
        r = await sendArm(ref.current.project, id, revert, writes.viewOf(id, revert));
      } catch {
        writes.clear();
        say(`${what}: ${NO_ANSWER}`);
        toast(NO_ANSWER);
        return;
      }
      const o = r ? outcomeOf(r, what) : null;
      if (!r || !o) {
        toast(`Nothing sent · ${what}: the exact MR is not on screen yet`);
        return;
      }
      if (o.status === 'changed') writes.put(id, revert, { kind: 'preview', preview: o.preview });
      else writes.clear();
      if (o.status === 'done' && r.status === 'done') {
        const mr = mrOf(r.results);
        const url = r.results.find((x) => x.made === mr)?.url ?? null;
        dispatch({ t: 'arm-sent', id, revert, mr, url, simulated: o.simulated });
      }
      say(o.text);
      toast(o.text);
    };
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
      armSend: (id) => send(id, false),
      armCopy: (id, revert) => {
        const view = writes.viewOf(id, revert);
        if (view?.kind === 'preview') copy(commandLines(view.preview).join('\n'));
        else toast('Nothing to copy: the exact MR is not on screen');
      },
      armVerify: async (id) => {
        const a = ref.current.arm[id];
        if (a?.st !== 'open') return;
        const revert = a.revert;
        const mr = nameOf(id);
        dispatch({ t: 'verify-start', id });
        // A read of the default branch, never an arm on its own. Demo mode reads nothing and says so.
        const v = verdictOf(await checkArm(ref.current.project, id, revert), revert);
        dispatch({ t: 'verify-end', id, verdict: v });
        const settled = revert ? `${id} disarmed · the revert is on main` : `${id} armed · ${mr} is on main`;
        const text = !v.ok ? `${id} not ${revert ? 'disarmed' : 'armed'} yet · ${v.text}` : v.simulated ? `${v.text} · ${id} marked ${revert ? 'disarmed' : 'armed'}` : `${settled} · ${v.text}`;
        say(text);
        toast(text);
      },
      openMr: (id) => {
        const a = ref.current.arm[id];
        if (a?.url) window.open(a.url, '_blank', 'noopener,noreferrer');
        else toast(a?.simulated ? 'Demo mode opened no MR: there is nothing to open' : `GitLab gave no address for ${nameOf(id)}`);
      },
      disarm: (id) => send(id, true),
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
  }, [clock, say, toast, writes]);

  return { state, actions };
}
