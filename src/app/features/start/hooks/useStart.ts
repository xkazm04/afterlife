'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { ClaudeRepo } from '@/schemas/vitals';
import { snapshotOf } from '../model/actions';
import { engineLine } from '../model/stack/format';
import { checklist, tally } from '../model/stack/lines';
import { currentOf, deriveSteps } from '../model/steps/derive';
import { setSetup } from '../model/steps/parts';
import { targetGroup } from '../model/steps/group';
import type { StartFacts, StepKey } from '../model/types';
import { SLOW_S, type StartView } from '../model/view';
import { useChat } from './useChat';
import { usePending } from './usePending';
import { useProbe } from './useProbe';
import { repoOf, useStack } from './useStack';
import { useRepo } from './useRepo';

export interface StartProps {
  facts: StartFacts;
  repos: readonly ClaudeRepo[];
  /** Why the repo list is empty or partial; set when the request is not this machine's. */
  note?: string;
  local: boolean;
}

/**
 * /start's one state: the probe stream, the repo's derive, the stack's run, the pending action and the chat, folded
 * into the StartView every variant renders. The steps are derived here on every render, never stored; the selected
 * step follows the current one until the person picks another, and follows again once the current one moves on.
 */
export function useStart({ facts, repos, note, local }: StartProps): StartView {
  const router = useRouter();
  const probe = useProbe(facts);
  const stack = useStack();
  const repo = useRepo(stack.pick);
  const [typed, setTyped] = useState<string>();
  const [picked, setPicked] = useState<{ step: StepKey; at: StepKey } | null>(null);
  const recheck = probe.recheck;
  const onDone = useCallback(() => {
    recheck();
    router.refresh();
  }, [recheck, router]);
  const { pending, run: runAction } = usePending(stack.saveIt, onDone);

  const a = stack.answer;
  const groups = a ? checklist(a.proposal, stack.results.map((r) => r?.result), stack.running, a.ciFiles) : [];
  const t = tally(groups);
  const input = {
    facts,
    probe: { state: probe.state, running: probe.running, sinceS: probe.sinceS },
    repo: { local, note, picked: repo.picked, name: repoOf(repos, repo.picked)?.name, deriving: repo.deriving, derive: repo.answer, error: repo.error, sinceS: repo.sinceS },
    typedGroup: typed,
    stack: { phase: stack.phase, tally: t, running: stack.running, total: a?.proposal.probes.length ?? 0, elapsedS: stack.elapsedS, error: stack.error, slug: stack.slug },
  };
  const steps = deriveSteps(input);
  const current = currentOf(steps);
  const host = repo.answer?.host ?? facts.host;
  const chat = useChat(snapshotOf(steps, facts, { repo: repo.picked, host, groupId: targetGroup(input) }), (action) => runAction(action, null));

  return {
    steps,
    current,
    selected: picked && picked.at === current ? picked.step : current,
    select: (step) => setPicked({ step, at: current }),
    running: probe.running,
    elapsedS: probe.sinceS,
    slow: probe.running && probe.sinceS >= SLOW_S,
    refused: probe.state.refused,
    at: probe.state.read?.at ?? null,
    source: { mode: facts.mode, fake: facts.fake, host: facts.host, group: facts.groupId, sources: facts.sources },
    gate: facts.gate,
    rehearsal: facts.rehearsal,
    recheck,
    run: (key) => {
      const action = steps.find((s) => s.key === key)?.action;
      if (action) runAction(action, key);
    },
    setGroup: (groupId) => {
      setTyped(groupId);
      runAction(setSetup(groupId, host), 'group');
    },
    pending,
    repo: { repos, picked: repo.picked, note, pick: repo.pick },
    stack: { groups, tally: t, phase: stack.phase, error: stack.error, slug: stack.slug, engine: a ? engineLine(a.engine, a.ms) : undefined, rerun: stack.rerun, save: stack.saveIt },
    chat,
    path: chat.open ? 'assist' : 'hand',
    setPath: (p) => {
      if ((p === 'assist') !== chat.open) chat.toggle();
    },
  };
}
