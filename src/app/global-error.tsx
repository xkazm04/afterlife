'use client';

import { ErrorView } from '@/components/shell/fallback/ErrorView';

// Replaces the root layout when it throws (live mode that never became ready): its own html and body, no providers.
export default function GlobalError(p: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ErrorView error={p.error} retry={p.retry} />
      </body>
    </html>
  );
}
