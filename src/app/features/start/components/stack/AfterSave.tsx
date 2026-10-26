'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/controls/Button';
import type { ProjectIntent } from '@/server/actions/types';
import { ProjectWriteSheet } from '@/app/features/vitals/components/write/ProjectWriteSheet';
import { useProjectWrite } from '@/app/features/vitals/hooks/useProjectWrite';
import { saveWrites, type SaveWrites } from '../../actions/writes';
import styles from './stack.module.css';

const COPY = {
  'install-skill': { label: 'Install the report skill', title: 'Install the afterlife-report skill', sub: 'a file in the repo · never committed · a dev agent reports with afterlife report', confirm: 'Write the file' },
  'enable-app-insights': { label: 'Turn on App Insights', title: 'Turn on App Insights', sub: 'your az login · restarts the app · the connection string is never shown', confirm: 'Run as you' },
} as const;

function WriteSheet({ intent, onClose }: { intent: ProjectIntent; onClose: () => void }) {
  const c = COPY[intent.kind as keyof typeof COPY];
  const write = useProjectWrite(intent, c.label.toLowerCase());
  return <ProjectWriteSheet title={c.title} subtitle={c.sub} write={write} confirm={c.confirm} onClose={onClose} />;
}

/**
 * Once saved: the report skill's install, and Turn on App Insights when the cloud had no component (the checklist's
 * person step). Each opens the server's preview of its write and runs only on the click in it.
 */
export function AfterSave({ slug, appInsights }: { slug: string; appInsights: boolean }) {
  const [writes, setWrites] = useState<SaveWrites>({});
  const [open, setOpen] = useState<ProjectIntent | null>(null);
  useEffect(() => {
    let live = true;
    saveWrites(slug).then((w) => live && setWrites(w), () => live && setWrites({}));
    return () => {
      live = false;
    };
  }, [slug]);
  const ins = writes.insights && 'kind' in writes.insights ? writes.insights : undefined;
  return (
    <div className={styles.saveRow}>
      {writes.skill ? <Button onClick={() => setOpen(writes.skill!)}>{COPY['install-skill'].label}</Button> : null}
      {appInsights && ins ? <Button onClick={() => setOpen(ins)}>{COPY['enable-app-insights'].label}</Button> : null}
      {appInsights && writes.insights && !ins ? <p className={styles.summary}>Turn on App Insights is not offered: {(writes.insights as { reason: string }).reason}.</p> : null}
      {open ? <WriteSheet intent={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
