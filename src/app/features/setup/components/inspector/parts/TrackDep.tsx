'use client';

import { useSetup } from '../../../hooks/SetupContext';
import { DepRow } from '../../shared/DepRow';

/** A track as a dependency line: its id and name, its arm state on the right. */
export function TrackDep({ id, state }: { id: string; state?: string }) {
  const { state: s, tracks, view } = useSetup();
  const a = s.arm[id];
  if (!a) return null;
  const tone = a.st === 'armed' ? 'met' : a.st === 'ready' ? 'ready' : 'none';
  return <DepRow tone={tone} glyph={a.st === 'armed' ? '✓' : '·'} label={`${id} ${tracks[id]?.name ?? ''}`} state={state ?? a.st} onGo={() => view.go({ k: 'track', id })} />;
}
