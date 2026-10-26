'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { StepKey } from '../../model/types';
import type { StartView } from '../../model/view';
import { bandOf, keyOf, segOf } from './nav';
import { useLitRanks } from './useLitRanks';
import { WireDrawer } from './WireDrawer';
import { WireNode } from './WireNode';
import styles from './wire.module.css';

/**
 * Living wire: the eight steps left to right on one wire, banded by place (this machine, GitLab, Afterlife). A light
 * travels into each node while its check runs and a segment fills with a short sweep as its event lands, node by node.
 * The selected node opens a compact drawer right under it (StepBody only). A tab list with manual activation: ← → Home
 * End move focus, Enter opens, Esc closes and returns focus to the node. Under a narrow container it turns vertical.
 */
export function WireVariant({ view }: { view: StartView }) {
  const { steps, selected } = view;
  const [roving, setRoving] = useState<StepKey | null>(null);
  const [open, setOpen] = useState(true);
  const nodes = useRef(new Map<StepKey, HTMLButtonElement>());
  const ranks = useLitRanks(steps);
  const base = useId();
  const tabId = (k: StepKey) => `${base}-tab-${k}`;
  const panelId = `${base}-panel`;
  const at = Math.max(0, steps.findIndex((s) => s.key === selected));
  const step = steps[at];
  const focusKey = roving && steps.some((s) => s.key === roving) ? roving : selected;
  if (!step) return null;

  const focusNode = (k: StepKey) => nodes.current.get(k)?.focus();
  const activate = (k: StepKey) => {
    view.select(k);
    setRoving(null);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setRoving(null);
    focusNode(selected);
  };
  const onKey = (e: KeyboardEvent) => {
    const i = steps.findIndex((s) => s.key === focusKey);
    const move = keyOf(e.key, i, steps.length);
    if (!move) return;
    e.preventDefault();
    if (move === 'close') return close();
    const to = move === 'open' ? steps[i] : steps[move.to];
    if (!to) return;
    if (move === 'open') return activate(to.key);
    setRoving(to.key);
    focusNode(to.key);
  };

  return (
    <div className={styles.root}>
      <div className={styles.wire}>
        <div className={styles.tabs} role="tablist" aria-label="Setup steps, this machine to Afterlife" onKeyDown={onKey}>
          {steps.map((s, i) => (
            <WireNode
              key={s.key}
              step={s}
              i={i}
              seg={segOf(steps, i)}
              rank={ranks[i] ?? 0}
              band={bandOf(steps, i)}
              selected={s.key === selected}
              open={open}
              tabbable={s.key === focusKey}
              tabId={tabId(s.key)}
              panelId={panelId}
              onPress={() => (s.key === selected && open ? close() : activate(s.key))}
              nodeRef={(el) => {
                if (el) nodes.current.set(s.key, el);
                else nodes.current.delete(s.key);
              }}
            />
          ))}
        </div>
        <WireDrawer view={view} step={step} at={at} n={steps.length} open={open} id={panelId} tabId={tabId(step.key)} onEscape={close} />
      </div>
    </div>
  );
}
