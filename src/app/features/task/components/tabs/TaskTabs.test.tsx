// The tabs under the verdict are a real tab list: each tab names the panel it controls, each panel the tab that labels it,
// one tab is in the tab order (roving tabIndex), and only the open panel draws. The keys' moves are model/tab's stepTab.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TaskTab } from '../../model/tab';
import { loadTasks } from '../../model/build/loadTasks';
import { LedgerPanel } from './LedgerPanel';
import { TaskTabs } from './TaskTabs';

const render = (tab: TaskTab) =>
  renderToStaticMarkup(
    <TaskTabs tab={tab} onTab={() => undefined} aux={{ ledger: 4 }}>
      <p>BODY</p>
    </TaskTabs>,
  );
const attrs = (html: string, role: string) => [...html.matchAll(new RegExp(`<[^>]*role="${role}"[^>]*>`, 'g'))].map((m) => m[0]);
const attr = (tag: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];

describe('TaskTabs', () => {
  it('draws Court | Receipt chain | Ledger, the Court selected by default', () => {
    const html = render('court');
    expect(attrs(html, 'tablist')).toHaveLength(1);
    const tabs = attrs(html, 'tab');
    expect(tabs).toHaveLength(3);
    expect(html.replace(/<[^>]+>/g, '|')).toMatch(/Court\|+Receipt chain\|+Ledger\|+4/);
    expect(tabs.map((t) => attr(t, 'aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((t) => attr(t, 'tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('ties each tab to its panel both ways', () => {
    const html = render('chain');
    const tabs = attrs(html, 'tab');
    const panels = attrs(html, 'tabpanel');
    expect(panels).toHaveLength(3);
    tabs.forEach((t, i) => {
      expect(attr(t, 'aria-controls')).toBe(attr(panels[i]!, 'id'));
      expect(attr(panels[i]!, 'aria-labelledby')).toBe(attr(t, 'id'));
    });
  });

  it('moves the tab stop with the open tab and draws only its panel', () => {
    const html = render('ledger');
    expect(attrs(html, 'tab').map((t) => attr(t, 'tabindex'))).toEqual(['-1', '-1', '0']);
    const panels = attrs(html, 'tabpanel');
    expect(panels.map((p) => /\shidden=""/.test(p))).toEqual([true, true, false]);
    expect(html.match(/BODY/g)).toHaveLength(1);
  });
});

describe('LedgerPanel', () => {
  const task = loadTasks().find((t) => t.ledger.length && t.trace.length)!;
  it('holds the ledger rows as a table and the trace, the lit row marked', () => {
    const html = renderToStaticMarkup(createElement(LedgerPanel, { task, row: 0 }));
    expect(html).toContain('aria-label="Ledger rows"');
    expect(html.match(/<tr\b/g)).toHaveLength(task.ledger.length + 1);
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('trace.jsonl');
  });
  it('says what is not held', () => {
    const html = renderToStaticMarkup(createElement(LedgerPanel, { task: { ...task, ledger: [], trace: [] }, row: null }));
    expect(html).toContain('No ledger rows are held for this task');
    expect(html).toContain('No trace is held for this task');
  });
});
