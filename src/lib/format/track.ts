/**
 * A track as the screens and titles name it: "T1", and "T?" when the track is unknown (never a guessed number). One
 * rule for the event feed, the task list, and the promotion and re-admit titles.
 */
export const trackLabel = (track: number | null): string => (track === null ? 'T?' : `T${track}`);
