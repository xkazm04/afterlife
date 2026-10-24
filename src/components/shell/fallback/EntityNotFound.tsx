import Link from 'next/link';
import styles from './Fallback.module.css';

/** The not-found card of a dynamic route: says which kind of thing is missing and links back to that screen's front. Scrolls itself (body never does) and names the tab like the root not-found. */
export function EntityNotFound({ title, note, href, back }: { title: string; note: string; href: string; back: string }) {
  return (
    <div className="fallback-scroll">
      <title>{`Belay ${title}`}</title>
      <main className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.note}>{note}</p>
          <div className={styles.actions}>
            <Link href={href} className={styles.link}>
              {back}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
