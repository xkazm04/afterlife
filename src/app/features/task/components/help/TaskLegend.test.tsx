// The legend's key row is hand-written; TASK_KEYMAP (what actionFor answers, what Settings > Keyboard lists) is the ground
// truth. Every key the screen answers must have its cap in the legend.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { capsOf } from '@/lib/keyboard/keymap';
import { TASK_KEYMAP } from '../../model/docket/keys';
import { TaskLegend } from './TaskLegend';

const legendCaps = () => [...renderToStaticMarkup(createElement(TaskLegend)).matchAll(/<kbd[^>]*>(.*?)<\/kbd>/g)].map((m) => m[1]);

describe('TaskLegend', () => {
  it('shows a cap for every key in TASK_KEYMAP', () => {
    const caps = legendCaps();
    expect(caps.length).toBeGreaterThan(0);
    const missing = TASK_KEYMAP.entries.flatMap((e) => capsOf(e.keys).filter((c) => !caps.includes(c)).map((c) => `${e.id}:${c}`));
    expect(missing).toEqual([]);
  });
});
