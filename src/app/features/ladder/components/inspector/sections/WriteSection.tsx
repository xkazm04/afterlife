import { DiffBlock } from '@/components/inspector/blocks/DiffBlock';
import { parseDiff } from '@/components/inspector/blocks/diff';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { TIER_META } from '@/lib/tiers';
import { buildPlan } from '../../../model/rules/plan';
import { revokeTarget } from '../../../model/rules/tiers';
import type { ClassRow } from '../../../model/types';
import { Sec, type SectionState } from '../Sec';
import styles from './sections.module.css';

/** The exact write behind `r`: the commands, then the tier-state.yml diff. Shown before anything runs. */
export function WriteSection({ cls, byId, sections }: { cls: ClassRow; byId: Readonly<Record<string, ClassRow>>; sections: SectionState }) {
  const to = revokeTarget(cls.tier);
  const plan = to ? buildPlan(byId, [{ id: cls.id, to }]) : null;
  return (
    <Sec id="write" title="The write behind r" aux={to ? `→ ${TIER_META[to].name}` : ''} anchor="ladder-write" sections={sections}>
      {plan ? (
        <div className={styles.write}>
          <CommandBlock commands={plan.cmd} label="The commands r runs" />
          <DiffBlock file="# tier-state.yml" lines={parseDiff(plan.diff)} label="tier-state.yml diff" />
        </div>
      ) : (
        <div className={styles.note}>Nothing to revoke</div>
      )}
    </Sec>
  );
}
