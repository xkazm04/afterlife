import type { CSSProperties, Ref } from 'react';
import { StepPulse } from '../../components/StepPulse';
import type { StepView } from '../../model/view';
import type { Seg } from './nav';
import segs from './seg.module.css';
import styles from './wire.module.css';

const WORD = { done: 'done', checking: 'checking now', blocked: 'blocked', todo: 'not reached', you: 'waits for you' } as const;

/**
 * One node on the wire and the segment that leads into it: the place's tiny label (first node of its band only), the
 * step's title and its mark. A tab: only the roving one takes Tab, the arrows move between them (WireVariant).
 */
export function WireNode({ step, i, seg, rank, band, selected, open, tabbable, tabId, panelId, onPress, nodeRef }: {
  step: StepView;
  i: number;
  seg: Seg;
  rank: number;
  band: { first: boolean; last: boolean };
  selected: boolean;
  open: boolean;
  tabbable: boolean;
  tabId: string;
  panelId: string;
  onPress: () => void;
  nodeRef: Ref<HTMLButtonElement>;
}) {
  const style = { '--i': i, '--o': i * 2, '--rank': rank } as CSSProperties;
  return (
    <div className={styles.cell} style={style} data-place={step.place} data-first={band.first || undefined} data-last={band.last || undefined}>
      {band.first ? (
        <span className={styles.place} aria-hidden="true">
          {step.place}
        </span>
      ) : null}
      <div className={styles.track}>
        {i > 0 ? <span className={segs.seg} data-seg={seg} aria-hidden="true" /> : null}
        <button
          ref={nodeRef}
          type="button"
          role="tab"
          id={tabId}
          data-step={step.key}
          className={styles.node}
          data-state={step.state}
          data-open={(selected && open) || undefined}
          aria-selected={selected}
          aria-expanded={selected ? open : undefined}
          aria-controls={panelId}
          aria-label={`${i + 1}. ${step.title}, ${step.place}: ${WORD[step.state]}`}
          tabIndex={tabbable ? 0 : -1}
          onClick={onPress}
        >
          <StepPulse state={step.state} size="sm" />
          <span className={styles.title}>{step.title}</span>
        </button>
      </div>
    </div>
  );
}
