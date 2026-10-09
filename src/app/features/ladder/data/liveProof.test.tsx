// Live, the Ladder's proof class of a class comes from the demo catalogue's tracks (DEMO.tracks), not from GitLab: where
// it is shown (the Grant section, the track's header, the promotion rule's mechanical row) it is chipped demo. The
// poll's own ask states the policy's proof class, so a rule read from an ask carries no chip. Demo mode chips nothing.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterAll, describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { HUMAN_KEY } from '@/lib/promotion';
import { demoSource, setDataSource } from '@/server/data';
import { liveSource } from '@/server/data/live/liveSource';
import type { LiveSnapshot } from '@/server/data/live/snapshot';
import { GrantSection } from '../components/inspector/sections/GrantSection';
import { PromotionRule } from '../components/inspector/sections/PromotionRule';
import { loadLadderData } from './loadLadderData';

afterAll(() => setDataSource(null));
const sections = { isOpen: () => true, setOpen: () => undefined };
const cls = { ...DEMO.actionClasses[0]!, pending: null };
const promotion = { kind: 'notyet' as const, next: 'hands_off' as const, precondition: HUMAN_KEY, rules: [{ name: 'mechanical proof class', value: 'repro', met: false }] };
const DEMO_CHIP = '>demo<';

describe('the proof class, live', () => {
  it('the route says the tracks are the demo catalogue live, and not in demo mode', () => {
    setDataSource(demoSource);
    expect(loadLadderData().illustrative.tracks).toBe(false);
    const snap = { at: new Date(), deep: 'ledgerline', data: { ...DEMO, tasks: [], events: [], needsYou: [], policy: null, tiersStale: null, pairing: null } } as unknown as LiveSnapshot;
    setDataSource(liveSource(() => snap));
    expect(loadLadderData().illustrative.tracks).toBe(true);
  });
  it('is chipped demo in the Grant section and the mechanical rule row when it comes from the tracks', () => {
    const grant = (proofDemo: boolean) => renderToString(createElement(GrantSection, { cls, proofClass: 'repro', proofDemo, sections }));
    expect(grant(true)).toContain(DEMO_CHIP);
    expect(grant(false)).not.toContain(DEMO_CHIP);
    const rule = (proofDemo: boolean) => renderToString(createElement(PromotionRule, { promotion, uncounted: false, proofDemo, sections }));
    expect(rule(true)).toContain(DEMO_CHIP);
    expect(rule(false)).not.toContain(DEMO_CHIP);
  });
});
