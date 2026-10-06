'use client';

import { STEP_DETAIL } from '../../../data/stepDetail';
import { useSetup } from '../../../hooks/SetupContext';
import { DepRow } from '../../shared/DepRow';

/** A step as a dependency line: probed, needs you, or to do. Click goes to it. */
export function StepDep({ n }: { n: number }) {
  const { state, view } = useSetup();
  const s = state.steps[n];
  if (!s) return null;
  const go = () => view.go({ k: 'step', id: n });
  if (s.st === 'done') return <DepRow tone="met" glyph="✓" label={`Step ${n} · ${s.title}`} state="probed" onGo={go} />;
  if (s.st === 'human') return <DepRow tone="you" glyph={n} label={STEP_DETAIL[n]?.short ?? s.title} state="needs you" onGo={go} />;
  return <DepRow glyph={n} label={`Step ${n} · ${s.title}`} state="to do" onGo={go} />;
}
