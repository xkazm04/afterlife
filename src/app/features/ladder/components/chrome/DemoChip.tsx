import { Chip } from '@/components/status/chip/Chip';

/** Marks the demo's own text that live mode still shows beside live rows: it was not read from GitLab. Nothing when off. */
export function DemoChip({ on = true, what = 'Demo text' }: { on?: boolean; what?: string }) {
  return on ? (
    <Chip compact tone="unknown" title={`${what}: live mode does not read this from GitLab yet`}>
      demo
    </Chip>
  ) : null;
}
