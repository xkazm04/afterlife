import { describe, expect, it } from 'vitest';
import { cloudProvider, probeOwner } from './registry';

describe('cloudProvider', () => {
  it('hands out the adapter the kind names', () => {
    expect(cloudProvider('azure-app-insights').kind).toBe('azure-app-insights');
    expect(cloudProvider('azure-log-analytics').kind).toBe('azure-log-analytics');
  });
});

describe('probeOwner', () => {
  it('routes each cloud probe to its own provider', () => {
    expect(probeOwner('az-appinsights-query')).toBe('azure-app-insights');
    expect(probeOwner('az-loganalytics-workspace')).toBe('azure-log-analytics');
    expect(probeOwner('az-loganalytics-query')).toBe('azure-log-analytics');
  });
});
