// A menu button always tells assistive tech whether its menu is open (WAI-ARIA APG menu button).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PopupButton } from '../toolbar/PopupButton';

// Props are typed through a ref-less alias so the children argument form type-checks.
const Btn = PopupButton as (p: { expanded?: boolean }) => ReturnType<typeof PopupButton>;
const render = (expanded?: boolean) => renderToStaticMarkup(createElement(Btn, { expanded }, 'Sort'));

describe('PopupButton aria-expanded', () => {
  it('is false when the caller passes nothing', () => {
    expect(render()).toContain('aria-expanded="false"');
  });

  it('follows the expanded prop', () => {
    expect(render(true)).toContain('aria-expanded="true"');
    expect(render(false)).toContain('aria-expanded="false"');
  });
});
