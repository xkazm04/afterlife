/** What the Display page says about keeping the size: saved, or applied for this visit only (storage refused it). */
export function saveNote(saved: boolean, defaultLabel: string): string {
  return saved
    ? `Saved in this browser. ${defaultLabel} is the default.`
    : `Not saved: this browser refused to store it, so it applies for this visit only. ${defaultLabel} is the default.`;
}
