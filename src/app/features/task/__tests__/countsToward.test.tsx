// Every inspector section that can be empty says what is not held; "Counts toward" printed nothing.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { TaskInspector } from '../components/inspector/TaskInspector';
import { loadTasks } from '../model/build/loadTasks';

const held = loadTasks().find((t) => t.countsToward)!;
const props = { clock: { ageSec: null, now: null }, sel: null, open: { words: false }, onOpen: () => undefined };
const text = (task: typeof held) =>
  renderToStaticMarkup(createElement(ToastProvider, null, createElement(TaskInspector, { task, ...props }))).replace(/<[^>]+>/g, ' ');

describe('the "Counts toward" section', () => {
  it('shows the record line a task holds', () => {
    expect(text(held)).toContain(held.countsToward);
  });
  it('says so when the task holds none', () => {
    expect(text({ ...held, countsToward: '' })).toContain('No record line is held for this task');
  });
});
