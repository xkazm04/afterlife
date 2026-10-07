'use client';

import { ErrorView } from '@/components/shell/fallback/ErrorView';

// A page's read failed. The root layout sits above this boundary: its own failures go to global-error.tsx.
export default function Error(p: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView error={p.error} retry={p.retry} />;
}
