import type { ReactNode } from 'react';
import styles from './dock.module.css';

/** Inside a CommandDock line: `prompt` is the cyan key ("r ▸"), `note` the dim aside ("(as you)"). */
export function DockText({ tone, children }: { tone: 'prompt' | 'note'; children: ReactNode }) {
  return <span className={tone === 'prompt' ? styles.p : styles.as}>{children}</span>;
}
