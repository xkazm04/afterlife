// The panel that decides how a step is done: probed, a human's gate, a secret to type, or an agent's write. Live mode
// never sends a write from here, and "say so" exists only for a step no read can see.
import { describe, expect, it, vi } from 'vitest';
import { StepPanel } from '../../StepPanel';
import { stepDetail, stepList } from '../../../../model/flow/state';
import type { SetupState } from '../../../../model/types';
import { base, buttonTag, isDisabled, renderPanel, withStep } from './panelHarness';

vi.mock('next/navigation', () => ({ usePathname: () => '/setup/step-0', useRouter: () => ({ push: () => {} }) }));

const demo = base();
const live = (s: SetupState): SetupState => ({ ...s, live: true });
const pick = (s: SetupState, f: (d: NonNullable<ReturnType<typeof stepDetail>>) => boolean) => stepList(s).find((x) => f(stepDetail(s, x.n)!))!.n;
const agent = pick(demo, (d) => d.who === 'agent' && !!d.cmd);
const human = pick(demo, (d) => d.who === 'human' && !d.secret);
const secret = pick(demo, (d) => d.who === 'human' && !!d.secret);
const unread = pick(live(demo), (d) => d.who === 'human' && !!d.unread);
const html = (s: SetupState, n: number) => renderPanel(<StepPanel n={n} />, s).html;

describe('StepPanel: a step the state does not hold renders nothing', () => {
  it('is empty', () => expect(html(demo, 999)).not.toContain('Last probe'));
});

describe('StepPanel: done', () => {
  it('says probed and offers no action', () => {
    const out = html(withStep(demo, human, { st: 'done' }), human);
    expect(out).toContain('probed');
    expect(out).not.toContain('Do this');
    expect(out).not.toContain('Next write');
    expect(out).not.toContain('I did it');
  });
});

describe('StepPanel: a human step', () => {
  it('opens GitLab and verifies; a probing step cannot be verified twice', () => {
    const open = html(withStep(demo, human, { st: 'human' }), human);
    expect(open).toContain('Do this');
    expect(open).toContain('only you');
    expect(buttonTag(open, 'Open in GitLab')).not.toBeNull();
    expect(isDisabled(buttonTag(open, 'I did it · verify'))).toBe(false);
    expect(isDisabled(buttonTag(html(withStep(demo, human, { st: 'probing' }), human), 'I did it · verify'))).toBe(true);
  });
  it('a secret step shows the command to copy, never an Open button', () => {
    const out = html(withStep(demo, secret, { st: 'human' }), secret);
    expect(out).toContain('Belay never sees it');
    expect(buttonTag(out, 'Open in GitLab')).toBeNull();
    expect(out).toMatch(/Copy( command| 1)/);
  });
  it('"say so" is offered only live, for an unread step that is unknown; a said step offers it back', () => {
    const l = live(demo);
    expect(buttonTag(html(withStep(l, unread, { st: 'unknown' }), unread), 'I did it · say so')).not.toBeNull();
    expect(buttonTag(html(withStep(demo, unread, { st: 'unknown' }), unread), 'I did it · say so')).toBeNull();
    expect(buttonTag(html(withStep(l, unread, { st: 'human' }), unread), 'I did it · say so')).toBeNull();
    const said = html(withStep(l, unread, { st: 'unknown', said: '14:30' }), unread);
    expect(buttonTag(said, 'Take it back')).not.toBeNull();
    expect(said).toContain('you said done 14:30 · not read');
  });
});

describe('StepPanel: an agent step', () => {
  it('demo: Send as you and Skip', () => {
    const out = html(withStep(demo, agent, { st: 'failed' }), agent);
    expect(out).toContain('preview · nothing sent');
    expect(isDisabled(buttonTag(out, 'Send as you'))).toBe(false);
    expect(buttonTag(out, 'Skip')).not.toBeNull();
    expect(buttonTag(out, 'Read again')).toBeNull();
    expect(isDisabled(buttonTag(html(withStep(demo, agent, { st: 'probing' }), agent), 'Send as you'))).toBe(true);
  });
  it('live: never Send as you; Copy and Read again instead', () => {
    const out = html(live(withStep(demo, agent, { st: 'failed' })), agent);
    expect(out).toContain('copy · Belay does not send it');
    expect(buttonTag(out, 'Send as you')).toBeNull();
    expect(buttonTag(out, 'Skip')).toBeNull();
    expect(buttonTag(out, 'Copy')).not.toBeNull();
    expect(isDisabled(buttonTag(out, 'Read again'))).toBe(false);
    expect(isDisabled(buttonTag(html(live(withStep(demo, agent, { st: 'probing' })), agent), 'Read again'))).toBe(true);
  });
});
