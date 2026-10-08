'use client';

import type { Ref } from 'react';
import { Kbd } from '@/components/controls/Kbd';
import help from '@/components/overlays/HelpButton.module.css';
import { CommandDock } from '@/components/shell/dock/CommandDock';
import { DockKey } from '@/components/shell/dock/DockKey';
import { DockText } from '@/components/shell/dock/DockText';
import { elide } from '@/components/write/outcome';
import type { WriteEntry } from '@/components/write/useServerWrites';
import { TIER_META } from '@/lib/tiers';
import type { DockModel } from '../../model/rules/dock';

function Line({ model, server }: { model: DockModel; server?: WriteEntry }) {
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
      if (server?.status === 'refused') {
        return (
          <>
            <b>{model.id}</b> → {TIER_META[model.to].name} · <DockText tone="note">the server will not send this: {server.reason}</DockText>
          </>
        );
      }
      if (server?.status === 'preview' && server.preview.commands[0]) {
        return (
          <>
            <DockText tone="prompt">{model.previewing ? '↵' : 'r'} ▸</DockText> <b>{model.id}</b> → {TIER_META[model.to].name} ·{' '}
            {elide(server.preview.commands[0].display).text}{' '}
            <DockText tone="note">({server.preview.mode === 'live' ? 'belay-policy, as you' : 'demo: planned, never executed'})</DockText>
          </>
        );
      }
      return (
        <>
          <DockText tone="prompt">{model.previewing ? '↵' : 'r'} ▸</DockText> <b>{model.id}</b> → {TIER_META[model.to].name} · git commit -am &quot;{model.msg}&quot; &amp;&amp; git
          push origin main <DockText tone="note">(belay-policy, as you)</DockText>
        </>
      );
  }
}

/**
 * The docked strip: the exact write `r` (or the highlighted menu item) would run, and the keys. Once the server has
 * planned it, the strip shows the server's command (its file content folded; the full command is the tooltip).
 */
export function Dock({ model, server, onHelp, helpRef }: { model: DockModel; server?: WriteEntry; onHelp: () => void; helpRef: Ref<HTMLButtonElement> }) {
  const full = server?.status === 'preview' ? server.preview.commands.map((c) => c.display).join('\n') : model.kind === 'write' ? model.cmd.join('\n') : undefined;
  return (
    <CommandDock line={<Line model={model} server={server} />} title={full}>
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
