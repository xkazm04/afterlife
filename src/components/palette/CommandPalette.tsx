'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { onEscape } from '@/components/overlays/escapeLayers';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { paletteItems, type PaletteItem } from './model/items';
import { paletteKey } from './model/keys';
import { rank } from './model/rank';
import { usePaletteProjects } from './projects';
import styles from './CommandPalette.module.css';

const KIND_WORD: Record<PaletteItem['kind'], string> = { screen: 'Screen', action: 'Action', project: 'Project' };

/**
 * Go to anything: ⌘K (Ctrl+K) opens it anywhere in the app. Type a screen, an action of the loop or a project
 * (by name or group); ↑↓ move, Enter goes, Esc closes, Tab stays in the field. A combobox over a listbox; it only navigates, never writes.
 * The projects are read on the first open (projects.ts), not carried in the shell: until they land a row says so.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { status, projects } = usePaletteProjects(open);
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const items = useMemo(() => paletteItems(projects), [projects]);
  const hits = useMemo(() => rank(items, q), [items, q]);

  const show = () => {
    setQ('');
    setAt(0);
    setOpen(true);
  };
  useHotkeys([{ key: 'k', mod: true, handler: () => (open ? setOpen(false) : show()) }]);
  useEffect(() => {
    window.addEventListener('afterlife:palette', show);
    return () => window.removeEventListener('afterlife:palette', show);
  }, []);
  // focus the field on open, and hand focus back to where it was on close. Escape goes through the overlay layers: the
  // palette opens over a sheet, a popover or a menu, and is the one layer Escape must close.
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    input.current?.focus();
    const off = onEscape(() => setOpen(false));
    return () => {
      off();
      back?.focus?.();
    };
  }, [open]);
  // the list holds more rows than it shows (19 with nothing typed, 360px tall): keep the highlighted one in sight
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [open, at, hits]);
  // the highlighted row is where Enter goes: prefetch it once the highlight rests (arrows, hover), not per keystroke
  const target = open ? hits[at]?.href : undefined;
  useEffect(() => {
    if (!target) return;
    const t = setTimeout(() => router.prefetch(target), 120);
    return () => clearTimeout(t);
  }, [target, router]);

  if (!open) return null;
  const go = (it: PaletteItem | undefined) => {
    if (!it) return;
    setOpen(false);
    startTransition(() => router.push(it.href));
  };
  const onKey = (e: KeyboardEvent) => {
    const act = paletteKey(e.key, at, hits.length);
    if (!act) return;
    e.preventDefault();
    if ('at' in act) setAt(act.at);
    else if ('go' in act) go(hits[at]);
  };
  const active = hits[at];
  return (
    <div className={styles.veil} onMouseDown={() => setOpen(false)}>
      <div className={styles.box} role="dialog" aria-modal="true" aria-label="Go to" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={input}
          className={styles.input}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={active ? `pal-${active.id}` : undefined}
          aria-autocomplete="list"
          placeholder="Go to a screen, an action or a project…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAt(0);
          }}
          onKeyDown={onKey}
        />
        <ul ref={list} id="palette-list" className={styles.list} role="listbox" aria-label="Results">
          {hits.map((it, i) => (
            <li
              key={it.id}
              id={`pal-${it.id}`}
              role="option"
              aria-selected={i === at}
              className={styles.item}
              data-kind={it.kind}
              onMouseMove={() => setAt(i)}
              onClick={() => go(it)}
            >
              <span className={styles.kind}>{KIND_WORD[it.kind]}</span>
              <span className={styles.label}>{it.label}</span>
              <span className={styles.hint}>{it.hint}</span>
            </li>
          ))}
          {status !== 'ready' ? <li className={styles.none}>{status === 'loading' ? 'Loading projects...' : 'Projects could not be read; reopen to try again.'}</li> : null}
          {hits.length === 0 && status === 'ready' ? <li className={styles.none}>Nothing matches “{q}”.</li> : null}
        </ul>
        <div className={styles.foot}>
          <span>↑↓ move</span>
          <span>↵ go</span>
          <span>esc close</span>
          <span className={styles.push}>{status === 'ready' ? `${projects.length} projects` : 'projects loading'} · every screen</span>
        </div>
      </div>
    </div>
  );
}

/** Open the palette from anywhere (a button, a menu) without a key. */
export const openPalette = () => window.dispatchEvent(new Event('afterlife:palette'));
