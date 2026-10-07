'use client';

import { useSetup } from '../../../hooks/SetupContext';
import { isHumanGate, stepDetail } from '../../../model/flow/state';
import { DepRow } from '../../shared/DepRow';

/** A step as a dependency line: probed, needs you (unread when no read was made), or to do. Click goes to it. */
export function StepDep({ n }: { n: number }) {
  const { state, view } = useSetup();
  const s = state.steps[n];
  if (!s) return null;
  const go = () => view.go({ k: 'step', id: n });
  if (s.st === 'done') return <DepRow tone="met" glyph="✓" label={`Step ${n} · ${s.title}`} state="probed" onGo={go} />;
  if (isHumanGate(s)) {
    const st = s.st === 'unknown' ? 'needs you · unread' : s.st === 'failed' ? 'needs you · not yet' : 'needs you';
    return <DepRow tone="you" glyph={s.st === 'unknown' ? '?' : n} label={stepDetail(state, n)?.short ?? s.title} state={st} onGo={go} />;
  }
  if (s.st === 'unknown') return <DepRow tone="unknown" glyph="?" label={`Step ${n} · ${s.title}`} state="unknown" onGo={go} />;
  if (s.st === 'failed') return <DepRow tone="no" glyph={n} label={`Step ${n} · ${s.title}`} state="not yet" onGo={go} />;
  return <DepRow glyph={n} label={`Step ${n} · ${s.title}`} state="to do" onGo={go} />;
}
