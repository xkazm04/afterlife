import { describe, expect, it } from 'vitest';
import { childExit } from './childExit.mjs';

describe('childExit', () => {
  it('passes a real status through without a message', () => {
    expect(childExit('run', { status: 1, signal: null })).toEqual({ code: 1, message: null });
    expect(childExit('run', { status: 0, signal: null })).toEqual({ code: 0, message: null });
  });
  it('SIGTERM is 143 and SIGINT is 130, each with one line saying so', () => {
    expect(childExit('run', { status: null, signal: 'SIGTERM' })).toEqual({ code: 143, message: 'belay run: stopped by SIGTERM' });
    expect(childExit('run', { status: null, signal: 'SIGINT' })).toEqual({ code: 130, message: 'belay run: stopped by SIGINT' });
  });
  it('a spawn that never started reports its error and exits 2', () => {
    const r = childExit('doctor', { status: null, signal: null, error: new Error('spawn ENOENT') });
    expect(r).toEqual({ code: 2, message: 'belay doctor: spawn ENOENT' });
  });
  it('no status, no signal, no error stays 2', () => {
    expect(childExit('scan', { status: null, signal: null }).code).toBe(2);
  });
});
