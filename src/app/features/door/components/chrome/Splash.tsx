import Image from 'next/image';
import styles from './splash.module.css';

/**
 * The brand's hero render, large and centred: the intro's splash and the loading frame's mark. When the intro ends
 * (`on` false) it fades and shrinks up into the small header mark. It never takes the pointer, and reduced motion drops it.
 */
export function Splash({ on }: { on: boolean }) {
  return (
    <div className={styles.splash} data-on={on || undefined} aria-hidden>
      <Image src="/brand/afterlife-hero-1024.webp" alt="" width={1024} height={1024} preload sizes="560px" />
    </div>
  );
}
