// A project's cards before its core slice is read: each card the read page draws from the project, with its title and a
// dash, in the same grid places, so the page is the page from the first frame. Never a zero, never "nothing waiting".
import { DetailSection } from '@/components/shell/detail/DetailPage';
import { Unread } from '@/components/shell/host';
import styles from '../inspector/sections/sections.module.css';

/** The cards drawn from the project itself (the core slice), in page order, with the grid row each one enters on. */
export const CORE_CARDS = [
  ['Needs you', 1],
  ['Autonomy by class', 1],
  ['Proofs', 2],
  ['Tasks', 2],
  ['Stages', 3],
  ['Improvement', 3],
] as const;

export const LATE_CORE_CARDS = [
  ['Feed', 5],
  ['Recent events', 6],
] as const;

export function CardPending({ title, reason }: { title: string; reason?: string }) {
  return (
    <DetailSection title={title}>
      <p className={styles.muted}>{reason ? `Could not be read: ${reason}` : <Unread label={`${title} not read yet`} />}</p>
    </DetailSection>
  );
}
