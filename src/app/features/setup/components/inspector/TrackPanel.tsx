'use client';

import { DetailSection } from '@/components/shell/detail/DetailPage';
import { GateSeenLine } from '@/components/status/GateSeenLine';
import { TierMark } from '@/components/status/TierMark';
import { DEMO_NOW } from '@/lib/demo/clock';
import { cellName, isStanding } from '@/lib/tiers';
import { cellOf, RUNGS } from '@/lib/promotion/rungs';
import { plural } from '@/lib/format/plural';
import { ARM_META } from '../../data/armMeta';
import { useSetup } from '../../hooks/SetupContext';
import { wouldWrite } from '../../model/enroll/enroll';
import { unmet } from '../../model/flow/state';
import { mrName } from '../../model/flow/wording';
import type { ArmState } from '../../model/types';
import { GRAPH } from '../../model/map/appGraph';
import { capsOf, downstream, isStepKey, stepOf } from '../../model/map/graph';
import { Chip, type ChipTone } from '@/components/status/chip/Chip';
import styles from './inspector.module.css';
import { CapDep } from './parts/CapDep';
import { StepDep } from './parts/StepDep';
import { TrackDep } from './parts/TrackDep';
import { EnrollSection } from './EnrollSection';
import { TrackArmSection } from './TrackArmSection';

/** What arming is not: Belay's arm MR adds the track's CI content, nothing in belay-policy. */
const ARM_IS_NOT = 'Arming does not grant a tier and does not write tier-state.yml: a tier is earned on the record, by a policy MR a person merges.';

const CHIP: Record<string, { tone: ChipTone; word: (a: ArmState) => string }> = {
  armed: { tone: 'ok', word: (a) => `armed${a.mr ? ` · ${a.mr}` : ''}${a.simulated ? ' · simulated' : ''}` },
  ready: { tone: 'accent', word: () => 'ready' },
  open: { tone: 'you', word: (a) => `merge ${mrName(a)}` },
  probing: { tone: 'accent', word: () => 'probing' },
  locked: { tone: 'unknown', word: () => 'locked' },
  undefined: { tone: 'unknown', word: () => 'not defined yet' },
  unknown: { tone: 'unknown', word: () => 'unknown' },
};

/**
 * A picked track: arm, merge, disarm or why it is locked; where each of its classes stands now (the Ladder's own action
 * classes, with the gate last seen deciding for each); what it needs, relies on and frees. Whether Belay has the track's
 * arm content is the arm section's fact, apart from this one.
 */
export function TrackPanel({ id }: { id: string }) {
  const { state, tracks, classes, illustrative, startTier } = useSetup();
  const a = state.arm[id];
  const t = tracks[id];
  if (!a || !t) return null;
  const needs = ARM_META[id]?.needs ?? [];
  // GRAPH.capUses is the demo catalogue's illustrative table: live mode does not state it as fact (CapPanel hides the same table)
  const caps = state.live ? [] : capsOf(GRAPH, id);
  const frees = downstream(GRAPH, id);
  const mine = classes.filter((c) => c.track === id);
  const chip = CHIP[a.st];
  return (
    <>
      <DetailSection title="State" aux={`${id} · ${t.verb}`}>
        <div className={styles.chips}>
          <Chip>arm #{a.order + 1}</Chip>
          {chip ? <Chip tone={chip.tone}>{chip.word(a)}</Chip> : null}
          {illustrative.tracks ? <Chip title="The track's name and what it does are the demo catalogue's: live mode does not read them from GitLab">name · demo</Chip> : null}
        </div>
      </DetailSection>
      <TrackArmSection id={id} />
      <EnrollSection id={id} />
      {mine.length ? (
        <DetailSection title="Standing" aux={<span title={ARM_IS_NOT}>not granted by arming ⓘ</span>}>
          <div className={styles.trs}>
            {mine.map((c) => {
              const cell = cellOf(c);
              const would = wouldWrite(c, startTier);
              return (
                <div key={c.id}>
                  <div className={styles.trow}>
                    <code>{c.id}</code>
                    {cell && !isStanding(cell) ? <TierMark tier={cell} /> : null}
                    <span className={styles.muted}>{cellName(cell, c.holders)}</span>
                  </div>
                  {/* the gate decides for a class held at a tier; a person acts on a human-only one */}
                  {(RUNGS as readonly string[]).includes(cell ?? '') ? (
                    <div className={styles.muted}>
                      <GateSeenLine gate={c.gateSeen} since={c.since} now={state.live ? undefined : DEMO_NOW} demo={!state.live} />
                    </div>
                  ) : null}
                  {/* no record yet: what the enrollment MR would write (from start_tier), never shown as a tier held */}
                  {would ? <div className={styles.muted}>{would}</div> : null}
                </div>
              );
            })}
            <div className={styles.muted}>{ARM_IS_NOT}</div>
          </div>
        </DetailSection>
      ) : null}
      <DetailSection title="Needs" aux={needs.length ? `${unmet(state, id).length} unmet` : undefined}>
        {needs.length ? needs.map((k) => (isStepKey(k) ? <StepDep key={k} n={stepOf(k)} /> : <TrackDep key={k} id={k} />)) : <div className={styles.muted}>No prerequisite</div>}
      </DetailSection>
      <DetailSection title="Relies on in GitLab">
        {caps.length ? caps.map((c) => <CapDep key={c} name={c} />) : <div className={styles.muted}>{state.live ? 'Not mapped: Belay does not tie a track to the live capabilities yet' : 'No GitLab capability'}</div>}
      </DetailSection>
      {frees.length ? (
        <DetailSection title="Frees" aux={plural(frees.length, 'track')}>
          {frees.map((x) => (
            <TrackDep key={x} id={x} />
          ))}
        </DetailSection>
      ) : null}
    </>
  );
}
