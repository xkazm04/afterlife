// An empty fleet (no groups) is a valid door: the scene must still draw, with no non-finite number in any attribute.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Scene } from '../components/scene/Scene';
import { HOME } from '../model/camera';

const props = { ds: [], classes: [], level: 0 as const, curG: null, hotG: null, hotTower: null, dim: null, red: null, cam: HOME, camMs: 0, onHover: () => undefined, onPick: () => undefined };

describe('Scene over an empty fleet', () => {
  it('writes no Infinity or NaN into the markup', () => {
    expect(renderToString(createElement(Scene, props))).not.toMatch(/Infinity|NaN/);
  });
  it('keeps the row haze at zero height rather than dropping it', () => {
    expect(renderToString(createElement(Scene, props))).toMatch(/<rect[^>]*height="0"[^>]*rowhaze/);
  });
});
