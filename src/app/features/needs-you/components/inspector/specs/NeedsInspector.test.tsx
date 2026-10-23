// Every decision kind has a view; an unknown id (a gap id the demo does not hold among them) says so, a gap id gets the gap view.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../../data/pick';
import { initialState } from '../../../model/state';
import { NeedsInspector } from '../NeedsInspector';

const demo = pickNeedsYouDemo();
const html = (id: string) => renderToStaticMarkup(<NeedsInspector id={id} s={{ ...initialState(demo), sel: id }} demo={demo} leftSec={0} dispatch={() => {}} />);

describe('NeedsInspector', () => {
  it('renders a view for each decision key, none of them the fallback', () => {
    for (const id of ['n1', 'n2', 'n4', 'n5']) expect(html(id)).not.toContain('No such decision');
  });

  it('keeps the fallback for ids that are not decisions, including inherited object keys and a gap the demo does not hold', () => {
    for (const id of ['n9', 'toString', 'h1', 'g99']) expect(html(id)).toContain('No such decision');
  });
});
