// After a done live confirm the refresh drops the acted proposal from the list (only open ones are listed); the response's
// answer, with the MR it named, must stay on screen. No DOM here, so the view is rendered for a given state of the acts.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { NeedsYouItem } from '@/lib/demo';

vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
const { NeedsYouLiveView } = await import('./NeedsYouLive');

const acted: NeedsYouItem = { id: 'promote:p:qa.file-bug', kind: 'promote', title: 'Promote T7 qa · qa.file-bug', to: 'hands_off', does: 'Opens a policy MR.' };
const other: NeedsYouItem = { id: 'readmit:p:patch-bump', kind: 'readmit', title: 'Re-admit T8 gardener · patch-bump', does: 'Re-admits.' };

const acts = (answers: Record<string, { status: 'done' | 'failed'; text: string }>, sent: Record<string, NeedsYouItem>) => ({
  sel: null, select: () => {}, intentOf: () => null, views: {}, answers, sent, sending: null, run: () => {}, retry: () => {},
});
const done = { status: 'done' as const, text: 'Done · qa.file-bug → Hands-off · !22' };

describe('live Needs you keeps what was sent', () => {
  it('names the response\'s MR after the refresh drops the acted item from the list', () => {
    const out = renderToStaticMarkup(<NeedsYouLiveView items={[other]} seeded={0} acts={acts({ [acted.id]: done }, { [acted.id]: acted })} />);
    expect(out).toContain('Sent this session');
    expect(out).toContain('Promote T7 qa · qa.file-bug');
    expect(out).toContain('!22');
  });

  it('shows the answer once while the item is still listed, and nothing extra on the failed path', () => {
    const still = renderToStaticMarkup(<NeedsYouLiveView items={[acted, other]} seeded={0} acts={acts({ [acted.id]: done }, { [acted.id]: acted })} />);
    expect(still).not.toContain('Sent this session');
    const failed = renderToStaticMarkup(<NeedsYouLiveView items={[acted]} seeded={0} acts={acts({ [acted.id]: { status: 'failed', text: 'Failed · x' } }, {})} />);
    expect(failed).not.toContain('Sent this session');
    expect(failed).toContain('Promote T7 qa · qa.file-bug');
  });
});
