import { FeedAge } from '@/components/status/FeedAge';
import { Chip, type ChipTone } from '@/components/status/chip/Chip';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { StateGlyph } from '@/components/status/StateGlyph';
import { TierChip } from '@/components/status/TierChip';
import { TierMark } from '@/components/status/TierMark';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import { GallerySection } from './GallerySection';
import { Specimen } from './Specimen';

const TONES: readonly ChipTone[] = ['plain', 'invariant', 'neutral', 'ok', 'bad', 'accent', 'pending', 'lag', 'you', 'unknown'];

export function StatusGallery() {
  return (
    <GallerySection title="status/">
      <Specimen label="TierMark, five tiers">
        {TIER_DISPLAY_ORDER.map((t) => (
          <TierMark key={t} tier={t} />
        ))}
      </Specimen>
      <Specimen label="TierMark stale (last known)">
        {TIER_DISPLAY_ORDER.map((t) => (
          <TierMark key={t} tier={t} stale />
        ))}
      </Specimen>
      <Specimen label="TierChip, five tiers">
        {TIER_DISPLAY_ORDER.map((t) => (
          <TierChip key={t} tier={t} />
        ))}
      </Specimen>
      <Specimen label="NeedsYouBadge live / last-known / group / small / zero">
        <NeedsYouBadge count={5} />
        <NeedsYouBadge count={2} variant="last-known" />
        <NeedsYouBadge count={24} variant="group" />
        <NeedsYouBadge count={5} small />
        <NeedsYouBadge count={0} showZero />
      </Specimen>
      <Specimen label="NeedsYouBadge with a label (a picked gap's id), outlined / solid">
        <NeedsYouBadge label="G-12" small variant="group" title="gap picked, waits for you" />
        <NeedsYouBadge label="G-12" small title="gap picked, waits for you" />
      </Specimen>
      <Specimen label="Chip tones (18 px)">
        {TONES.map((t) => (
          <Chip key={t} tone={t}>
            {t}
          </Chip>
        ))}
      </Specimen>
      <Specimen label="Chip compact (16 px, table cells)">
        {TONES.map((t) => (
          <Chip key={t} tone={t} compact>
            {t}
          </Chip>
        ))}
      </Specimen>
      <Specimen label="StateGlyph watching / setting-up / stale / not-set-up">
        <StateGlyph state="watching" />
        <StateGlyph state="setting-up" />
        <StateGlyph state="stale" />
        <StateGlyph state="not-set-up" />
      </Specimen>
      <Specimen label="HonestyChip seeded / simulated / unknown / stale">
        <HonestyChip kind="seeded" />
        <HonestyChip kind="simulated" />
        <HonestyChip kind="unknown" />
        <HonestyChip kind="stale" age="40 m" />
      </Specimen>
      <Specimen label="FeedAge ok / failing / never polled">
        <FeedAge ageSec={12} ok />
        <FeedAge ageSec={2400} ok={false} error="poll failed" />
        <FeedAge ageSec={null} ok={null} />
      </Specimen>
    </GallerySection>
  );
}
