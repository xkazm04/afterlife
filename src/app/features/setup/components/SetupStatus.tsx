'use client';

import { Unread } from '@/components/shell/host';
import { useSetup } from '../hooks/SetupContext';
import { useNow } from '@/lib/clock/useNow';
import { pluralWord } from '@/lib/format/plural';
import { armList, armedCount, doneCount, isUnread, needYouCount, stepList } from '../model/flow/state';
import { probeAgeText } from '../model/flow/probeAge';
import styles from './SetupStatus.module.css';

/** Status bar: progress, then how old the doctor probe is. Stale or failed is amber and says so, with its age. */
export function SetupStatus() {
  const { state } = useSetup();
  const now = useNow();
  const age = probeAgeText(state, now ?? state.doctorAt);
  const need = needYouCount(state);
  // Live, before a read lands: a dash for what it would count (never a zero, never an amber need you nobody has read).
  const steps = isUnread(state, 'steps');
  const arms = steps || isUnread(state, 'tracks');
  const probe = isUnread(state, 'doctor') ? <span>afterlife doctor · not read yet</span> : <span className={age.stale ? styles.stale : undefined}>{age.text}</span>;
  if (!arms) {
    return (
      <>
        {`${doneCount(state)}/${stepList(state).length} steps read done · ${armedCount(state)}/${armList(state).length} armed · ${need} ${pluralWord(need, 'needs', 'need')} you · `}
        {probe}
      </>
    );
  }
  return (
    <>
      {steps ? <Unread label="steps not read yet" /> : doneCount(state)}
      {`/${stepList(state).length} steps read done · `}
      {arms ? <Unread label="tracks not read yet" /> : armedCount(state)}
      {`/${armList(state).length} armed · `}
      {steps ? <><Unread label="need you not read yet" /> need you · </> : `${need} ${pluralWord(need, 'needs', 'need')} you · `}
      {probe}
    </>
  );
}
