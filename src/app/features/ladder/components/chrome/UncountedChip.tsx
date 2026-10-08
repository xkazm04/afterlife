import { Chip } from '@/components/status/chip/Chip';

const WHY =
  "Not the poll's count: the poll counts a record only for a class one agent holds. This is the record the index held before (on the demo GitLab, the seed's)";

/** Live: a record the poll did not count (a class several agents or no agent holds) says so. Nothing when off. */
export function UncountedChip({ on = true }: { on?: boolean }) {
  return on ? (
    <Chip compact tone="unknown" title={WHY}>
      not counted
    </Chip>
  ) : null;
}
