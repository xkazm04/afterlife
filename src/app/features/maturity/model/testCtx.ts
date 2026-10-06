// Test helper: the real demo dataset joined with the screen fixtures. Not imported by the app.
import { DEMO } from '@/lib/demo';
import { makeCtx } from './ctx';

export const ctx = makeCtx(DEMO.maturity, DEMO.stages);
