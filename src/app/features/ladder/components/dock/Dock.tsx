'use client';

import type { Ref } from 'react';
import { Kbd } from '@/components/controls/Kbd';
import help from '@/components/overlays/HelpButton.module.css';
import { CommandDock } from '@/components/shell/dock/CommandDock';
import { DockKey } from '@/components/shell/dock/DockKey';
import { DockText } from '@/components/shell/dock/DockText';
import { TIER_META } from '@/lib/tiers';
import type { DockModel } from '../../model/rules/dock';

function Line({ model }: { model: DockModel }) {
  switch (model.kind) {
    case 'none':
      return (
        <>
          select a class · <DockText tone="prompt">r</DockText> revokes one step
        </>
      );
    case 'group':
      return (
        <>
          <b>
            {model.id} {model.key}
          </b>{' '}
          · select a class · <DockText tone="prompt">r</DockText> revokes one step
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
          <DockText tone="prompt">{model.previewing ? '↵' : 'r'} ▸</DockText> <b>{model.id}</b> → {TIER_META[model.to].name} · git commit -am &quot;{model.msg}&quot; &amp;&amp; git
          push origin main <DockText tone="note">(belay-policy, as you)</DockText>
        </>
      );
  }
}

/** The docked strip: the exact write `r` (or the highlighted menu item) would run, and the keys. */
export function Dock({ model, onHelp, helpRef }: { model: DockModel; onHelp: () => void; helpRef: Ref<HTMLButtonElement> }) {
  return (
    <CommandDock line={<Line model={model} />} title={model.kind === 'write' ? model.cmd.join('\n') : undefined}>
      <DockKey>
        <Kbd>j</Kbd>
        <Kbd>k</Kbd> move
      </DockKey>
      <DockKey>
        <Kbd>r</Kbd> revoke
      </DockKey>
      <DockKey optional>
        <Kbd>q</Kbd> quarantine
      </DockKey>
      <DockKey optional>
        <Kbd>p</Kbd> promote
      </DockKey>
      <DockKey optional>
        <Kbd>↵</Kbd> open
      </DockKey>
      <button ref={helpRef} type="button" className={help.help} title="Keys and legend (?)" aria-label="Keys and legend" aria-haspopup="dialog" onClick={onHelp}>
        ?
      </button>
    </CommandDock>
  );
}
