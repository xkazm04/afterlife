import styles from './CommandBlock.module.css';

/** One line as parts: `code`, a trailing `note` after it, or a `note` alone (a dim comment line, no prompt). */
export interface CommandLineParts {
  code?: string;
  note?: string;
}
export type CommandLine = string | CommandLineParts;

/**
 * The exact command Belay will run, shown before anything runs (writes only on a click). One line per entry. A plain
 * string is a command, with a dim "$" prompt. `{ code, note }` adds a dim note after the command; `{ note }` alone is a
 * dim comment line ("# runs as @you"). `prompt={false}` drops the "$" (a script, or lines continued with "\").
 */
export function CommandBlock({
  commands,
  label = 'Command',
  prompt = true,
}: {
  commands: string | readonly CommandLine[];
  label?: string;
  prompt?: boolean;
}) {
  const lines = typeof commands === 'string' ? [commands] : commands;
  return (
    <pre className={styles.cmd} aria-label={label}>
      {lines.map((l, i) => {
        const { code, note }: CommandLineParts = typeof l === 'string' ? { code: l } : l;
        return (
          <span key={i} className={styles.line}>
            {code ? (
              <>
                {prompt ? <span className={styles.prompt}>$ </span> : null}
                {code}
              </>
            ) : null}
            {note ? <span className={styles.note}>{code ? `   ${note}` : note}</span> : null}
            {'\n'}
          </span>
        );
      })}
    </pre>
  );
}
