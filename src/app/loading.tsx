import { ShellLoading } from '@/components/shell/loading/ShellLoading';

// Every windowed screen: the frame streams first and the screen fills it in. The front door has its own.
export default function Loading() {
  return <ShellLoading />;
}
