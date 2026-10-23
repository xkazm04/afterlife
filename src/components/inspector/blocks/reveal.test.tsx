import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CommandBlock } from '../CommandBlock';
import { UntrustedText } from '../UntrustedText';
import { DiffBlock } from './DiffBlock';
import { revealControls } from './reveal';

// Trojan Source (CVE-2021-42574): a bidi override or an invisible character makes text read differently from what
// it is. These blocks exist to show a person the exact write or the exact untrusted words before they click.
const RLO = '‮';
const ZWSP = '​';

describe('revealControls', () => {
  it('draws bidi controls and invisible characters as visible code points', () => {
    expect(revealControls(`tier: ${RLO}desivrepus`)).toBe('tier: ⟨U+202E⟩desivrepus');
    expect(revealControls(`git${ZWSP} push`)).toBe('git⟨U+200B⟩ push');
    expect(revealControls('a⁦b⁩c﻿')).toBe('a⟨U+2066⟩b⟨U+2069⟩c⟨U+FEFF⟩');
  });
  it('leaves ordinary text, right-to-left script and emoji joiners as they are', () => {
    for (const s of ['tier: supervised', 'שלום עולם', '👩‍💻', '']) expect(revealControls(s)).toBe(s);
  });
});

describe('the exact-text blocks render no hidden control character', () => {
  const hidden = /[؜​‎‏‪-‮⁠⁦-⁩﻿]/;
  it.each([
    ['UntrustedText', <UntrustedText key="u" source="agent">{`Mark it ${RLO}dessap`}</UntrustedText>],
    ['DiffBlock', <DiffBlock key="d" lines={[['+', `tier: ${RLO}desivrepus`]]} />],
    ['CommandBlock code', <CommandBlock key="c" commands={[`glab mr merge${ZWSP} 12`]} />],
    ['CommandBlock note', <CommandBlock key="n" commands={[{ code: 'x', note: `# as ${RLO}you` }]} />],
  ])('%s', (_name, el) => {
    const html = renderToStaticMarkup(el);
    expect(html).not.toMatch(hidden);
    expect(html).toContain('⟨U+');
  });
});
