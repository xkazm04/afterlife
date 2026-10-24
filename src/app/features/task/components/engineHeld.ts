import { NO_ENGINE } from '../model/build/buildTasks';
import type { TaskView } from '../model/types';

/** Whether the task names a proof engine. A source task with no proof carries the placeholder NO_ENGINE, which is not one. */
export const engineHeld = (proof: Pick<TaskView['proof'], 'engine'>): boolean => !!proof.engine && proof.engine !== NO_ENGINE;
