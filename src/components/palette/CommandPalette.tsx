'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { paletteItems, type PaletteItem, type ProjectRef } from './model/items';
import { rank } from './model/rank';
import styles from './CommandPalette.module.css';

const KIND_WORD: Record<PaletteItem['kind'], string> = { screen: 'Screen', action: 'Action', project: 'Project' };

/**
 * Go to anything: ⌘K (Ctrl+K) opens it anywhere in the app. Type a screen, an action of the loop or a project
 * (by name or group); ↑↓ move, Enter goes, Esc closes. A combobox over a listbox; it only navigates, never writes.
 */
export function CommandPalette({ projects }: { projects: readonly ProjectRef[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
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
  // focus the field on open, and hand focus back to where it was on close
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    input.current?.focus();
    return () => back?.focus?.();
  }, [open]);

  if (!open) return null;
  const go = (it: PaletteItem | undefined) => {
    if (!it) return;
    setOpen(false);
    router.push(it.href);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') setAt((i) => Math.min(hits.length - 1, i + 1));
    else if (e.key === 'ArrowUp') setAt((i) => Math.max(0, i - 1));
    else if (e.key === 'Enter') go(hits[at]);
    else return;
    e.preventDefault();
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
        <ul id="palette-list" className={styles.list} role="listbox" aria-label="Results">
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
          {hits.length === 0 ? <li className={styles.none}>Nothing matches “{q}”.</li> : null}
        </ul>
        <div className={styles.foot}>
          <span>↑↓ move</span>
          <span>↵ go</span>
          <span>esc close</span>
          <span className={styles.push}>{projects.length} projects · every screen</span>
        </div>
      </div>
    </div>
  );
}

/** Open the palette from anywhere (a button, a menu) without a key. */
export const openPalette = () => window.dispatchEvent(new Event('afterlife:palette'));
