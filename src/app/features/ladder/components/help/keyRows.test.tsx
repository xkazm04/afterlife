// "?" lists the keys the screen it opens on binds. The class page binds r q p; before this, its "?" listed all 8 rows of the
// list's keys, 4 of which (j k, Enter, /, 1-5) do nothing there.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { KEY_ROWS } from '../../data/policy';
import { HelpContent } from './HelpContent';
import { keyRowsFor } from './keyRows';

const means = { human_only: 'h', hands_off: 'h', supervised: 's', assisted: 'a', quarantined: 'q' } as never;
const whats = (rows: typeof KEY_ROWS): string[] => rows.map(([, what]) => what);

describe('the rows of "?" for a screen that binds some keys', () => {
  it('the class page (r q p): those three and Esc, not the list-only keys', () => {
    const rows = keyRowsFor(['r', 'q', 'p']);
    expect(rows.map(([caps]) => caps.join(''))).toEqual(['r', 'q', 'p', 'Esc']);
  });
  it('the list binds every key a row names: nothing is dropped', () => {
    expect(keyRowsFor(['j', 'k', 'r', 'q', 'p', '/', '1', '5', '↵'])).toEqual(KEY_ROWS);
  });
  it('HelpContent draws the rows it is given, and all of them when it is given none', () => {
    const page = renderToStaticMarkup(<HelpContent means={means} onReset={() => undefined} rows={keyRowsFor(['r', 'q', 'p'])} />);
    expect(page).toContain('revoke one step');
    expect(page).not.toContain('move between classes');
    expect(page).not.toContain('filter by name');
    const list = renderToStaticMarkup(<HelpContent means={means} onReset={() => undefined} />);
    for (const what of whats(KEY_ROWS)) expect(list).toContain(what);
  });
});
