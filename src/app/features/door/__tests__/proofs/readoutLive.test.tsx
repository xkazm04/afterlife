import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { demoSource } from '@/server/data/demoSource';
import { Readout } from '../../components/ui/Readout';
import { projectLine, towerLabel } from '../../model/words';

const p = demoSource.getFleet().projects.find((x) => x.id === 'docs-portal')!;
const html = (name: string | null) => renderToStaticMarkup(createElement(Readout, { name, line: projectLine(p), tiers: ['H', null], holders: undefined }));
/** What a screen reader speaks on its own for this readout: live regions that carry the focused control's name. */
const announcers = (h: string) => (h.match(/aria-live=|role="status"/g) ?? []).length;
/** Name and line spoken by browse mode: not hidden from the tree. */
const exposesName = (h: string) => !/aria-hidden="true"[^>]*data-role="door-readout-name"|data-role="door-readout-name"[^>]*aria-hidden="true"/.test(h);

describe('the readout does not say a focused tower twice', () => {
  it('the tower already carries its name and line as its aria-label', () => {
    expect(towerLabel(p)).toContain(p.name);
  });
  it('is no live region: a focus (aria-label) and a pointer sweep add no announcement', () => {
    expect(announcers(html(p.name))).toBe(0);
    expect(announcers(html(null))).toBe(0);
  });
  it('hides the name that the control already says', () => {
    expect(exposesName(html(p.name))).toBe(false);
  });
});
