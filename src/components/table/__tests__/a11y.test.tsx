// What an OutlineTable exposes to assistive tech: every column header has a name, and the filler track after the last
// column (layout only) is hidden from the accessibility tree in the header, the group rows and the rows alike.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Cell } from '../Cell';
import { GroupRow } from '../GroupRow';
import { HeaderCell } from '../HeaderCell';
import { OutlineTable } from '../OutlineTable';
import { Row } from '../Row';
import { RowGroup } from '../RowGroup';

const html = renderToStaticMarkup(
  <OutlineTable
    label="Projects"
    columns="1fr 1fr"
    header={
      <>
        <HeaderCell>Name</HeaderCell>
        <HeaderCell tip="Needs you">
          <svg />
        </HeaderCell>
      </>
    }
  >
    <RowGroup>
      <GroupRow id="ops" label="Ops" expanded>
        <Cell>2</Cell>
      </GroupRow>
      <Row id="a">
        <Cell indent>alpha</Cell>
        <Cell>1</Cell>
      </Row>
    </RowGroup>
  </OutlineTable>,
);

/** The opening tags of the elements carrying `role`. */
const tags = (src: string, role: string): string[] => [...src.matchAll(new RegExp(`<[a-z]+\\b[^>]*role="${role}"[^>]*>`, 'g'))].map((m) => m[0]);
/** The text inside the element whose opening tag is `tag`, tags stripped (one level deep is enough here). */
const textAfter = (src: string, tag: string): string => {
  const rest = src.slice(src.indexOf(tag) + tag.length);
  return rest.slice(0, rest.search(/<\/(?:div|button)>/)).replace(/<[^>]*>/g, '').trim();
};
const rows = (src: string): string[] => src.split('role="row"').slice(1);

describe('OutlineTable accessibility tree', () => {
  it('names every column header (no unnamed filler header)', () => {
    const heads = tags(html, 'columnheader');
    expect(heads).toHaveLength(2);
    for (const h of heads) expect(/aria-label="[^"]+"/.test(h) || textAfter(html, h) !== '').toBe(true);
  });

  it('gives the header, the group row and the row the same number of exposed cells', () => {
    const [head, group, row] = rows(html);
    expect(tags(head!, 'columnheader')).toHaveLength(2);
    expect(tags(group!, 'gridcell')).toHaveLength(2);
    expect(tags(row!, 'gridcell')).toHaveLength(2);
  });

  it('keeps the filler track as a hidden layout cell in every row', () => {
    const fillers = [...html.matchAll(/<div\b[^>]*class="[^"]*fill[^"]*"[^>]*>/g)].map((m) => m[0]);
    expect(fillers).toHaveLength(3);
    for (const f of fillers) {
      expect(f).toContain('aria-hidden="true"');
      expect(f).not.toMatch(/role=/);
    }
  });
});
