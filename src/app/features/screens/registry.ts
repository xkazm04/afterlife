// The screen stream's loaders: every module's own screen/slices.ts, merged. This file only imports them; a module
// writes its slices in its own file, never here. A key with no loader (a module not converted yet) is a 404.
import 'server-only';
import { loaders as cycles } from '@/app/features/cycles/screen/slices';
import { loaders as fleet } from '@/app/features/fleet/screen/slices';
import { loaders as kit } from '@/app/features/kit/screen/slices';
import { loaders as ladder } from '@/app/features/ladder/screen/slices';
import { loaders as maturity } from '@/app/features/maturity/screen/slices';
import { loaders as monitor } from '@/app/features/monitor/screen/slices';
import { loaders as needsYou } from '@/app/features/needs-you/screen/slices';
import { loaders as onboard } from '@/app/features/onboard/screen/slices';
import { loaders as runs } from '@/app/features/runs/screen/slices';
import { loaders as settings } from '@/app/features/settings/screen/slices';
import { loaders as setup } from '@/app/features/setup/screen/slices';
import { loaders as task } from '@/app/features/task/screen/slices';
import { loaders as theater } from '@/app/features/theater/screen/slices';
import { loaders as trace } from '@/app/features/trace/screen/slices';
import { loaders as vitals } from '@/app/features/vitals/screen/slices';
import { isScreenKey, paramOf, type ScreenKey } from '@/components/shell/host/model/routes';
import type { ModuleLoaders, ScreenLoader } from './types';

/** Per module, so a test can check each module names only its own keys. */
export const MODULE_LOADERS: Readonly<Record<string, ModuleLoaders>> = {
  vitals, fleet, monitor, 'needs-you': needsYou, ladder, maturity, cycles, task, onboard, setup, trace, theater, runs, settings, kit,
};

const LOADERS: ModuleLoaders = Object.assign({}, ...Object.values(MODULE_LOADERS)) as ModuleLoaders;

/** The loader for a key as the URL names it, or null (unknown key, or not converted yet). */
export function loaderFor(key: string): { key: ScreenKey; loader: ScreenLoader } | null {
  if (!isScreenKey(key)) return null;
  const loader = LOADERS[key];
  return loader && Object.keys(loader.slices).length ? { key, loader } : null;
}

/**
 * The request's query split into the key's param and the page's own query (the param removed). Null when the key has
 * a param and the query does not carry it (a 400: the client always sends it).
 */
export function splitQuery(key: ScreenKey, q: URLSearchParams): { params: Record<string, string>; search: URLSearchParams } | null {
  const name = paramOf(key);
  const search = new URLSearchParams(q);
  if (!name) return { params: {}, search };
  const value = q.get(name);
  if (!value) return null;
  search.delete(name);
  return { params: { [name]: value }, search };
}
