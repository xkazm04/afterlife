// The setup tables are kept by hand, in four files, and join on strings: a track id, a "step:N" key, a capability name, a
// step number. Each join below is checked against the demo catalogue (the ground truth), not against another table.
import { describe, expect, it } from 'vitest';
import { getSetup, getTracks } from '@/lib/demo';
import { capSlug } from '../model/nodeKey';
import { downstream } from '../model/map/graph';
import { GRAPH } from '../model/map/appGraph';
import { ARM_META, GATE_FREES, NEED_LABEL } from './armMeta';
import { CAP_FLOW_API, CAP_NOTE, CAP_SHORT, CAP_USES, CAP_VULN, OTHER_GROUP } from './capabilities';
import { STEP_DETAIL } from './stepDetail';

const setup = getSetup();
const stepNos = setup.phases.flatMap((ph) => ph.steps.map(([n]) => n));
const trackIds = getTracks().map((t) => t.id);
const capNames = setup.doctor.rows.map(([name]) => name);
const sorted = <T>(xs: readonly T[]): T[] => [...xs].sort();

describe('arm order and needs', () => {
  it('ARM_META names exactly the catalogue tracks, and the arm order lists them all', () => {
    expect(sorted(Object.keys(ARM_META))).toEqual(sorted(trackIds));
    expect(sorted(setup.arm.map(([id]) => id))).toEqual(sorted(trackIds));
  });
  it('every need is a track in ARM_META or a catalogue step that NEED_LABEL words', () => {
    for (const [id, m] of Object.entries(ARM_META)) {
      for (const k of m.needs) {
        if (k.startsWith('step:')) {
          expect(stepNos, `${id} needs ${k}`).toContain(Number(k.slice(5)));
          expect(NEED_LABEL[k], `${id} needs ${k}: no wording`).toBeTruthy();
        } else expect(ARM_META[k], `${id} needs ${k}`).toBeDefined();
      }
    }
  });
  it('NEED_LABEL words only needs some track has', () => {
    const used = new Set(Object.values(ARM_META).flatMap((m) => m.needs));
    expect(Object.keys(NEED_LABEL).filter((k) => !used.has(k))).toEqual([]);
  });
  it('no track waits on itself, however far back', () => {
    for (const id of Object.keys(ARM_META)) expect(downstream(GRAPH, id), id).not.toContain(id);
  });
});

describe('capabilities', () => {
  it('CAP_SHORT names the doctor rows of the catalogue, in order, and OTHER_GROUP has a verdict for each by position', () => {
    expect(Object.keys(CAP_SHORT)).toEqual(capNames);
    expect(OTHER_GROUP.rows).toHaveLength(capNames.length);
  });
  it('CAP_USES, CAP_NOTE and the two named capabilities point at CAP_SHORT names; CAP_USES lists only tracks', () => {
    expect(sorted(Object.keys(CAP_USES))).toEqual(sorted(capNames));
    expect(Object.keys(CAP_NOTE).filter((k) => !(k in CAP_SHORT))).toEqual([]);
    expect([CAP_VULN, CAP_FLOW_API].filter((k) => !(k in CAP_SHORT))).toEqual([]);
    expect(Object.values(CAP_USES).flat().filter((t) => !trackIds.includes(t))).toEqual([]);
  });
  it('no two capabilities share a /setup/cap-<slug> address', () => {
    expect(new Set(capNames.map(capSlug)).size).toBe(capNames.length);
  });
});

describe('steps', () => {
  it('STEP_DETAIL has a detail for each catalogue step and no other', () => {
    expect(sorted(Object.keys(STEP_DETAIL).map(Number))).toEqual(sorted(stepNos));
  });
  it('GATE_FREES words exactly the human steps, the gates', () => {
    const human = Object.entries(STEP_DETAIL).filter(([, d]) => d.who === 'human').map(([n]) => Number(n));
    expect(sorted(Object.keys(GATE_FREES).map(Number))).toEqual(sorted(human));
  });
});
