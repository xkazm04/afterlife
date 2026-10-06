import type { Ref } from 'react';
import { Icon } from '@/components/icons/Icon';
import styles from './SearchField.module.css';

/**
 * The toolbar search box with a "/" hint that disappears once there is text. Controlled. Pass `inputRef` so the
 * screen can focus it on "/" and clear it on Escape.
 */
export function SearchField({
  value,
  onChange,
  placeholder = 'Search',
  label,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name, e.g. "Search projects". */
  label?: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <label className={styles.search}>
      <Icon name="search" className={styles.ico} />
      <input
        ref={inputRef}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? null : <kbd>/</kbd>}
    </label>
  );
}
