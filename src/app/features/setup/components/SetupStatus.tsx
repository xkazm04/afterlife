'use client';

import { useSetup } from '../hooks/SetupContext';
import { useNow } from '@/lib/clock/useNow';
import { pluralWord } from '@/lib/format/plural';
import { armList, armedCount, doneCount, needYouCount, stepList } from '../model/flow/state';
import { probeAgeText } from '../model/flow/probeAge';
import styles from './SetupStatus.module.css';

/** Status bar: progress, then how old the belay doctor probe is. Stale or failed is amber and says so, with its age. */
export function SetupStatus() {
  const { state } = useSetup();
  const now = useNow();
  const age = probeAgeText(state, now ?? state.doctorAt);
  const need = needYouCount(state);
  const progress = `${doneCount(state)}/${stepList(state).length} steps read done · ${armedCount(state)}/${armList(state).length} armed · ${need} ${pluralWord(need, 'needs', 'need')} you · `;
  return (
    <>
      {progress}
      <span className={age.stale ? styles.stale : undefined}>{age.text}</span>
    </>
  );
}
