import styles from '../../vitals.module.css';

/** The stream's reason for a request that is not this machine's (the screen host's wire contract). */
const NOT_LOCAL = 'not-local';

/**
 * What a Vitals pane says when its data could not be read: a request from another machine is refused (Vitals reads this
 * machine's files and acts as the person's own logins), or the server's fixed reason.
 */
export function Unreadable({ what, reason }: { what: string; reason: string }) {
  return (
    <div className={styles.notice} data-tone="bad" role="alert">
      {reason === NOT_LOCAL ? (
        <>
          <b>Only on this machine.</b> Vitals reads the projects saved on the machine Afterlife runs on and collects through your own az and glab logins, so
          it answers only a page opened there (localhost).
        </>
      ) : (
        <>
          <b>{what} could not be read.</b> <span className={styles.mono}>{reason}</span>
        </>
      )}
    </div>
  );
}
