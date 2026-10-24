// Vitest setup file: close every tracked embedded database after each test, and per-file ones when the file ends.
// A test is running when expect has a current test name; inside a beforeAll it has none.
import { afterAll, afterEach, expect } from 'vitest';
import { closeAll, closeFile, setScope } from './closeDbs';

setScope(() => Boolean(expect.getState().currentTestName));
afterEach(() => closeAll());
afterAll(() => closeFile());
