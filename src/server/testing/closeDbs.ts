// Registry of embedded databases a test opened. A PGlite instance holds a WebAssembly heap until its worker exits, so
// without closing them a worker's memory only grows. Two lifetimes: a database opened while a test runs (or in
// beforeEach) is closed after that test; one opened outside any test (beforeAll) is kept until the file ends.
export type Closable = { close(): Promise<void> };

let inTest: () => boolean = () => true;
const perTest: Closable[] = [];
const perFile: Closable[] = [];

/** The setup file tells the registry how to tell "a test is running" from "a beforeAll is running". */
export function setScope(fn: () => boolean): void {
  inTest = fn;
}

/** Remember db for closing and return it. */
export function track<T extends Closable>(db: T): T {
  (inTest() ? perTest : perFile).push(db);
  return db;
}

async function closeList(list: Closable[]): Promise<void> {
  const open = list.splice(0);
  await Promise.all(open.map((db) => db.close().catch(() => undefined))); // already closed by the test itself
}

/** Close every database opened during the test that just ended. */
export const closeAll = (): Promise<void> => closeList(perTest);

/** Close the databases a beforeAll opened; runs when the file ends. */
export const closeFile = (): Promise<void> => closeList(perFile);
