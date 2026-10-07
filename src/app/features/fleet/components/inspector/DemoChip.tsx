import { Chip } from '@/components/status/chip/Chip';

/** Marks demo text that live mode still shows beside live rows: it is the demo's catalogue, not read from GitLab. */
export function DemoChip() {
  return (
    <Chip compact tone="unknown" title="Demo text: live mode does not read this from GitLab yet">
      demo
    </Chip>
  );
}
