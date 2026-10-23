import { Icon } from '@/components/icons/Icon';
import styles from './Checkbox.module.css';

/** The small amber checkbox (picked / staged items). A real button with role="checkbox"; space and enter toggle. */
export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  describedBy,
  title,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name; the row's text usually. */
  label: string;
  disabled?: boolean;
  /** Id of the element that says why (a disabled box's reason): rendered as aria-describedby. */
  describedBy?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      title={title}
      disabled={disabled}
      className={styles.cb}
      onClick={() => onChange(!checked)}
    >
      {checked ? <Icon name="check" /> : null}
    </button>
  );
}
