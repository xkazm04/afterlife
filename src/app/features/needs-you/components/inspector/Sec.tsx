import type { ReactNode } from 'react';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { DoesNot } from '../shared/DoesNot';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import type { InspProps } from './props';

/** An inspector section whose open state lives in the screen state (so "Read the draft" can open it). */
export function Sec({ k, title, aux, def = true, p, children }: { k: string; title: ReactNode; aux?: ReactNode; def?: boolean; p: Pick<InspProps, 's' | 'dispatch'>; children: ReactNode }) {
  const open = p.s.sections[k] ?? def;
  return (
    <div id={`insp-${k}`}>
      <InspectorSection title={title} aux={aux} open={open} onOpenChange={(o) => p.dispatch({ type: 'section', key: k, open: o })}>
        {children}
      </InspectorSection>
    </div>
  );
}

/** "The click": what the button does and what it will not do. */
export function ClickSec({ k, p, does, doesNot }: { k: string; p: Pick<InspProps, 's' | 'dispatch'>; does: readonly string[]; doesNot: readonly string[] }) {
  return (
    <Sec k={k} title="The click" p={p}>
      <DoesNot does={does} doesNot={doesNot} />
    </Sec>
  );
}

/** "Command": the exact commands, shown before anything runs. */
export function CommandSec({ k, p, commands, aux, title = 'Command', def = true }: { k: string; p: Pick<InspProps, 's' | 'dispatch'>; commands: string | readonly string[]; aux?: ReactNode; title?: string; def?: boolean }) {
  return (
    <Sec k={k} title={title} aux={aux} def={def} p={p}>
      <CommandBlock commands={commands} />
    </Sec>
  );
}
