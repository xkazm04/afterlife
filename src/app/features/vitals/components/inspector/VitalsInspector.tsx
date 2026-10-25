import type { AdjustmentRow, VitalsView } from '../../model/types';
import styles from '../../vitals.module.css';
import { adjustmentId } from '../bands/AdjustmentsBand';
import { variantId } from '../bands/DeliveryBand';
import { signalId } from '../bands/ProductionBand';
import { AdjustmentInspector } from './AdjustmentInspector';
import { SignalInspector } from './SignalInspector';
import { VariantInspector } from './VariantInspector';

/** The inspector for the picked row of any band: a variant, a signal or an adjustment. */
export function VitalsInspector({ view, picked, onQueue }: { view: VitalsView; picked: string | null; onQueue?: (row: AdjustmentRow) => void }) {
  const variant = view.delivery.find((r) => variantId(r.id) === picked);
  if (variant) return <VariantInspector row={variant} />;
  const signal = view.production?.find((r) => signalId(r.signal) === picked);
  if (signal) return <SignalInspector row={signal} />;
  const adj = view.adjustments.find((r) => adjustmentId(r.claim.id) === picked);
  if (adj) return <AdjustmentInspector row={adj} slug={view.slug} onQueue={onQueue ?? (() => {})} />;
  return <p className={styles.note}>Select a variant, a signal or an adjustment.</p>;
}
