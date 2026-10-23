// A track as a dependency line: the word on its right is said for a person, never the state's enum spelled raw.
import { describe, expect, it, vi } from 'vitest';
import type { ArmStatus } from '../../../../model/types';
import { TrackDep } from '../TrackDep';
import { base, renderPanel, withArm } from './panelHarness';

vi.mock('next/navigation', () => ({ usePathname: () => '/setup/track-T4', useRouter: () => ({ push: () => {} }) }));

const row = (st: ArmStatus, mr: string | null = null) => renderPanel(<TrackDep id="T1" />, withArm(base(), 'T1', { st, mr })).html;
/** The right-hand state word: the last span of the row. */
const word = (html: string) => [...html.matchAll(/<span class="[^"]*">([^<]*)<\/span>/g)].at(-1)?.[1];

describe('TrackDep: the state word', () => {
  it('a track the repo does not define reads "not defined yet", not "undefined"', () => {
    expect(word(row('undefined'))).toBe('not defined yet');
  });
  it('a track waiting on your merge names the MR and wears the you tone', () => {
    const html = row('open', '!5');
    expect(word(html)).toBe('merge !5');
    expect(html).toMatch(/<button[^>]*class="[^"]*_you_/);
  });
  it('the plain states keep their word', () => {
    for (const st of ['armed', 'ready', 'locked', 'probing', 'unknown'] as const) expect(word(row(st))).toBe(st);
  });
});
