import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';

// A project's detail page: section cards while the project and its agent cost stream in (inside fleet's own boundary).
export default function Loading() {
  return <ScreenSkeleton title="Fleet" layout="sections" />;
}
