// Presentational chrome for the DevInspector: highlight boxes, the cursor label and the bottom-left panel. Dev-only, plain inline styles.
import { isLibraryPath, type LocEntry } from './locate';

export const Z = 2147483646;
const ACCENT = '#38bdf8';
const DIM = '#a855f7';
const OK = '#34d399';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const splitLoc = (loc: string) => {
  const slash = loc.lastIndexOf('/');
  return { dir: loc.slice(0, slash + 1), file: loc.slice(slash + 1) };
};

export function HighlightBox({ rect, variant }: { rect: DOMRect; variant: 'target' | 'pointer' }) {
  const target = variant === 'target';
  const color = target ? ACCENT : DIM;
  return (
    <div
      style={{
        position: 'fixed', left: rect.left, top: rect.top, width: rect.width, height: rect.height, zIndex: Z,
        border: `${target ? 2 : 1}px ${target ? 'solid' : 'dashed'} ${color}`, borderRadius: 3, boxSizing: 'border-box',
        background: target ? `${color}1f` : 'transparent', pointerEvents: 'none',
      }}
    />
  );
}

export function SourceLabel({ rect, loc }: { rect: DOMRect; loc: string }) {
  const top = rect.top > 22 ? rect.top - 20 : Math.min(rect.top + 2, window.innerHeight - 22);
  return (
    <div
      style={{
        position: 'fixed', top, left: Math.max(4, Math.min(rect.left, window.innerWidth - 260)), zIndex: Z, pointerEvents: 'none',
        font: `11px/1.4 ${MONO}`, color: '#0b1220', background: ACCENT, borderRadius: 4, padding: '1px 6px', fontWeight: 700,
        whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,.45)',
      }}
    >
      {splitLoc(loc).file}
    </div>
  );
}

function CrumbRow({ entry, isDefault, onCopy }: { entry: LocEntry; isDefault: boolean; onCopy: (loc: string) => void }) {
  const { dir, file } = splitLoc(entry.loc);
  return (
    <button
      type="button"
      onClick={() => onCopy(entry.loc)}
      style={{
        display: 'flex', gap: 2, width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', borderRadius: 4,
        padding: '2px 4px', font: 'inherit', wordBreak: 'break-all', background: isDefault ? `${ACCENT}22` : 'transparent',
      }}
    >
      <span style={{ color: ACCENT, opacity: isDefault ? 1 : 0 }}>▶</span>
      <span style={{ color: '#6b7280' }}>{dir}</span>
      <span style={{ color: isLibraryPath(entry.path) ? '#9ca3af' : '#f1f5f9', fontWeight: 600 }}>{file}</span>
    </button>
  );
}

export interface HudProps {
  copied: string | null;
  copyOk: boolean;
  mappingOn: boolean;
  crumbs: LocEntry[];
  defaultLoc: string | null;
  onCopy: (loc: string) => void;
}

export function InspectorHud({ copied, copyOk, mappingOn, crumbs, defaultLoc, onCopy }: HudProps) {
  return (
    <div
      data-devinspector
      style={{
        position: 'fixed', left: 12, bottom: 12, maxWidth: 460, pointerEvents: 'auto', font: `12px/1.5 ${MONO}`, color: '#e5e7eb',
        background: 'rgba(17,24,39,.94)', border: `1px solid ${ACCENT}66`, borderRadius: 8, padding: '8px 10px',
        boxShadow: '0 8px 28px rgba(0,0,0,.5)',
      }}
    >
      <div style={{ color: copied ? (copyOk ? OK : '#fca5a5') : ACCENT, fontWeight: 700, marginBottom: 4 }}>
        {copied ? (copyOk ? 'Copied ✓' : 'Copy failed') : '⌖ DevInspector'}
      </div>
      {copied ? (
        <div style={{ wordBreak: 'break-all' }}>{copied}</div>
      ) : !mappingOn ? (
        <div style={{ color: '#fca5a5', lineHeight: 1.6 }}>
          Source mapping is OFF. Relaunch with:
          <div style={{ color: ACCENT, marginTop: 2 }}>npm run dev:inspect</div>
        </div>
      ) : crumbs.length ? (
        crumbs.map((c, i) => (
          <CrumbRow key={`${c.loc}-${i}`} entry={c} isDefault={c.loc === defaultLoc} onCopy={onCopy} />
        ))
      ) : (
        <div style={{ color: '#9ca3af' }}>Hover a component…</div>
      )}
      <div style={{ color: '#6b7280', marginTop: 6, fontSize: 11 }}>
        right-click: call site · Alt+right-click: this element · click a row · Esc: exit
      </div>
    </div>
  );
}
