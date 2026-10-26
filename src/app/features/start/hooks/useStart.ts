'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { hostRevalidate } from '@/components/shell/host/hooks/navigation';
import type { ClaudeRepo } from '@/schemas/vitals';
import { snapshotOf } from '../model/actions';
import { savedDay, savedStack, type SavedProject } from '../model/projects/saved';
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
  /** Absent: not read yet (the screen host's repos slice lands after the facts). */
  repos?: readonly ClaudeRepo[];
  /** Why the repo list is empty or partial; set when the request is not this machine's. */
  note?: string;
  local: boolean;
  /** A saved project selected in the Projects list: its orbit, its lines read from its file. Absent: adding a new one. */
  project?: SavedProject;
}

/** A saved project's repo is its own: picking it derives the remote, and proposes nothing. */
const NO_PROPOSAL = () => undefined;

/**
 * /start's one state: the probe stream, the repo's derive, the stack's run, the pending action and the chat, folded
 * into the StartView every variant renders. The steps are derived here on every render, never stored; the selected
 * step follows the current one until the person picks another, and follows again once the current one moves on.
 * With a saved `project` the repo is its root (derived once, on mount), the stack and save steps read its file, and the
 * machine and GitLab steps are probed as for a new one. The screen keys this hook by project, so a switch starts over.
 */
export function useStart({ facts, repos, note, local, project }: StartProps): StartView {
  const router = useRouter();
  const probe = useProbe(facts);
  const stack = useStack();
  const repo = useRepo(project ? NO_PROPOSAL : stack.pick);
  const root = project?.root;
  const pickRepo = repo.pick;
  useEffect(() => {
    if (root) pickRepo(root);
  }, [root, pickRepo]);
  const [typed, setTyped] = useState<string>();
  const [picked, setPicked] = useState<{ step: StepKey; at: StepKey } | null>(null);
  const recheck = probe.recheck;
  // A done action re-probes, refreshes the layout's gate (a server read) and re-reads the host's screen showing (its
  // repos, so a saved one reads Onboarded; under the gate, the screen the gate stood over).
  const onDone = useCallback(() => {
    recheck();
    router.refresh();
    hostRevalidate();
  }, [recheck, router]);
  const { pending, run: runAction } = usePending(stack.saveIt, onDone);

  const a = stack.answer;
  const own = project ? savedStack(project) : null;
  const groups = own ? own.groups : a ? checklist(a.proposal, stack.results.map((r) => r?.result), stack.running, a.ciFiles) : [];
  const t = tally(groups);
  const repoRoot = root ?? repo.picked;
  const savedAt = project ? savedDay(project.onboardedAt) : undefined;
  const input = {
    facts,
    probe: { state: probe.state, running: probe.running, sinceS: probe.sinceS },
    repo: { local, note, picked: repoRoot, name: project?.name ?? repoOf(repos ?? [], repoRoot)?.name, deriving: repo.deriving, derive: repo.answer, error: repo.error, sinceS: repo.sinceS },
    typedGroup: typed,
    stack: project
      ? { phase: 'saved' as const, tally: t, running: null, total: t.total, elapsedS: 0, slug: project.slug, savedAt }
      : { phase: stack.phase, tally: t, running: stack.running, total: a?.proposal.probes.length ?? 0, elapsedS: stack.elapsedS, error: stack.error, slug: stack.slug },
  };
  const steps = deriveSteps(input);
  const current = currentOf(steps);
  const host = repo.answer?.host ?? facts.host;
  const chat = useChat(snapshotOf(steps, facts, { repo: repoRoot, host, groupId: targetGroup(input) }), (action) => runAction(action, null));

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
    repo: { repos, picked: repoRoot, note, pick: repo.pick },
    stack: { groups, tally: t, phase: input.stack.phase, error: input.stack.error, slug: input.stack.slug, engine: a ? engineLine(a.engine, a.ms) : undefined, rerun: stack.rerun, save: stack.saveIt },
    project: project && { slug: project.slug, name: project.name, root: project.root, savedAt: savedAt ?? '' },
    chat,
    path: chat.open ? 'assist' : 'hand',
    setPath: (p) => {
      if ((p === 'assist') !== chat.open) chat.toggle();
    },
  };
}
