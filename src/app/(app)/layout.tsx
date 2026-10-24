import { Suspense, type ReactNode } from 'react';
import { LiveGate } from '@/app/features/trace/LiveGate';
import { XrayOverlay } from '@/app/features/xray/XrayOverlay';
import { XraySidebar } from '@/app/features/xray/XraySidebar';
import { AppFrame } from '@/components/shell/frame/AppFrame';

// Every windowed screen shares one frame: the backdrop, the window box and the sidebar mount here once, so navigating
// between screens keeps the sidebar (and whether it is hidden); each screen's Window fills the right column. The frame
// carries the onboarding: the X-ray over the window and the sidebar's first-run section. The gate covers the column with
// Trace while live mode has nothing to show (before the first poll, or an empty group); otherwise it draws nothing.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppFrame sidebar={<XraySidebar />} overlay={<XrayOverlay />}>
      {children}
      <Suspense fallback={null}>
        <LiveGate />
      </Suspense>
    </AppFrame>
  );
}
