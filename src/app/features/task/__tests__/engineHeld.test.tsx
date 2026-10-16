// A source task with no proof holds no engine and no digest; every place that names them must say so, as the Proof Block does.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { engineHeld } from '../components/engineHeld';
import { Court } from '../components/court/Court';
import { EngineLine } from '../components/equation/EngineLine';
import { loadTasks } from '../model/build/loadTasks';

const held = loadTasks()[0]!;
const bare = { ...held, proof: { ...held.proof, engine: 'no engine', digest: '' } };
const court = (task: typeof held) => renderToStaticMarkup(createElement(ToastProvider, null, createElement(Court, { task, ...props })));
const props = { sel: null, rv: null, onPick: () => undefined, onSelect: () => undefined };

describe('engineHeld', () => {
  it('is false for no engine and for an empty name', () => {
    expect(engineHeld(held.proof)).toBe(true);
    expect(engineHeld(bare.proof)).toBe(false);
    expect(engineHeld({ ...held.proof, engine: '' })).toBe(false);
  });
});

describe('a task that holds no engine', () => {
  it('the Court column head does not claim "no engine · no model"', () => {
    const html = court(bare);
    expect(html).not.toContain('no engine · no model');
    expect(html).toContain('engine not held');
  });

  it('the equation help line does not print a bare "no engine · " with an empty digest', () => {
    const html = renderToStaticMarkup(createElement(EngineLine, { proof: bare.proof }));
    expect(html).toBe('engine not held · digest not held');
  });

  it('a task that holds both still names them', () => {
    expect(renderToStaticMarkup(createElement(EngineLine, { proof: held.proof }))).toContain(`${held.proof.engine} · ${held.proof.digest}`);
    expect(court(held)).toContain(`${held.proof.engine} · no model`);
  });
});
