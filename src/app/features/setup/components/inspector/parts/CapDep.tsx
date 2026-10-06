'use client';

import { CAP_SHORT } from '../../../data/capabilities';
import { useSetup } from '../../../hooks/SetupContext';
import { capSt } from '../../../model/flow/state';
import { capGlyph } from '../../shared/CapGlyph';
import { DepRow } from '../../shared/DepRow';

/** A GitLab capability as a dependency line: its doctor glyph, short name, and status word. */
export function CapDep({ name }: { name: string }) {
  const { state, view } = useSetup();
  const st = capSt(state, name);
  const tone = st === 'available' ? 'met' : st === 'unknown' ? 'unknown' : 'no';
  return <DepRow tone={tone} glyph={capGlyph(st)} label={CAP_SHORT[name] ?? name} state={st} onGo={() => view.go({ k: 'cap', id: name })} />;
}
