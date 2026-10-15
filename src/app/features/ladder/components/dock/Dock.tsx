'use client';

import type { Ref } from 'react';
import { Button } from '@/components/controls/Button';
import { Kbd } from '@/components/controls/Kbd';
import help from '@/components/overlays/HelpButton.module.css';
import { CommandDock } from '@/components/shell/dock/CommandDock';
import { DockKey } from '@/components/shell/dock/DockKey';
import { DockText } from '@/components/shell/dock/DockText';
import { TIER_META } from '@/lib/tiers';
import { commandHead, type DockModel } from '../../model/rules/dock';
import { sentWords, WRITE_HEAD } from '../../model/rules/promote';

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
    case 'write': {
      const v = model.view;
      const lead = (
        <>
          <DockText tone="prompt">{model.previewing ? '↵' : 'r'} ▸</DockText> {WRITE_HEAD.revoke} · <b>{model.id}</b> → {TIER_META[model.to].name} ·{' '}
        </>
      );
      if (!v) return <>{lead}<DockText tone="note">asking Belay for the exact write…</DockText></>;
      if (v.kind === 'refused') return <>{lead}Belay refuses this write: {v.reason}</>;
      const note = v.preview.mode === 'demo' ? '(demo: simulated, nothing is sent)' : '(belay-policy, as you)';
      return (
        <>
          {lead}
          {v.preview.commands.map((c) => commandHead(c.display)).join(' && ')} <DockText tone="note">{note}</DockText>
        </>
      );
    }
    case 'promote': {
      const v = model.view;
      const lead = (
        <>
          <DockText tone="prompt">p ▸</DockText> {model.readmit ? WRITE_HEAD.readmit : WRITE_HEAD.promote} · <b>{model.id}</b> → {TIER_META[model.to].name} ·{' '}
        </>
      );
      if (!v) return <>{lead}<DockText tone="note">asking Belay for the exact write…</DockText></>;
      if (v.kind === 'refused') return <>{lead}Belay refuses this write: {v.reason}</>;
      if (v.kind === 'sent') {
        return (
          <>
            {lead}
            {sentWords(v)}{' '}
            {v.mr && v.url ? (
              <Button href={v.url} size="mini" target="_blank" rel="noreferrer" title={`Open ${v.mr} in GitLab`}>
                Open {v.mr} ↗
              </Button>
            ) : null}
          </>
        );
      }
      const note = v.preview.mode === 'demo' ? '(demo: simulated, nothing is sent)' : '(belay-policy, as you)';
      return (
        <>
          {lead}
          {v.preview.commands.map((c) => commandHead(c.display)).join(' && ')} <DockText tone="note">{note}</DockText>
        </>
      );
    }
  }
}

function fullWrite(model: DockModel): string | undefined {
  if (model.kind === 'idle') return `${model.id} · nothing to revoke: ${model.reason}`;
  if ((model.kind === 'write' || model.kind === 'promote') && model.view?.kind === 'preview') return model.view.preview.commands.map((c) => c.display).join('\n');
  return model.kind === 'promote' && model.view?.kind === 'sent' ? sentWords(model.view) : undefined;
}

/**
 * The docked strip: the exact write `r` (or the highlighted menu item) would run, or the promotion `p` would open, as the
 * server planned it and headed by which write it is, and the keys.
 */
export function Dock({ model, onHelp, helpRef }: { model: DockModel; onHelp: () => void; helpRef: Ref<HTMLButtonElement> }) {
  return (
    <CommandDock line={<Line model={model} />} title={fullWrite(model)}>
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
