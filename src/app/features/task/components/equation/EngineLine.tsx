import type { TaskView } from '../../model/types';
import { engineHeld } from '../engineHeld';

/** The engine and digest behind a verdict, as the equation's help prints them. A pin the task does not hold reads "not held". */
export function EngineLine({ proof }: { proof: Pick<TaskView['proof'], 'engine' | 'digest'> }) {
  return (
    <>
      {engineHeld(proof) ? proof.engine : 'engine not held'} · {proof.digest || 'digest not held'}
    </>
  );
}
