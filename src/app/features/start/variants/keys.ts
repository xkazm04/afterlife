// The three presentations of /start, a prototype choice for one decision (?v=, Focus by default). Pure: the page reads
// it on the server, the switch on the client. Two are deleted once one is picked.
export const VARIANT_KEYS = ['focus', 'constellation', 'wire'] as const;
export type VariantKey = (typeof VARIANT_KEYS)[number];

export const VARIANT_LABEL: Record<VariantKey, string> = { focus: 'Focus', constellation: 'Constellation', wire: 'Wire' };

/** ?v= as a variant; anything else is Focus. */
export const parseVariant = (v: unknown): VariantKey => ((VARIANT_KEYS as readonly unknown[]).includes(v) ? (v as VariantKey) : 'focus');
