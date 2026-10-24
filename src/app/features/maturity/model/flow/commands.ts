/** The sheet title and the primary button: "Open 2 MRs as you". The commands themselves are the server's preview. */
export const sendLabel = (mrs: number): string => `Open ${mrs} MR${mrs === 1 ? '' : 's'} as you`;

/** The sheet title once the writes are sent and none are left: a receipt, not an instruction. */
export const sentLabel = (mrs: number): string => `Opened ${mrs} MR${mrs === 1 ? '' : 's'}`;
