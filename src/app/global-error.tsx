'use client';

import './globals.css';
import { ErrorView } from '@/components/shell/fallback/ErrorView';

// Replaces the root layout when it throws (live mode that never became ready): its own html and body, no providers; globals.css is imported so tokens and the focus ring apply.
export default function GlobalError(p: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <title>Belay Error</title>
        <div className="fallback-scroll">
          <ErrorView error={p.error} retry={p.retry} />
        </div>
      </body>
    </html>
  );
}
