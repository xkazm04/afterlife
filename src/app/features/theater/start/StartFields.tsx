'use client';

import { useId } from 'react';
import { Checkbox } from '@/components/controls/Checkbox';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { RUN_BOUNDS, RUN_IDEAS, type RunBranch, type RunIdea, type StartRepo } from '@/server/actions/runs/start/types';
import { baseChoices, MODELS, type BranchKind, type StartForm } from './model/form';
import styles from './start.module.css';

const IDEA_WORDS: Record<RunIdea, string> = {
  scan: "scan: the engine's model-free scan of the checkout; its rungs at 0 or unknown",
  'lens-scan': "lens-scan: the open proposals in the repo's .ai/lens-scan/scan.db",
};

const range = ([a, b]: readonly [number, number]): number[] => Array.from({ length: b - a + 1 }, (_, k) => a + k);

/** Each choice's own words, the picked one first-class: the panel says what a choice does before it is made. */
function Says({ rows, picked }: { rows: [string, string, string][]; picked: string }) {
  return (
    <dl className={styles.says}>
      {rows.map(([v, name, words]) => (
        <div key={v} data-picked={v === picked ? '' : undefined}>
          <dt>{name}</dt>
          <dd>{words}</dd>
        </div>
      ))}
    </dl>
  );
}

const optionWords = (b: RunBranch): string => (b.checkedOutAt ? `${b.name} (checked out at ${b.checkedOutAt})` : b.name);

/** The run's fields. Propose mode disables the branch and caps (a fieldset), and says why. */
export function StartFields({ f, set, repos, repo, branches, branchReason, locked }: {
  f: StartForm;
  set: (patch: Partial<StartForm>) => void;
  repos: readonly StartRepo[];
  repo: StartRepo | undefined;
  branches: readonly RunBranch[];
  branchReason?: string;
  locked: boolean;
}) {
  const propose = f.mode === 'propose';
  const why = useId(); // two panels can be mounted at once (the live film's and the sheet's)
  return (
    <fieldset className={styles.fields} disabled={locked}>
      <label className={styles.row}>
        <span>Repo</span>
        <select value={f.repo} onChange={(e) => set({ repo: e.target.value })} aria-label="Repo">
          {repos.map((r) => <option key={r.slug} value={r.slug}>{r.slug}</option>)}
        </select>
        {repo ? <span className={styles.dim}>{repo.path}</span> : null}
      </label>
      <div className={styles.group}>
        <span className={styles.name}>Mode</span>
        <SegmentedControl label="Mode" value={f.mode} onChange={(mode) => set({ mode })} options={[{ value: 'propose', label: 'Propose only' }, { value: 'execute', label: 'Execute' }]} />
        <Says picked={f.mode} rows={[['propose', 'Propose only', 'plans the lanes, changes nothing'], ['execute', 'Execute', 'lanes edit, run the gates, commit what passes']]} />
      </div>
      <fieldset className={styles.group} disabled={propose} aria-describedby={propose ? why : undefined}>
        <legend className={styles.name}>Branch</legend>
        <SegmentedControl<BranchKind> label="Branch" value={f.branch} onChange={(branch) => set({ branch })} options={[{ value: 'new', label: 'New branch' }, { value: 'existing', label: 'Existing branch' }]} />
        {f.branch === 'new' ? (
          <label className={styles.row}>
            <span>from</span>
            <select value={f.base} onChange={(e) => set({ base: e.target.value })} aria-label="Base ref">
              {baseChoices(repo, branches).map((b) => <option key={b} value={b}>{b === repo?.base ? `${b} (fleet base)` : b}</option>)}
            </select>
          </label>
        ) : (
          <label className={styles.row}>
            <span>onto</span>
            <select value={f.onto} onChange={(e) => set({ onto: e.target.value })} aria-label="Existing branch">
              <option value="">pick a branch…</option>
              {branches.map((b) => <option key={b.name} value={b.name} disabled={b.checkedOutAt !== undefined}>{optionWords(b)}</option>)}
            </select>
          </label>
        )}
        {branchReason ? <p className={styles.dim}>No branches: {branchReason}</p> : null}
        <Says picked={f.branch} rows={[['new', 'New branch', `each wave gets its own belay/wave-<n>, the first from ${f.base || 'the base'}; you merge it`], ['existing', 'Existing branch', 'lanes commit straight onto it, every wave; a branch checked out in a worktree cannot be picked']]} />
      </fieldset>
      <div className={styles.grid}>
        <label className={styles.row}>
          <span>Waves</span>
          <select value={f.waves} onChange={(e) => set({ waves: Number(e.target.value) })} aria-label="Waves">
            {range(RUN_BOUNDS.waves).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className={styles.row}>
          <span>Lanes</span>
          <select value={f.lanes} onChange={(e) => set({ lanes: Number(e.target.value) })} aria-label="Lanes">
            {range(RUN_BOUNDS.lanes).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className={styles.row}>
          <span>Model</span>
          <select value={f.model} onChange={(e) => set({ model: e.target.value })} aria-label="Model">
            {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>
      <fieldset className={styles.grid} disabled={propose} aria-describedby={propose ? why : undefined}>
        <label className={styles.row}>
          <span>Lane cap $</span>
          <input type="number" min={RUN_BOUNDS.laneCapUsd[0]} max={RUN_BOUNDS.laneCapUsd[1]} step={0.5} value={f.laneCapUsd} onChange={(e) => set({ laneCapUsd: Number(e.target.value) })} aria-label="Lane cap in USD" />
        </label>
        <label className={styles.row}>
          <span>Wave cap $</span>
          <input type="number" min={RUN_BOUNDS.waveCapUsd[0]} max={RUN_BOUNDS.waveCapUsd[1]} step={1} value={f.waveCapUsd} onChange={(e) => set({ waveCapUsd: Number(e.target.value) })} aria-label="Wave cap in USD" />
        </label>
      </fieldset>
      {propose ? <p id={why} className={styles.dim}>Branch and caps: propose changes nothing, so it takes neither.</p> : null}
      <div className={styles.group}>
        <span className={styles.name}>Ideas for the plan</span>
        {RUN_IDEAS.map((i) => (
          <span key={i} className={styles.row}>
            <Checkbox label={i} checked={f.ideas.includes(i)} onChange={(on) => set({ ideas: RUN_IDEAS.filter((x) => (x === i ? on : f.ideas.includes(x))) })} />
            <span>{IDEA_WORDS[i]}</span>
          </span>
        ))}
      </div>
    </fieldset>
  );
}
