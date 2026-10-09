import { Chip } from '@/components/status/chip/Chip';

/** Marks a demo fixture that live mode still shows: it was not read from the project. Nothing when off (demo mode: all of it is the demo). */
export function DemoChip({ on, what }: { on: boolean; what: string }) {
  return on ? (
    <Chip compact tone="unknown" title={`${what}: a demo fixture, not read from this project`}>
      demo
    </Chip>
  ) : null;
}
