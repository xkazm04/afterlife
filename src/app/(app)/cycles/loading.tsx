import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';

// The stage grid over the cycle detail while the scan and the cycle history stream in (?scope=estate lands in the same window).
export default function Loading() {
  return <ScreenSkeleton title="Cycles" layout="grid" />;
}
