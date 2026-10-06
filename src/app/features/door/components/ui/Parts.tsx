import type { Part } from '../../model/words';
import styles from './parts.module.css';

const TONE: Record<Part[1], string | undefined> = {
  plain: undefined,
  amber: styles.amber,
  stale: styles.stale,
  unknown: styles.unknown,
  fail: styles.fail,
  ok: styles.ok,
};

/** A line of tone-tagged parts (amber decisions, stale, unknown, failures). */
export function Parts({ parts }: { parts: readonly Part[] }) {
  return (
    <>
      {parts.map(([text, tone], i) => (
        <span key={i} className={TONE[tone]}>
          {text}
        </span>
      ))}
    </>
  );
}
