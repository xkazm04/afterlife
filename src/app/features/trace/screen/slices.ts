// trace's slices for the screen stream (GET /api/screen/<key>, docs/features/screen-host.md). Empty until W4 converts the
// module: a key with no loader answers 404, and the host does not claim it.
import type { ModuleLoaders } from '@/app/features/screens/types';

export const loaders: ModuleLoaders = {};
