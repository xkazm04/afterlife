'use client';

import { useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { NODES } from '../model/nodes';
import type { NodeKey, NodeRead, NodeState } from '../model/types';
import styles from './wire.module.css';

const WORD: Record<NodeState, string> = { pass: 'passes', fail: 'blocked', wait: 'waits', unknown: 'not probed' };
const GLYPH: Record<NodeState, string> = { pass: '✓', fail: '✕', wait: '…', unknown: '?' };

/**
 * The wire: six nodes left to right, from this machine through GitLab to Afterlife, joined by segments that light only
 * where both ends pass. A tab list: ← → move between nodes, the selected node's detail is the tab panel below. Each new
 * probe answer (`round`) replays the light along the wire, node by node (off under reduced motion).
 */
export function Wire({ nodes, selected, onSelect, round, checking, panelId }: {
  nodes: Record<NodeKey, NodeRead>;
  selected: NodeKey;
  onSelect: (k: NodeKey) => void;
  round: number;
  checking: boolean;
  panelId: string;
}) {
  const list = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    const i = NODES.findIndex((n) => n.key === selected);
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? NODES.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const n = NODES[Math.max(0, Math.min(NODES.length - 1, to))];
    if (!n) return;
    onSelect(n.key);
    list.current?.querySelector<HTMLElement>(`[data-node="${n.key}"]`)?.focus();
  };
  return (
    <div ref={list} key={round} className={`${styles.wire} ${checking ? styles.checking : ''}`} role="tablist" aria-label="The wire, this machine to Afterlife" onKeyDown={onKey}>
      {NODES.map((n, i) => {
        const r = nodes[n.key];
        const lit = r.state === 'pass' && (i === 0 || nodes[NODES[i - 1]?.key ?? n.key].state === 'pass');
        return (
          <div key={n.key} className={styles.cell} style={{ '--i': i } as CSSProperties}>
            {i > 0 ? <span className={`${styles.seg} ${lit ? styles.segLit : ''}`} aria-hidden="true" /> : null}
            <button
              type="button"
              role="tab"
              data-node={n.key}
              id={`${panelId}-${n.key}`}
              aria-selected={selected === n.key}
              aria-controls={panelId}
              tabIndex={selected === n.key ? 0 : -1}
              className={styles.node}
              data-state={r.state}
              onClick={() => onSelect(n.key)}
            >
              <span className={styles.where}>
                {i + 1} · {n.where}
              </span>
              <span className={styles.title}>{n.title}</span>
              <span className={styles.state}>
                <span className={styles.glyph} aria-hidden="true">
                  {GLYPH[r.state]}
                </span>
                {WORD[r.state]}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
