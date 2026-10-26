'use client';

// The class page before the classes are read (the screen host's core slice): the page's cards with a dash each, the
// same boxes the read page draws; and the not-found card for a class the read does not hold.
import { EntityNotFound } from '@/components/shell/fallback/EntityNotFound';
import { Unread } from '@/components/shell/host';
import { Sec } from './Sec';
import styles from './inspector.module.css';

const CARDS = ['Act', 'Promotion rule', 'Revoke · direct commit', 'Grant', 'Enforced'] as const;

/** Each card a dash; `reason`: why the classes could not be read. */
export function ClassPending({ reason }: { reason?: string }) {
  return (
    <>
      {CARDS.map((t) => (
        <Sec key={t} title={t} aux={<Unread />}>
          <div className={styles.none}>{reason ? `The classes could not be read: ${reason}` : <Unread label="not read yet" />}</div>
        </Sec>
      ))}
    </>
  );
}

/** An unknown /ladder/<class>: it is the class that is missing (not a page), with the way back to the Ladder. */
export function ClassNotFound() {
  return (
    <EntityNotFound
      title="Class not found"
      note="No action class with that name is on the Ladder. It may have been removed or the link is mistyped."
      href="/ladder"
      back="Back to the Ladder"
    />
  );
}
