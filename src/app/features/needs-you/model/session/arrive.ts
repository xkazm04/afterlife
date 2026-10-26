// The desk's state when the screen host's view slice lands (screen/host.tsx). The store mounts before the desk is read
// (the Session), so it starts from the opening state with no gap known; the desk's arrival adds what only the desk
// knows (each gap's opening pick) and keeps everything the person did: staged writes, picks, selection, sections.
import type { NeedsYouDemo } from '../../data/types';
import type { NeedsState } from '../types';

export function arriveDemo(s: NeedsState, demo: Pick<NeedsYouDemo, 'gaps'>): NeedsState {
  const opening = Object.fromEntries(demo.gaps.map((g) => [g.id, g.picked]));
  const gaps = { ...opening, ...s.gaps };
  return Object.keys(gaps).every((id) => s.gaps[id] === gaps[id]) && Object.keys(s.gaps).length === Object.keys(gaps).length ? s : { ...s, gaps };
}
