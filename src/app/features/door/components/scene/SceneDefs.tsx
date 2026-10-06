/** Gradients, patterns and filters the scene's layers share (ids are document-wide). Colours are tokens only. */
export function SceneDefs() {
  const stop = (offset: number, color: string, opacity: number) => <stop offset={offset} style={{ stopColor: `var(${color})`, stopOpacity: opacity }} />;
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <pattern id="d-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="1" y1="0" x2="1" y2="5" style={{ stroke: 'var(--d-stale-hatch)', strokeWidth: 1.2 }} />
        </pattern>
        <pattern id="d-hatch-amber" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="1" y1="0" x2="1" y2="5" style={{ stroke: 'color-mix(in oklab, var(--needs-you) 45%, transparent)', strokeWidth: 1.4 }} />
        </pattern>
        <pattern id="d-grid" width="92" height="46" patternUnits="userSpaceOnUse" patternTransform="translate(23 0)">
          <path d="M0 23 L46 0 L92 23 L46 46 Z" style={{ fill: 'none', stroke: 'var(--d-cy-ghost)' }} />
        </pattern>
        <linearGradient id="d-beam" x1="0" y1="1" x2="0" y2="0">
          {stop(0, '--needs-you', 0.92)}
          {stop(0.22, '--needs-you', 0.5)}
          {stop(0.65, '--needs-you', 0.16)}
          {stop(1, '--needs-you', 0)}
        </linearGradient>
        <linearGradient id="d-core" x1="0" y1="1" x2="0" y2="0">
          {stop(0, '--d-amber-hot', 1)}
          {stop(0.5, '--needs-you', 0.55)}
          {stop(1, '--needs-you', 0)}
        </linearGradient>
        <linearGradient id="d-beam-st" x1="0" y1="1" x2="0" y2="0">
          {stop(0, '--needs-you', 0.42)}
          {stop(0.6, '--needs-you', 0.1)}
          {stop(1, '--needs-you', 0)}
        </linearGradient>
        <radialGradient id="d-spill">
          {stop(0, '--needs-you', 0.34)}
          {stop(0.5, '--needs-you', 0.1)}
          {stop(1, '--needs-you', 0)}
        </radialGradient>
        <radialGradient id="d-dglow">
          {stop(0, '--needs-you', 0.16)}
          {stop(0.55, '--needs-you', 0.05)}
          {stop(1, '--needs-you', 0)}
        </radialGradient>
        <radialGradient id="d-lamp">
          {stop(0, '--d-amber-hot', 0.9)}
          {stop(1, '--needs-you', 0)}
        </radialGradient>
        <radialGradient id="d-shadow">
          {stop(0, '--bg', 0.9)}
          {stop(1, '--bg', 0)}
        </radialGradient>
        <radialGradient id="d-plglow">
          {stop(0, '--accent', 0.09)}
          {stop(1, '--accent', 0)}
        </radialGradient>
        <radialGradient id="d-pool">
          {stop(0, '--accent', 0.16)}
          {stop(0.6, '--accent', 0.04)}
          {stop(1, '--accent', 0)}
        </radialGradient>
        <linearGradient id="d-sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="330">
          {stop(0, '--bg', 0)}
          {stop(0.75, '--accent', 0.015)}
          {stop(1, '--accent', 0.06)}
        </linearGradient>
        <linearGradient id="d-hzglow" x1="0" y1="0" x2="0" y2="1">
          {stop(0, '--accent', 0)}
          {stop(0.5, '--accent', 0.07)}
          {stop(1, '--accent', 0)}
        </linearGradient>
        <linearGradient id="d-haze" x1="0" y1="0" x2="0" y2="1">
          {stop(0, '--bg', 0.92)}
          {stop(1, '--bg', 0)}
        </linearGradient>
        <linearGradient id="d-rowhaze" x1="0" y1="0" x2="0" y2="1">
          {stop(0, '--bg', 0.5)}
          {stop(0.75, '--bg', 0.22)}
          {stop(1, '--bg', 0)}
        </linearGradient>
        <linearGradient id="d-mfade" gradientUnits="userSpaceOnUse" x1="0" y1="330" x2="0" y2="620">
          {stop(0, '--white', 0.05)}
          {stop(1, '--white', 1)}
        </linearGradient>
        <mask id="d-ground" maskUnits="userSpaceOnUse" x="-4000" y="-4000" width="10000" height="10000">
          <rect x="-4000" y="330" width="10000" height="6000" fill="url(#d-mfade)" />
        </mask>
        {/* drawn once into a static layer, so the blur is rasterised once, not every frame */}
        <filter id="d-bloom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="d-bloom2" x="-60%" y="-30%" width="220%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
    </svg>
  );
}
