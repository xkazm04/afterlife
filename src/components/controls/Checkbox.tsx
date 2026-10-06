import { Icon } from '@/components/icons/Icon';
import styles from './Checkbox.module.css';

/** The small amber checkbox (picked / staged items). A real button with role="checkbox"; space and enter toggle. */
export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name; the row's text usually. */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={styles.cb}
      onClick={() => onChange(!checked)}
    >
      {checked ? <Icon name="check" /> : null}
    </button>
  );
}
