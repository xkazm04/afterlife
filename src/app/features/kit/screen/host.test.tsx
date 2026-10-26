import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/kit', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
const { screens } = await import('./host');
const { KitScreen } = await import('../KitScreen');

describe('the kit on the screen host', () => {
  it('is claimed, static (no slice), drawn by KitScreen itself', () => {
    expect(screens).toHaveLength(1);
    expect(screens[0]).toMatchObject({ key: 'kit', ready: true, slices: [], Frame: KitScreen });
    expect(screens[0]?.title({}, new URLSearchParams())).toBe('Belay kit');
  });
});
