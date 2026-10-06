import { DayStrip } from '@/components/viz/DayStrip';
import { ProofBar } from '@/components/viz/ProofBar';
import { RungGlyph } from '@/components/viz/RungGlyph';
import { StageMeter } from '@/components/viz/StageMeter';
import { StageTicks } from '@/components/viz/StageTicks';
import { getStages } from '@/lib/demo';
import { GallerySection } from './GallerySection';
import { Specimen } from './Specimen';

export function VizGallery() {
  return (
    <GallerySection title="viz/">
      <Specimen label="StageTicks rungs 0..4, with unknown">
        <StageTicks rungs={[0, 1, 2, 3, 4, null, 2, 1, null]} labels={getStages()} />
      </Specimen>
      <Specimen label="StageMeter 0..4 / unknown / with number">
        {[0, 1, 2, 3, 4].map((r) => (
          <StageMeter key={r} rung={r} />
        ))}
        <StageMeter rung={null} />
        <StageMeter rung={3} showNumber />
      </Specimen>
      <Specimen label="StageMeter deep (lit bars green: R3 and above have evidence)">
        {[0, 1, 2, 3, 4].map((r) => (
          <StageMeter key={r} rung={r} deep={r >= 3} />
        ))}
        <StageMeter rung={null} deep />
      </Specimen>
      <Specimen label="ProofBar mixed / all pass / fails / empty / unknown">
        <ProofBar proofs={{ pass: 31, fail: 2, inconclusive: 1 }} />
        <ProofBar proofs={{ pass: 12, fail: 0, inconclusive: 0 }} />
        <ProofBar proofs={{ pass: 5, fail: 3, inconclusive: 0 }} />
        <ProofBar proofs={{ pass: 0, fail: 0, inconclusive: 0 }} />
        <ProofBar proofs={null} />
      </Specimen>
      <Specimen label="ProofBar block (inspector)">
        <div style={{ width: 200 }}>
          <ProofBar proofs={{ pass: 31, fail: 2, inconclusive: 4 }} block />
        </div>
      </Specimen>
      <Specimen label="RungGlyph now / ceiling">
        <RungGlyph tier="supervised" ceiling="hands_off" />
        <RungGlyph tier="hands_off" ceiling="hands_off" />
        <RungGlyph tier="quarantined" ceiling="assisted" />
        <RungGlyph tier="human_only" ceiling="human_only" />
      </Specimen>
      <Specimen label="DayStrip 14 / 6 / 0 reverted / no record">
        <DayStrip clean={14} />
        <DayStrip clean={6} />
        <DayStrip clean={0} revertedToday />
        <DayStrip clean={null} />
      </Specimen>
    </GallerySection>
  );
}
