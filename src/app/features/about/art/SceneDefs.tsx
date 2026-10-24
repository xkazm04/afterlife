// The night scene's gradients: sky, ground, the fade over the foreground, the moon and its beams, the lamp glow, the
// travelling light, and one pool of light per station in that beat's voice. Colours are tokens (tokens.css "about
// film", the front door's cool palette).

const stop = (offset: number, color: string, opacity = 1) => (
  <stop offset={offset} style={{ stopColor: color, stopOpacity: opacity }} />
);

export function SceneDefs({ voices }: { voices: readonly string[] }) {
  return (
    <defs>
      <linearGradient id="ab-sky" x1="0" y1="0" x2="0" y2="1">
        {stop(0, 'var(--film-sky-top)')}
        {stop(0.55, 'var(--film-sky-mid)')}
        {stop(1, 'var(--film-sky-low)')}
      </linearGradient>
      <linearGradient id="ab-ground" x1="0" y1="0" x2="0" y2="1">
        {stop(0, 'var(--film-ground)')}
        {stop(0.25, 'color-mix(in oklab, var(--film-ground) 45%, var(--bg))')}
        {stop(1, 'var(--bg)')}
      </linearGradient>
      <linearGradient id="ab-fgfade" x1="0" y1="0" x2="0" y2="1">
        {stop(0, 'var(--bg)', 0)}
        {stop(0.22, 'var(--bg)', 0.85)}
        {stop(1, 'var(--bg)')}
      </linearGradient>
      <radialGradient id="ab-glow">
        {stop(0, 'var(--film-lamp)', 0.55)}
        {stop(1, 'var(--film-lamp)', 0)}
      </radialGradient>
      <radialGradient id="ab-moon">
        {stop(0, 'var(--film-moon-halo)', 0.8)}
        {stop(0.3, 'var(--accent)', 0.22)}
        {stop(1, 'var(--accent)', 0)}
      </radialGradient>
      <linearGradient id="ab-beam" x1="0" y1="0" x2="0" y2="1">
        {stop(0, 'var(--film-moon-halo)', 0.22)}
        {stop(1, 'var(--film-moon-halo)', 0)}
      </linearGradient>
      <radialGradient id="ab-token">
        {stop(0, 'var(--white)')}
        {stop(0.25, 'var(--film-lamp)')}
        {stop(0.55, 'var(--accent)', 0.5)}
        {stop(1, 'var(--accent)', 0)}
      </radialGradient>
      {voices.map((v, i) => (
        <radialGradient key={i} id={`ab-pool-${i}`}>
          {stop(0, v, 0.8)}
          {stop(1, v, 0)}
        </radialGradient>
      ))}
    </defs>
  );
}
