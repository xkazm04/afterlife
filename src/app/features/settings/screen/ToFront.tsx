'use client';

import { useLayoutEffect } from 'react';
import { useHostNav } from '@/components/shell/host';
import { SETTINGS_FRONT } from '../model/settingsNav';

/**
 * /settings has no page of its own: the first sub-page is its front. A client constant, no read: the URL is replaced
 * before paint, and the screen host draws Display in place (the router does when the host is not mounted).
 */
export function ToSettingsFront() {
  const { replace } = useHostNav();
  useLayoutEffect(() => replace(SETTINGS_FRONT), [replace]);
  return null;
}
