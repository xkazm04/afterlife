'use client';

// What the host draws for a screen whose slice answered notFound when the screen gives no NotFound of its own: the
// window, a plain note, the way back. A module with an entity (a project, a class) passes its own EntityNotFound.
import { PaneScroll } from '../PaneScroll';
import { Window } from '../Window';

export function HostNotFound() {
  return (
    <Window title="Not found">
      <PaneScroll padded>
        <p>Nothing is at this address. Pick a screen in the sidebar.</p>
      </PaneScroll>
    </Window>
  );
}
