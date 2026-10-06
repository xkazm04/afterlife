import { describe, expect, it } from 'vitest';
import { loadTasks } from '../build/loadTasks';
import { NO_FILTERS, classCount, docketCount, idAfterFilter, statusLine, stepTask, toggleFailOnly, verdictCounts, visibleTasks } from './filters';
import { actionFor } from './keys';

const tasks = loadTasks();
const idle = { inDocket: false, inChrome: false, replaying: false };

describe('filters', () => {
  it('counts verdicts and classes', () => {
    expect(verdictCounts(tasks)).toEqual({ all: 7, pass: 6, fail: 1 });
    expect(classCount(tasks, 'bench-delta')).toBe(1);
    expect(classCount(tasks, 'nope')).toBe(0);
  });

  it('only hides: filters by verdict and by proof class', () => {
    expect(visibleTasks(tasks, NO_FILTERS)).toHaveLength(7);
    expect(visibleTasks(tasks, { verdict: 'FAIL', cls: 'all' }).map((t) => t.id)).toEqual(['01J8Q8']);
    expect(visibleTasks(tasks, { verdict: 'PASS', cls: 'repro' }).map((t) => t.id)).toEqual(['01J8QA']);
    expect(visibleTasks(tasks, { verdict: 'FAIL', cls: 'repro' })).toEqual([]);
  });

  it('toggles fail-only with the f key', () => {
    const on = toggleFailOnly(NO_FILTERS);
    expect(on.verdict).toBe('FAIL');
    expect(toggleFailOnly(on)).toEqual(NO_FILTERS);
    expect(toggleFailOnly({ verdict: 'PASS', cls: 'repro' })).toEqual({ verdict: 'FAIL', cls: 'repro' });
  });

  it('steps through the visible tasks and wraps', () => {
    expect(stepTask(tasks, '01J8Q4', 1)).toBe('01J8Q9');
    expect(stepTask(tasks, '01J8Q4', -1)).toBe('01J8Q7');
    expect(stepTask(tasks, '01J8Q7', 1)).toBe('01J8Q4');
    expect(stepTask([], '01J8Q4', 1)).toBeNull();
    const fails = visibleTasks(tasks, { verdict: 'FAIL', cls: 'all' });
    expect(stepTask(fails, '01J8Q4', 1)).toBe('01J8Q8');
  });

  it('moves to the first visible task when the open one is filtered out', () => {
    const fails = visibleTasks(tasks, { verdict: 'FAIL', cls: 'all' });
    expect(idAfterFilter(fails, '01J8Q4')).toBe('01J8Q8');
    expect(idAfterFilter(fails, '01J8Q8')).toBeNull();
    expect(idAfterFilter([], '01J8Q4')).toBeNull();
  });

  it('words the docket count and the status line', () => {
    expect(docketCount(7, 7)).toBe('7');
    expect(docketCount(2, 7)).toBe('2 / 7');
    expect(statusLine(tasks, 12, '14:22')).toBe('7 tasks · 1 fail · ledger read 12 s ago · 14:22 · reads only');
    expect(statusLine(visibleTasks(tasks, { verdict: 'FAIL', cls: 'all' }), 12, '14:22')).toContain('1 task · 1 fail');
  });
});

describe('key map', () => {
  it('maps the single keys', () => {
    expect(actionFor(']', idle)).toEqual({ type: 'step', delta: 1 });
    expect(actionFor('[', idle)).toEqual({ type: 'step', delta: -1 });
    expect(actionFor('r', idle)).toEqual({ type: 'replay' });
    expect(actionFor('w', idle)).toEqual({ type: 'words' });
    expect(actionFor('f', idle)).toEqual({ type: 'failOnly' });
    expect(actionFor('Escape', idle)).toEqual({ type: 'escape' });
    expect(actionFor('x', idle)).toBeNull();
  });

  it('uses up/down to step tasks in the docket and to walk the court elsewhere', () => {
    expect(actionFor('ArrowDown', { ...idle, inDocket: true })).toEqual({ type: 'step', delta: 1 });
    expect(actionFor('ArrowUp', { ...idle, inDocket: true })).toEqual({ type: 'step', delta: -1 });
    expect(actionFor('ArrowDown', idle)).toEqual({ type: 'arrow', key: 'ArrowDown' });
    expect(actionFor('ArrowLeft', { ...idle, inDocket: true })).toEqual({ type: 'arrow', key: 'ArrowLeft' });
  });

  it('leaves the arrows alone in the toolbar and inspector, and during a replay', () => {
    expect(actionFor('ArrowDown', { ...idle, inChrome: true })).toBeNull();
    expect(actionFor('ArrowRight', { ...idle, replaying: true })).toBeNull();
    expect(actionFor('r', { ...idle, replaying: true })).toEqual({ type: 'replay' });
  });
});
