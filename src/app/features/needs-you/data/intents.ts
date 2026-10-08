// The server intent behind each decision, built on the server from the data source (the gap files come from the
// Maturity proposals), so the client gets only what it sends back.
import type { ActionIntent } from '@/server/actions/types';
import { getDataSource } from '@/server/data';
import { makeCtx } from '../../maturity/model/ctx';
import { intentFor } from '../model/intents';

const KEYS = ['n1', 'n2', 'n4', 'g1', 'g2', 'g3', 'g4'] as const;

export function loadNeedsIntents(): Record<string, ActionIntent | null> {
  const ds = getDataSource();
  const gaps = makeCtx(ds.getMaturity(), ds.getStages()).gaps;
  return Object.fromEntries(KEYS.map((k) => [k, intentFor(k, gaps)]));
}
