// The Display page's size buttons carry a tooltip. It states the body size per choice, read from TEXT_SIZE_SPEC (the
// table below the buttons uses the same numbers), and names the default from DEFAULT_TEXT_SIZE, never a typed copy.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TEXT_SIZE, TEXT_SIZES, TEXT_SIZE_LABEL, TEXT_SIZE_SPEC } from '@/lib/settings/textSize';
import { TextSizeSection } from '../components/TextSizeSection';

const titles = (html: string): string[] => [...html.matchAll(/<button[^>]*title="([^"]*)"/g)].map((m) => m[1] ?? '');

describe('the text-size buttons', () => {
  const got = titles(renderToString(createElement(TextSizeSection)));
  it.each(TEXT_SIZES)('%s: names its body size from the spec, and only the default says default', (t) => {
    const title = got.find((x) => x.startsWith(TEXT_SIZE_LABEL[t])) ?? '';
    expect(title).toContain(`${TEXT_SIZE_SPEC[t].body} px body`);
    expect(title.includes('default')).toBe(t === DEFAULT_TEXT_SIZE);
  });
});
