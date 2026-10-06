import { Legend } from '@/components/overlays/popover/Legend';
import { MarkGlyph } from './MarkGlyph';

/** The "?" legend: the beat grammar, one drawn mark per rule. */
export function MonitorLegend() {
  return (
    <Legend
      rows={[
        [<MarkGlyph key="w" kind="watching" />, 'Watching: a beat; the taller the R wave, the more tracks are armed'],
        [<MarkGlyph key="n" kind="needs" />, 'Amber pips: decisions waiting for you (up to six drawn)'],
        [<MarkGlyph key="q" kind="quar" />, 'Rose dip: a quarantined action class'],
        [<MarkGlyph key="s" kind="setup" />, 'Dashed, low: being set up'],
        [<MarkGlyph key="t" kind="stale" />, 'Flat and hatched: stale feed, values last known'],
        [<MarkGlyph key="u" kind="unwatched" />, 'Dashed break: not watched, unknown and never zero'],
        ['←→ ↑↓', 'Move beat to beat, lead to lead · Enter opens the lead into names'],
      ]}
    />
  );
}
