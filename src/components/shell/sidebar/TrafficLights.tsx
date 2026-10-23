'use client';

import { useSyncExternalStore } from 'react';
import styles from './Sidebar.module.css';

function subscribe(notify: () => void): () => void {
  window.addEventListener('focus', notify);
  window.addEventListener('blur', notify);
  return () => {
    window.removeEventListener('focus', notify);
    window.removeEventListener('blur', notify);
  };
}

/**
 * The three window lights. Decorative. They go grey while the window is not the focused one. The focus state lives here,
 * so a focus or blur re-renders these three dots and not the whole shell. The server (and the hydration pass) draws them
 * lit, since it cannot know; the client then reads document.hasFocus(), so a window that loads unfocused is grey at once.
 */
export function TrafficLights() {
  const focused = useSyncExternalStore(subscribe, () => document.hasFocus(), () => true);
  return (
    <div className={`${styles.lights} ${focused ? '' : styles.inactive}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}
