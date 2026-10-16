// Inline script for the server page, run before first paint: fits the 1600 x 1000 stage into the viewport (--s, --ox,
// --oy on <html>) and applies the render tier (html[data-door-q]): ?quality=full|lite wins and is remembered,
// otherwise the tier measured on an earlier visit. A first visit starts full and is measured (hooks/useQuality).

export const QUALITY_KEY = 'afterlife.doorQuality';
export const STAGE_W = 1600;
export const STAGE_H = 1000;

/** The vars the fit sets on <html>: the scale, and the offsets that centre the stage. The inline script below must say the same. */
export function stageFit(w: number, h: number): Record<'--s' | '--ox' | '--oy', string> {
  const s = Math.min(w / STAGE_W, h / STAGE_H);
  return { '--s': s.toFixed(4), '--ox': `${((w - STAGE_W * s) / 2).toFixed(1)}px`, '--oy': `${((h - STAGE_H * s) / 2).toFixed(1)}px` };
}

export function stageFitSource(): string {
  const fit = `function f(){var w=innerWidth,h=innerHeight,s=Math.min(w/${STAGE_W},h/${STAGE_H}),d=document.documentElement.style;d.setProperty('--s',s.toFixed(4));d.setProperty('--ox',((w-${STAGE_W}*s)/2).toFixed(1)+'px');d.setProperty('--oy',((h-${STAGE_H}*s)/2).toFixed(1)+'px')}f();`;
  const tier = `try{var k=${JSON.stringify(QUALITY_KEY)},q=new URLSearchParams(location.search).get('quality');if(q==='full'||q==='lite')localStorage.setItem(k,q);var v=localStorage.getItem(k);if(v==='full'||v==='lite')document.documentElement.dataset.doorQ=v}catch(e){}`;
  return `(function(){${fit}${tier}})()`;
}
