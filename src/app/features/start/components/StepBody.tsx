'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/controls/Button';
import { CommandBlock, type CommandLine } from '@/components/inspector/CommandBlock';
import { writeClip } from '@/lib/clipboard/copyCommand';
import type { StartView, StepView } from '../model/view';
import { CheckingLine } from './CheckingLine';
import { AfterSave } from './stack/AfterSave';
import { RepoPicker } from './stack/RepoPicker';
import { StackList } from './stack/StackList';
import styles from './step.module.css';

const plain = (lines: readonly CommandLine[]): string => lines.flatMap((l) => (typeof l === 'string' ? [l] : l.code ? [l.code] : [])).join('\n');

function CopyButton({ text, label = 'Copy command' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button variant="ghost" onClick={() => void writeClip(text, navigator.clipboard).then((r) => setCopied(r.ok))} onBlur={() => setCopied(false)}>
      {copied ? 'Copied' : label}
    </Button>
  );
}

/** No repo named the group: its numeric id, typed, then the same set-setup preview as Run it. */
function GroupInput({ onUse }: { onUse: (id: string) => void }) {
  const [id, setId] = useState('');
  const field = useId();
  const ok = /^\d+$/.test(id.trim());
  return (
    <form
      className={styles.inputRow}
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onUse(id.trim());
      }}
    >
      <label htmlFor={field} className={styles.dim}>
        Group id
      </label>
      <input id={field} className={styles.input} value={id} onChange={(e) => setId(e.target.value)} inputMode="numeric" placeholder="144060371" autoComplete="off" />
      <Button type="submit" variant="accent" disabled={!ok}>
        Use this group
      </Button>
    </form>
  );
}

/**
 * A step's content, the same in every variant: its one line, what is checking now, the step's own controls (the repo
 * picker, the stack checklist, the group id), then Run it (the catalogue action, previewed first) and Copy command (the
 * same step by hand), and "what this checks" behind a disclosure. One line of copy; the detail stays folded.
 */
export function StepBody({ view, step }: { view: StartView; step: StepView }) {
  const text = plain(step.commands);
  const slug = view.stack.slug;
  return (
    <div className={styles.body} data-state={step.state}>
      {/* a check's own line says only what CheckingLine says with its seconds: then CheckingLine stands in for it */}
      {step.checking && step.line === `checking ${step.checking.what}…` ? null : <p className={styles.line}>{step.line}</p>}
      {step.checking ? <CheckingLine checking={step.checking} /> : null}
      {/* a saved project's repo is its own: picking another is adding a project (the Projects list's Add a project) */}
      {step.key === 'repo' && step.state !== 'blocked' && !view.project ? <RepoPicker repo={view.repo} /> : null}
      {step.key === 'repo' && view.project ? <p className={styles.dim}>{view.project.root}</p> : null}
      {step.key === 'stack' && view.repo.picked ? <StackList stack={view.stack} onCopy={(c) => void writeClip(c, navigator.clipboard)} /> : null}
      {step.input === 'group-id' ? <GroupInput onUse={view.setGroup} /> : null}
      {step.commands.length ? <CommandBlock commands={step.commands} label={`Command for ${step.title}`} /> : null}
      <div className={styles.acts}>
        {step.action ? (
          <Button variant="accent" onClick={() => view.run(step.key)} title="Shows the exact command first; runs only on your confirm">
            Run it
          </Button>
        ) : null}
        {text ? <CopyButton text={text} /> : null}
        {step.key === 'save' && slug ? <Button href={`/vitals/${slug}`}>Open its Vitals</Button> : null}
        {step.key === 'unlock' && step.state === 'done' ? (
          <Button variant="accent" href="/setup">
            Open the unlock map
          </Button>
        ) : null}
      </div>
      {step.key === 'save' && slug ? <AfterSave slug={slug} appInsights={view.stack.groups.some((g) => g.lines.some((l) => l.id === 'person:app-insights'))} /> : null}
      {step.detail ? (
        <details className={styles.what}>
          <summary>What this checks</summary>
          <p className={styles.dim}>{step.detail.probe}</p>
          {step.detail.caps?.length ? (
            <ul className={styles.caps} aria-label="The doctor’s capabilities">
              {step.detail.caps.map((c) => (
                <li key={c.id} data-status={c.status} title={c.reason}>
                  <span aria-hidden="true">{c.status === 'available' ? '✓' : c.status === 'unavailable' ? '✕' : '?'}</span> {c.label} <span className={styles.dim}>{c.status}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}
