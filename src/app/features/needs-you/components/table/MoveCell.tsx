import { HonestyChip } from '@/components/status/chip/HonestyChip';
import type { MoveView } from '../../model/rows/rowData';
import { Chip } from '@/components/status/chip/Chip';
import { GradeChip } from '../shared/GradeChip';
import { RungMove, TierMove } from '../shared/MoveMarks';

/** What moves: a tier, a maturity rung, the packet grade, or a plain state chip. */
export function MoveCell({ move }: { move: MoveView }) {
  switch (move.kind) {
    case 'tiers':
      return <TierMove from={move.from} to={move.to} />;
    case 'rungs':
      return <RungMove from={move.from} to={move.to} />;
    case 'grade':
      return <GradeChip state={move.done ? 'done' : 'cur'}>{move.label}</GradeChip>;
    case 'chip':
      if (move.tone === 'unknown') {
        return (
          <span title={move.title}>
            <HonestyChip kind="unknown">{move.label}</HonestyChip>
          </span>
        );
      }
      return <Chip compact tone={move.tone === 'ok' ? 'ok' : 'plain'}>{move.label}</Chip>;
  }
}
