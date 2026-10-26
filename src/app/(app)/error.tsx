'use client';

import { ErrorView } from '@/components/shell/fallback/ErrorView';

// A windowed screen's read failed: the frame stays (sidebar, X-ray, and the live gate, which covers this with Trace while
// live mode is not ready). The root error.tsx would replace the frame along with the screen.
export default function Error(p: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="fallback-scroll">
      <title>Afterlife · Error</title>
      <ErrorView error={p.error} retry={p.retry} />
    </div>
  );
}
