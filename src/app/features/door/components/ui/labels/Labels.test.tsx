// A district label lit by focus goes dark when focus leaves it, as it does when the pointer leaves (and as the city's
// towers do since sceneBlur.test.tsx): otherwise a keyboard user tabbing on to the answer keeps a district lit.
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { demoSource } from '@/server/data/demoSource';
import { districtsOf } from '../../../model/city';
import { Labels } from './Labels';

type Props = Record<string, (() => void) | undefined>;

describe('Labels', () => {
  it('reports the hover on focus and clears it on blur, the last focus winning', () => {
    const f = demoSource.getFleet();
    const seen: (number | null)[] = [];
    const render = (Labels as unknown as { type: (p: unknown) => ReactElement<{ children: ReactElement<Props>[] }> }).type;
    const el = render({ ds: districtsOf(f.groups, f.projects), hotG: null, tabbable: true, onHover: (gi: number | null) => seen.push(gi), onOpen: () => undefined });
    const [a, b] = el.props.children;
    a!.props.onFocus?.();
    a!.props.onBlur?.();
    b!.props.onFocus?.();
    b!.props.onBlur?.();
    expect(seen).toEqual([0, null, 1, null]);
  });
});
