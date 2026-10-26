import { Suspense, type ReactNode } from 'react';
import { LiveGate } from '@/app/features/trace/LiveGate';
import { XrayOverlay } from '@/app/features/xray/XrayOverlay';
import { XraySidebar } from '@/app/features/xray/XraySidebar';
import { AppFrame } from '@/components/shell/frame/AppFrame';
import { ScreenHost } from '@/components/shell/host/ScreenHost';

// Every windowed screen shares one frame: the backdrop, the window box and the sidebar mount here once, so navigating
// between screens keeps the sidebar (and whether it is hidden); each screen's Window fills the right column. The frame
// carries the onboarding: the X-ray over the window and the sidebar's first-run section. The gate (a client component
// that follows the shell's read) covers the column with Trace while live mode has nothing to show (before the first poll,
// or an empty group); otherwise it draws nothing.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    // The X-ray reads the pathname (request data): behind Suspense, so the frame itself stays in the static shell.
    <AppFrame
      sidebar={
        <Suspense fallback={null}>
          <XraySidebar />
        </Suspense>
      }
      overlay={
        <Suspense fallback={null}>
          <XrayOverlay />
        </Suspense>
      }
    >
      {/* the screen host draws every claimed screen itself (components/shell/host); a key it does not claim yet shows the
          route's page */}
      <ScreenHost>{children}</ScreenHost>
      <Suspense fallback={null}>
        <LiveGate />
      </Suspense>
    </AppFrame>
  );
}
