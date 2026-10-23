import type { ReactNode } from 'react';
import { Icon } from '@/components/icons/Icon';
import type { IconName } from '@/components/icons/glyphs';
import { TierMark } from '@/components/status/TierMark';

const icon = (name: IconName, color?: string) => <Icon name={name} style={color ? { color } : undefined} />;

/** Sidebar icons of the five smart filters (the prototype's drawings). */
export const SMART_ICONS: Readonly<Record<string, ReactNode>> = {
  promote: icon('promote', 'var(--needs-you)'),
  below: icon('below'),
  leased: icon('leased'),
  quar: <TierMark tier="quarantined" />,
  pending: icon('pending', 'var(--accent)'),
};
