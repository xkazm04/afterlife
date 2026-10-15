import { describe, expect, it } from 'vitest';
import { enrollHref, enrollProjection, enrollTier, isTier } from './enroll';

describe('enrollment', () => {
  it('writes start_tier, never above the class ceiling', () => {
    expect(enrollTier('assisted', 'hands_off')).toBe('assisted');
    expect(enrollTier('supervised', 'assisted')).toBe('assisted');
    expect(enrollTier('assisted', 'quarantined')).toBe('quarantined');
  });

  it('projects nothing for a human-only class or an unread start_tier', () => {
    expect(enrollProjection('assisted', 'human_only')).toBeNull();
    expect(enrollProjection(null, 'hands_off')).toBeNull();
    expect(enrollProjection('assisted', 'supervised')).toBe('assisted');
  });

  it('reads a tier only, and links a known track only', () => {
    expect([isTier('assisted'), isTier('human_only'), isTier(undefined)]).toEqual([true, false, false]);
    expect([enrollHref('T4'), enrollHref('unknown'), enrollHref('T9')]).toEqual(['/setup/track-T4', null, null]);
  });
});
