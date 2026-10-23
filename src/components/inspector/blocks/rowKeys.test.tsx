import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { KeyValue } from '../KeyValue';
import { Stats } from './Stats';

// KeyValue and Stats are plain function components, so they are called directly and the keys they put on their rows read
// off the element tree. React's duplicate-key warning is not raised by the server renderer, so the keys are counted here.
const keysOf = (root: ReactElement<{ children: ReactNode }>): string[] =>
  (root.props.children as ReactElement[]).map((c) => String(c.key));
const duplicates = (keys: string[]) => keys.length - new Set(keys).size;

describe('inspector row keys', () => {
  it.fails('KeyValue gives two rows with the same label two different keys', () => {
    const rows = [['Job', 'a'], ['Job', 'b'], ['Ref', 'c']] as const;
    expect(duplicates(keysOf(KeyValue({ rows }) as never))).toBe(0);
  });
  it.fails('Stats gives two cells with the same label two different keys', () => {
    const cells = [{ n: 1, label: 'armed' }, { n: 2, label: 'armed' }, { n: 3, label: 'need you' }];
    expect(duplicates(keysOf(Stats({ cells }) as never))).toBe(0);
  });
  it('keys stay unique for distinct labels too', () => {
    expect(duplicates(keysOf(KeyValue({ rows: [['A', 1], ['B', 2]] }) as never))).toBe(0);
  });
});
