'use client';

import { useSetup } from '../../../hooks/SetupContext';
import { stepDetail } from '../../../model/flow/state';
import { DepRow } from '../../shared/DepRow';

/** A step as a dependency line: probed, needs you, or to do. Click goes to it. */
export function StepDep({ n }: { n: number }) {
  const { state, view } = useSetup();
  const s = state.steps[n];
  if (!s) return null;
  const go = () => view.go({ k: 'step', id: n });
  if (s.st === 'done') return <DepRow tone="met" glyph="✓" label={`Step ${n} · ${s.title}`} state="probed" onGo={go} />;
  if (s.st === 'human') return <DepRow tone="you" glyph={n} label={stepDetail(state, n)?.short ?? s.title} state="needs you" onGo={go} />;
  if (s.st === 'unknown') return <DepRow tone="unknown" glyph="?" label={`Step ${n} · ${s.title}`} state="unknown" onGo={go} />;
  if (s.st === 'failed') return <DepRow tone="no" glyph={n} label={`Step ${n} · ${s.title}`} state="not yet" onGo={go} />;
  return <DepRow glyph={n} label={`Step ${n} · ${s.title}`} state="to do" onGo={go} />;
}
