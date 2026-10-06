import { CommandBlock } from '@/components/inspector/CommandBlock';
import { TIER_META } from '@/lib/tiers';
import { buildPlan, diffKind } from '../../../model/rules/plan';
import { revokeTarget } from '../../../model/rules/tiers';
import type { ClassRow } from '../../../model/types';
import { Sec, type SectionState } from '../Sec';
import styles from './sections.module.css';

// kit-candidate: the diff block under CommandBlock (green added lines, red removed, dim context).
/** The exact write behind `r`: the commands, then the tier-state.yml diff. Shown before anything runs. */
export function WriteSection({ cls, byId, sections }: { cls: ClassRow; byId: Readonly<Record<string, ClassRow>>; sections: SectionState }) {
  const to = revokeTarget(cls.tier);
  const plan = to ? buildPlan(byId, [{ id: cls.id, to }]) : null;
  return (
    <Sec id="write" title="The write behind r" aux={to ? `→ ${TIER_META[to].name}` : ''} anchor="ladder-write" sections={sections}>
      {plan ? (
        <>
          <CommandBlock commands={plan.cmd} label="The commands r runs" />
          <pre className={styles.diff} aria-label="tier-state.yml diff">
            <span className={styles.head}># tier-state.yml{'\n'}</span>
            {plan.diff.map((l, i) => (
              <span key={i} className={styles[diffKind(l) === 'add' ? 'add' : diffKind(l) === 'del' ? 'del' : 'head']}>
                {l}
                {'\n'}
              </span>
            ))}
          </pre>
        </>
      ) : (
        <div className={styles.note}>Nothing to revoke</div>
      )}
    </Sec>
  );
}
