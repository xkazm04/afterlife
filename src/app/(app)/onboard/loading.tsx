import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';

// The wizard's three step cards while "Your repos" is read (the first read starts a git per repo; then 60 s cached).
export default function Loading() {
  return <ScreenSkeleton title="Onboard" layout="sections" />;
}
