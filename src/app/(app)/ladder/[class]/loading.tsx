import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';

// A class's detail page: section cards while the class and its receipts stream in.
export default function Loading() {
  return <ScreenSkeleton title="Ladder" layout="sections" />;
}
