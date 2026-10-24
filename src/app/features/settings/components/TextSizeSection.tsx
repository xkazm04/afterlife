'use client';

import { SegmentedControl, type SegmentOption } from '@/components/controls/toolbar/SegmentedControl';
import { DEFAULT_TEXT_SIZE, TEXT_SIZES, TEXT_SIZE_LABEL, TEXT_SIZE_SPEC, type TextSize } from '@/lib/settings/textSize';
import { useTextSize, useTextSizeSaved } from '@/lib/settings/useTextSize';
import { saveNote } from '../model/saveNote';
import { specRows } from '../model/specRows';
import { SettingsSection } from './SettingsSection';
import { SizePreview } from './SizePreview';
import styles from './TextSizeSection.module.css';

const OPTIONS: readonly SegmentOption<TextSize>[] = TEXT_SIZES.map((t) => ({
  value: t,
  label: TEXT_SIZE_LABEL[t],
  title: `${TEXT_SIZE_LABEL[t]} (${TEXT_SIZE_SPEC[t].body} px body${t === DEFAULT_TEXT_SIZE ? ', the default' : ''})`,
}));

/** D10: the 3-way text-size control, the scale table and a live preview that restyles as you choose. */
export function TextSizeSection() {
  const [size, setSize] = useTextSize();
  const saved = useTextSizeSaved();
  const rows = specRows();
  return (
    <SettingsSection id="text-size" title="Text size">
      <div className={styles.line}>
        <SegmentedControl label="Text size" options={OPTIONS} value={size} onChange={setSize} />
        <span className={styles.note}>{saveNote(saved, TEXT_SIZE_LABEL[DEFAULT_TEXT_SIZE])}</span>
      </div>
      <table className={styles.spec} aria-label="What each text size changes">
        <thead>
          <tr>
            <th scope="col">Measure</th>
            {TEXT_SIZES.map((t) => (
              <th key={t} scope="col" className={t === size ? styles.cur : undefined}>
                {TEXT_SIZE_LABEL[t]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              {TEXT_SIZES.map((t) => (
                <td key={t} className={t === size ? styles.cur : undefined}>
                  {r.values[t]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <SizePreview />
    </SettingsSection>
  );
}
