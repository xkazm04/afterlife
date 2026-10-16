/** The route of one task. The id is a path segment: encoded, as `/task` and the fleet's task list already do. */
export const taskHref = (id: string): string => `/task/${encodeURIComponent(id)}`;
