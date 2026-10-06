import type { Focus } from '../../../model/types';

/** What every map node reports. The map owns hover, pick and the tooltip. */
export interface NodeEvents {
  onPick: (f: Focus) => void;
  onEnter: (f: Focus, el: HTMLElement, tip: string) => void;
  onLeave: () => void;
}
