'use client';

import { dataLabel } from '@/components/shell/bars/dataLabel';
import { useShellInfo } from '@/components/shell/ShellContext';

/** What the status bar says about the data, from the same label the status bar uses. */
export function StatusLine() {
  return <>{dataLabel(useShellInfo().data)}</>;
}
