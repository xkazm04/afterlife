import type { EquationTerm } from '../../model/verdict/equation';
import styles from './Term.module.css';

/**
 * One term of the verdict equation. Landed terms are buttons (select the check). A struck term is one a person decides,
 * and a dotted one has not been replayed yet. A term is never colour alone: the glyph says ✓ ✗ or ?.
 */
// kit-candidate: the prototype's equation term (.term), a bordered mono pill with ok / bad / unknown / off states.
export function Term({ term, onSelect }: { term: EquationTerm; onSelect: (id: string) => void }) {
  if (!term.landed) return <span className={`${styles.term} ${styles.off}`}>{term.id}</span>;
  const cls = [styles.term, styles[term.kind], term.selected ? styles.sel : ''].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} title={term.text} aria-pressed={term.selected} onClick={() => onSelect(term.id)}>
      {term.glyph} {term.id}
    </button>
  );
}
