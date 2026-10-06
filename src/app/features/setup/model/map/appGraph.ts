import { ARM_META } from '../../data/armMeta';
import { CAP_USES } from '../../data/capabilities';
import type { Graph } from './graph';

/** The setup screen's graph: ARM_META needs plus the capability reliance table. */
export const GRAPH: Graph = {
  needs: Object.fromEntries(Object.entries(ARM_META).map(([id, m]) => [id, m.needs])),
  capUses: CAP_USES,
};
