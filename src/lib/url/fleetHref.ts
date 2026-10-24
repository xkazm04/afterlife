/** A project's own Fleet page (/fleet/[project]), not the whole table. The one place that route is spelled. */
export const fleetHref = (id: string): string => `/fleet/${encodeURIComponent(id)}`;
