'use client';

import { useEffect, type Dispatch } from 'react';
import { useRouter } from 'next/navigation';
import type { Receipts } from '../model/state/receipt';
import type { LadderAction, LadderSeed } from '../model/state/state';

/** How often a live screen with a revoke pending asks the server for a fresher snapshot (the poll runs every 30 s). */
export const RECEIPT_REFRESH_MS = 15_000;

/**
 * Live only. While a revoke is pending (no gate has read its commit yet), the route is refreshed now and then: the server
 * reads the latest snapshot, and its receipts (one per class, from the poll) reach the state, which settles the revoke
 * once a gated MR read it. Reading only: nothing is sent to GitLab from here. Demo: the simulated read settles it.
 */
export function useReceipts(live: boolean, seed: LadderSeed, pending: boolean, dispatch: Dispatch<LadderAction>): void {
  const router = useRouter();
  useEffect(() => {
    if (!live) return;
    const receipts: Receipts = Object.fromEntries(seed.classes.flatMap((c) => (c.receipt ? [[c.id, c.receipt] as const] : [])));
    dispatch({ type: 'receipts', receipts });
  }, [live, seed, dispatch]);
  useEffect(() => {
    if (!live || !pending) return;
    const id = setInterval(() => router.refresh(), RECEIPT_REFRESH_MS);
    return () => clearInterval(id);
  }, [live, pending, router]);
}
