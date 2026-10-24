import { SetupSkeleton } from '@/app/features/setup/components/SetupSkeleton';

// Between the map and a node's page (or node to node) the layout's flow is already here; only which node the address
// names is read, so the right column shows the Setup window in a node page's shape meanwhile.
export default function Loading() {
  return <SetupSkeleton shape="node" />;
}
