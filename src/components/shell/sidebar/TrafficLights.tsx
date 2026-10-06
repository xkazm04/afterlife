import styles from './Sidebar.module.css';

/** The three window lights. Decorative. They go grey when the window is not the active one (`active=false`). */
export function TrafficLights({ active = true }: { active?: boolean }) {
  return (
    <div className={`${styles.lights} ${active ? '' : styles.inactive}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}
