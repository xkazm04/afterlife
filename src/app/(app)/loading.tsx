import { ShellLoading } from '@/components/shell/loading/ShellLoading';

// Every windowed screen: inside the persistent frame (layout.tsx) the right column shows at once and the screen fills it
// in. The front door has its own.
export default function Loading() {
  return <ShellLoading />;
}
