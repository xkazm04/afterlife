// The live desk's view-model. NeedsYouLive (D4) imports only from here:
//   deskItems(items, decided, project, now): DeskItem[]   groupDesk(items, by): DeskGroup[]
//   summarize(items): DeskSummary                          outReduce(s, a): DeskOut, from OUT_EMPTY
export type * from './types';

export { deadlineOf, deskItems } from './items';
export { DECIDED_GROUP, groupDesk, readOnlyName, summarize } from './group';
export { OUT_EMPTY, canStage, outReduce } from './out';
