// The band's buttons follow the sign-off's status. "Ready to sign" means a person read the draft, so the button is off
// until they did (the reducer refuses the stage too: model/act.ts stage-n2); Belay never submits, a person says so.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import { initialState } from '../../model/state';
import type { NeedsState } from '../../model/types';
import { BandSide } from './BandSide';

const base = initialState(pickNeedsYouDemo());
const html = (patch: Partial<NeedsState> & { n2?: NeedsState['status']['n2'] }) => {
  const { n2, ...rest } = patch;
  return renderToStaticMarkup(<BandSide s={{ ...base, ...rest, status: { ...base.status, n2: n2 ?? base.status.n2 } }} dispatch={() => {}} />);
};

describe('the band side', () => {
  it('open: Ready to sign is disabled, with the reason, until the draft is read', () => {
    const unread = html({});
    expect(unread).toContain('Read the draft');
    expect(unread).toMatch(/<button[^>]*disabled=""[^>]*title="Read the draft first[^"]*"[^>]*>Ready to sign/);
    const read = html({ read: { ...base.read, draft: true } });
    expect(read).toContain('Draft read ✓');
    expect(read).not.toContain('disabled');
  });

  it('staged: first in line, and can be taken back', () => {
    const out = html({ n2: 'staged' });
    expect(out).toContain('In the outbox, first in line');
    expect(out).toContain('Take it back');
    expect(out).not.toContain('Ready to sign');
  });

  it('sent: ready to sign, and the submit button stays until a person says they submitted', () => {
    expect(html({ n2: 'sent' })).toContain('I submitted it');
    const noted = html({ n2: 'sent', submitted: true });
    expect(noted).toContain('Submission noted on #131');
    expect(noted).not.toContain('I submitted it');
  });
});
