'use client';

import { useEffect } from 'react';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { commandLines, type WriteView } from '@/server/actions/words';
import type { OnboardIntent } from '../../model/batch';
import styles from './sheet.module.css';

/**
 * A write's exact commands, as the server planned them (previewAction), asked for once it is on screen. Nothing is spelled
 * here: until the preview comes there are no commands, and a refusal says why nothing will be sent.
 */
export function WritePreview({ intent, view, want, label }: { intent: OnboardIntent; view: WriteView | undefined; want: (i: OnboardIntent) => void; label: string }) {
  useEffect(() => want(intent), [want, intent]);
  if (!view) return <p className={styles.note}>Asking the server for the exact MR… nothing runs until you confirm it.</p>;
  if (view.kind === 'refused') return <p className={styles.note}>Not sent: {view.reason}. Nothing will run for it.</p>;
  return (
    <>
      <p className={styles.note}>
        {view.preview.summary}
        {view.preview.mode === 'demo' ? ' Demo mode: confirming only simulates.' : ''}
      </p>
      <CommandBlock commands={commandLines(view.preview)} prompt={false} label={label} />
    </>
  );
}
