import { Suspense, type ReactNode } from 'react';
import { LiveGate } from '@/app/features/start/gate/LiveGate';
import { GuideOverlay } from '@/app/features/guide/GuideOverlay';
import { GuideSidebar } from '@/app/features/guide/GuideSidebar';
import { XrayOverlay } from '@/app/features/xray/XrayOverlay';
import { AppFrame } from '@/components/shell/frame/AppFrame';
import { ScreenHost } from '@/components/shell/host/ScreenHost';

// Every windowed screen shares one frame: the backdrop, the window box and the sidebar mount here once, so navigating
// between screens keeps the sidebar (and whether it is hidden); each screen's Window fills the right column. The frame
// carries the onboarding: the guide that plays its story over the real screens, the X-ray of the screen in front, and
// the sidebar's first-run section. The gate covers the column with
// /start while live mode has nothing to show (before the first poll, or an empty group); otherwise it draws nothing.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    // The guide and the X-ray read the pathname (request data): behind Suspense, so the frame stays in the static shell.
    <AppFrame
      sidebar={
        <Suspense fallback={null}>
          <GuideSidebar />
        </Suspense>
      }
      overlay={
        <Suspense fallback={null}>
          <XrayOverlay />
          <GuideOverlay />
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
