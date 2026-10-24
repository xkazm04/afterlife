// Where the X-ray keeps its two per-browser facts in localStorage. Plain constants, so the Settings About page (a server
// component) can list them without importing the client store.
export const XRAY_SEEN_KEY = 'afterlife.xray.seen';
export const XRAY_FIRST_KEY = 'afterlife.xray.first-visit';
