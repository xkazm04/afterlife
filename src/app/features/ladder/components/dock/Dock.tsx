'use client';

import type { Ref } from 'react';
import { Kbd } from '@/components/controls/Kbd';
import help from '@/components/overlays/HelpButton.module.css';
import { TIER_META } from '@/lib/tiers';
import type { DockModel } from '../../model/rules/dock';
import styles from './dock.module.css';

// kit-candidate: the prototype's .dock, a command strip docked under a table pane.
function Line({ model }: { model: DockModel }) {
  switch (model.kind) {
    case 'none':
      return <>select a class · <span className={styles.p}>r</span> revokes one step</>;
    case 'group':
      return (
        <>
          <b>
            {model.id} {model.key}
          </b>{' '}
          · select a class · <span className={styles.p}>r</span> revokes one step
        </>
      );
    case 'idle':
      return (
        <>
          <b>{model.id}</b> · nothing to revoke: {model.reason}
        </>
      );
    case 'write':
      return (
        <>
          <span className={styles.p}>{model.previewing ? '↵' : 'r'} ▸</span> <b>{model.id}</b> → {TIER_META[model.to].name} · git commit -am &quot;{model.msg}&quot; &amp;&amp; git push
          origin main <span className={styles.as}>(belay-policy, as you)</span>
        </>
      );
  }
}

/** The docked strip: the exact write `r` (or the highlighted menu item) would run, and the keys. */
export function Dock({ model, onHelp, helpRef }: { model: DockModel; onHelp: () => void; helpRef: Ref<HTMLButtonElement> }) {
  return (
    <div className={styles.dock} aria-live="polite" title={model.kind === 'write' ? model.cmd.join('\n') : undefined}>
      <span className={styles.ln}>
        <Line model={model} />
      </span>
      <span className={styles.keys}>
        <span>
          <Kbd>j</Kbd>
          <Kbd>k</Kbd> move
        </span>
        <span>
          <Kbd>r</Kbd> revoke
        </span>
        <span className={styles.opt}>
          <Kbd>q</Kbd> quarantine
        </span>
        <span className={styles.opt}>
          <Kbd>p</Kbd> promote
        </span>
        <span className={styles.opt}>
          <Kbd>↵</Kbd> open
        </span>
        <button ref={helpRef} type="button" className={help.help} title="Keys and legend (?)" aria-label="Keys and legend" aria-haspopup="dialog" onClick={onHelp}>
          ?
        </button>
      </span>
    </div>
  );
}
