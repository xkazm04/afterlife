'use client';

import { writeClip } from '@/lib/clipboard/copyCommand';
import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import { CommandBlock, type CommandLine } from '@/components/inspector/CommandBlock';
import { nodeOf } from '../model/nodes';
import type { CapRow, NodeKey, NodeRead, TraceFacts } from '../model/types';
import styles from './detail.module.css';

const SAW: Record<NodeRead['state'], string> = { pass: 'Passes', fail: 'Blocked', wait: 'Waits', unknown: 'Not probed' };

const plain = (lines: readonly CommandLine[]): string =>
  lines.flatMap((l) => (typeof l === 'string' ? [l] : l.code ? [l.code] : [])).join('\n');

/**
 * The selected node, as the wire's tab panel: what the re-check reads, what it saw and when, the exact command to copy
 * (Afterlife never runs it), and whether the server must restart. The doctor's node lists its eleven rows.
 */
export function NodeDetail({ id, node, read, facts, caps, at, checking, onRecheck }: {
  id: string;
  node: NodeKey;
  read: NodeRead;
  facts: TraceFacts;
  caps: CapRow[] | null;
  at: string | null;
  checking: boolean;
  onRecheck: () => void;
}) {
  const n = nodeOf(node);
  const lines = n.commands({ host: facts.host, groupId: facts.groupId });
  const text = plain(lines);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void writeClip(text, navigator.clipboard).then((r) => setCopied(r.ok));
  };
  return (
    <section id={id} role="tabpanel" aria-labelledby={`${id}-${node}`} className={styles.panel}>
      <div className={styles.main}>
        <h2 className={styles.h}>{n.title}</h2>
        <p className={styles.saw} data-state={read.state}>
          <b>{SAW[read.state]}</b> {read.line}
          {at ? <span className={styles.at}> · probed {at}</span> : null}
        </p>
        <p className={styles.probe}>Re-check reads: {n.probe}.</p>
        <CommandBlock commands={lines} label={`Command for ${n.title}`} />
        <div className={styles.row}>
          {text ? (
            <Button variant="ghost" onClick={copy} onBlur={() => setCopied(false)}>
              {copied ? 'Copied' : 'Copy command'}
            </Button>
          ) : null}
          <Button variant="accent" onClick={onRecheck} aria-busy={checking}>
            {`Re-check ${n.title}`}
          </Button>
          {checking ? <span className={styles.at} role="status">probing…</span> : null}
          {node === 'setup' ? (
            <Button variant="default" href="/setup">
              Open the unlock map
            </Button>
          ) : null}
        </div>
        {n.restart ? (
          <p className={styles.restart}>
            This is the server&apos;s environment: stop it, set the variable, start it again. Afterlife reads env only at start, and changes none.
          </p>
        ) : null}
      </div>
      {node === 'doctor' || node === 'group' ? <Caps caps={caps} /> : null}
    </section>
  );
}

function Caps({ caps }: { caps: CapRow[] | null }) {
  return (
    <div className={styles.caps}>
      <h3 className={styles.capsH}>belay doctor · 11 capabilities</h3>
      {caps ? (
        <ul className={styles.capList}>
          {caps.map((c) => (
            <li key={c.id} data-status={c.status} title={c.reason}>
              <span className={styles.capMark} aria-hidden="true">
                {c.status === 'available' ? '✓' : c.status === 'unavailable' ? '✕' : '?'}
              </span>
              {c.label}
              <span className={styles.capWord}>{c.status}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.probe}>The doctor runs once glab, the network and the login pass. Until then every row is unknown, never counted.</p>
      )}
    </div>
  );
}
