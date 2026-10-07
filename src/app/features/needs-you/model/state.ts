import type { NeedsYouDemo } from '../data/types';
import { HIST_GROUP } from './rows/grouping';
import type { NeedsState, Notice } from './types';

/** The screen as the prototype opens it: By kind, the legal clock selected, the outbox empty, history collapsed. */
export function initialState(demo: NeedsYouDemo): NeedsState {
  return {
    group: 'kind',
    show: 'all',
    query: '',
    sel: 'n2',
    collapsed: [HIST_GROUP],
    sections: {},
    outboxOpen: true,
    itemsShut: [],
    status: { n1: 'open', n2: 'open', n4: 'open', n5: 'open' },
    read: { draft: false, note: false },
    gaps: Object.fromEntries(demo.gaps.map((g) => [g.id, g.picked])),
    gapStatus: {},
    out: [],
    sent: [],
    session: [],
    runner: { opened: false, check: null },
    submitted: false,
    writes: {},
    notice: null,
    reveal: null,
  };
}

/** Attach a message. Every call gets a new id, so the screen shows each one exactly once. */
export function notify(s: NeedsState, channel: Notice['channel'], text: string): NeedsState {
  return { ...s, notice: { id: (s.notice?.id ?? 0) + 1, channel, text } };
}

/** Ask the screen to open the inspector on a section (once per id). */
export function revealSection(s: NeedsState, key: string): NeedsState {
  return { ...s, sections: { ...s.sections, [key]: true }, reveal: { id: (s.reveal?.id ?? 0) + 1, key } };
}
