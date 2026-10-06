'use client';

import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { TierMark } from '@/components/status/TierMark';
import { TIER_META } from '@/lib/tiers';
import { plural } from '@/lib/format/plural';
import type { Ceiling } from '@/schemas';
import { ARM_META } from '../../data/armMeta';
import { useSetup } from '../../hooks/SetupContext';
import { unmet } from '../../model/flow/state';
import { GRAPH } from '../../model/map/appGraph';
import { capsOf, downstream, isStepKey, stepOf } from '../../model/map/graph';
import { Chip, type ChipTone } from '../shared/Chip';
import styles from './inspector.module.css';
import { CapDep } from './parts/CapDep';
import { StepDep } from './parts/StepDep';
import { TrackDep } from './parts/TrackDep';
import type { useOpenSections } from './parts/useOpenSections';
import { TrackArmSection } from './TrackArmSection';

/** Per action class: never above the install ceiling (Supervised); Hands-off is earned later, by policy MR. */
const tierOnArming = (c: Ceiling): Ceiling => (c === 'human_only' ? 'human_only' : c === 'assisted' ? 'assisted' : 'supervised');

const CHIP: Record<string, { tone: ChipTone; word: (mr: string | null) => string }> = {
  armed: { tone: 'ok', word: (mr) => `armed · ${mr}` },
  ready: { tone: 'accent', word: () => 'ready' },
  open: { tone: 'you', word: (mr) => `merge ${mr}` },
  probing: { tone: 'accent', word: () => 'probing' },
  locked: { tone: 'unknown', word: () => 'locked' },
};

/** A picked track: arm, merge, disarm or why it is locked; the tier it arms at; what it needs, relies on and frees. */
export function TrackPanel({ id, section }: { id: string; section: ReturnType<typeof useOpenSections> }) {
  const { state, tracks, classes } = useSetup();
  const a = state.arm[id];
  const t = tracks[id];
  if (!a || !t) return null;
  const needs = ARM_META[id]?.needs ?? [];
  const caps = capsOf(GRAPH, id);
  const frees = downstream(GRAPH, id);
  const mine = classes.filter((c) => c.track === id);
  const chip = CHIP[a.st];
  return (
    <>
      <InspectorHeader title={t.name} icon={<span className={styles.tid}>{id}</span>} sub={t.verb}>
        <div className={styles.chips}>
          <Chip>arm #{a.order + 1}</Chip>
          {chip ? <Chip tone={chip.tone}>{chip.word(a.mr)}</Chip> : null}
        </div>
      </InspectorHeader>
      <TrackArmSection id={id} section={section} />
      {mine.length ? (
        <InspectorSection
          title="Tier on arming"
          aux={<span title="Per action class. Never above the install ceiling (Supervised); Hands-off is earned later, by policy MR.">ceiling S ⓘ</span>}
          {...section('cls')}
        >
          <div className={styles.trs}>
            {mine.map((c) => {
              const tier = tierOnArming(c.ceiling);
              return (
                <div key={c.id} className={styles.trow}>
                  <code>{c.id}</code>
                  <TierMark tier={tier} />
                  <span className={styles.muted}>{TIER_META[tier].name}</span>
                </div>
              );
            })}
          </div>
        </InspectorSection>
      ) : null}
      <InspectorSection title="Needs" aux={needs.length ? `${unmet(state, id).length} unmet` : undefined} {...section('needs')}>
        {needs.length ? needs.map((k) => (isStepKey(k) ? <StepDep key={k} n={stepOf(k)} /> : <TrackDep key={k} id={k} />)) : <div className={styles.muted}>No prerequisite</div>}
      </InspectorSection>
      <InspectorSection title="Relies on in GitLab" {...section('relies')}>
        {caps.length ? caps.map((c) => <CapDep key={c} name={c} />) : <div className={styles.muted}>None</div>}
      </InspectorSection>
      {frees.length ? (
        <InspectorSection title="Frees" aux={plural(frees.length, 'track')} {...section('frees')}>
          {frees.map((x) => (
            <TrackDep key={x} id={x} />
          ))}
        </InspectorSection>
      ) : null}
    </>
  );
}
