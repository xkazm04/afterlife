import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Afterlife · Runs' };

// Runs: a static shell. The screen host draws the window at once and reads the runner's files over the screen stream
// (features/runs/screen/slices.ts) on every visit, because the runner appends to them while the page is open.
export default function RunsPage() {
  return null;
}
