import { FeedAge } from '@/components/status/FeedAge';
import { GateSeenLine } from '@/components/status/GateSeenLine';
import { DEMO_NOW } from '@/lib/demo/clock';
import { Chip, type ChipTone } from '@/components/status/chip/Chip';
import { HonestyChip, type HonestyKind } from '@/components/status/chip/HonestyChip';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { StateGlyph } from '@/components/status/StateGlyph';
import { TierChip } from '@/components/status/TierChip';
import { TierMark } from '@/components/status/TierMark';
import type { ProjectState } from '@/lib/demo/types';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import { GallerySection } from './GallerySection';
import { Specimen } from './Specimen';

/** Every member of a union, as a list: the record must name each one, so a new member fails tsc until it has a specimen. */
const every = <K extends string>(r: Record<K, true>): K[] => Object.keys(r) as K[];
const TONES = every<ChipTone>({ plain: true, invariant: true, neutral: true, ok: true, bad: true, accent: true, pending: true, lag: true, you: true, unknown: true });
const STATES = every<ProjectState>({ watching: true, 'setting-up': true, stale: true, 'not-set-up': true });
const HONESTY = every<HonestyKind>({ seeded: true, simulated: true, unknown: true, stale: true });
const TIERS = `${TIER_DISPLAY_ORDER.length} tiers`;

export function StatusGallery() {
  return (
    <GallerySection title="status/">
      <Specimen label={`TierMark, ${TIERS}`}>
        {TIER_DISPLAY_ORDER.map((t) => (
          <TierMark key={t} tier={t} />
        ))}
      </Specimen>
      <Specimen label="TierMark stale (last known)">
        {TIER_DISPLAY_ORDER.map((t) => (
          <TierMark key={t} tier={t} stale />
        ))}
      </Specimen>
      <Specimen label={`TierChip, ${TIERS}`}>
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
      <Specimen label={`StateGlyph ${STATES.join(' / ')}`}>
        {STATES.map((s) => (
          <StateGlyph key={s} state={s} />
        ))}
      </Specimen>
      <Specimen label={`HonestyChip ${HONESTY.join(' / ')}`}>
        {HONESTY.map((k) => (
          <HonestyChip key={k} kind={k} age={k === 'stale' ? '40 m' : undefined} />
        ))}
      </Specimen>
      <Specimen label="FeedAge ok / failing / never polled">
        <FeedAge ageSec={12} ok />
        <FeedAge ageSec={2400} ok={false} error="poll failed" />
        <FeedAge ageSec={null} ok={null} />
      </Specimen>
      <Specimen label="GateSeenLine seen / seen, demo / not seen since">
        <GateSeenLine gate={{ iid: 41, tierAtTime: 'hands_off', at: '2026-10-06T09:29:00.000Z' }} now={DEMO_NOW} />
        <GateSeenLine gate={{ iid: 39, tierAtTime: 'supervised', at: '2026-10-05T16:10:00.000Z' }} now={DEMO_NOW} demo />
        <GateSeenLine gate={null} since="2026-09-20T08:00:00.000Z" now={DEMO_NOW} />
      </Specimen>
    </GallerySection>
  );
}
