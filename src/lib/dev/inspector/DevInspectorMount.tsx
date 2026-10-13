'use client';

import dynamic from 'next/dynamic';

// Code-split and development-only: NODE_ENV is inlined, so a production build drops the import entirely.
const DevInspector = process.env.NODE_ENV === 'development' ? dynamic(() => import('./DevInspector'), { ssr: false }) : null;

/** Mount once from Providers. Renders nothing outside `next dev`; Ctrl/Cmd+Shift+L arms the inspector. */
export function DevInspectorMount() {
  return DevInspector ? <DevInspector /> : null;
}
