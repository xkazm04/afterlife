import { Chip } from '@/components/status/chip/Chip';

/** The amber "you" chip in a section header: this one waits on a person. */
export function NeedYouAux() {
  return <Chip tone="you">you</Chip>;
}
