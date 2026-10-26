import { Button } from '@/components/controls/Button';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { Chip, type ChipTone } from '@/components/status/chip/Chip';
import type { Line, LineState } from '../../model/stack/lines';
import styles from './stack.module.css';
import cl from './checklist.module.css';

const TONE: Record<LineState, ChipTone> = { proposed: 'unknown', probing: 'pending', ok: 'ok', fail: 'bad', skipped: 'plain', finding: 'lag', you: 'you' };
const WORD: Record<LineState, string> = { proposed: 'proposed', probing: 'probing', ok: 'ok', fail: 'failed', skipped: 'skipped', finding: 'never ran', you: 'your step' };

/**
 * One checklist line: its state, what it is, and once probed the probe's one line. A failed line that names a re-login
 * is shown with that command and a Copy; a person's step shows the commands it names, with a Copy. Afterlife never
 * runs either for you.
 */
export function ChecklistLine({ line, onCopy }: { line: Line; onCopy: (command: string) => void }) {
  return (
    <li className={cl.line} data-state={line.state} aria-busy={line.state === 'probing' || undefined}>
      <Chip tone={TONE[line.state]} compact>
        {WORD[line.state]}
      </Chip>
      <div className={cl.lineBody}>
        <div className={cl.lineHead}>
          <span className={line.check ? cl.check : styles.label}>{line.label}</span>
          {line.detail ? <span className={styles.detail}>{line.detail}</span> : null}
        </div>
        {line.summary ? <div className={line.state === 'fail' ? styles.failText : styles.summary}>{line.summary}</div> : null}
        {line.relogin ? (
          <div className={cl.relogin}>
            <code>{line.relogin}</code>
            <Button size="mini" onClick={() => onCopy(line.relogin!)} title={`Copy ${line.relogin}: run it yourself, then Re-run`}>
              Copy
            </Button>
          </div>
        ) : null}
        {line.commands?.length ? (
          <div className={cl.commands}>
            <CommandBlock label={line.label} commands={line.commands} />
            <Button size="mini" onClick={() => onCopy(line.commands!.join('\n'))} title="Copy the commands: run them yourself, then Re-run">
              Copy
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
