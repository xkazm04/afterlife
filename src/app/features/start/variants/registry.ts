// Which component renders each ?v= key. Each variant renders the StartView only (model/view.ts). A key mapped to null
// is not built yet: the screen shows Focus and says so. WP-D maps its key here, one line each.
import type { ComponentType } from 'react';
import type { StartView } from '../model/view';
import { FocusVariant } from './focus/FocusVariant';
import type { VariantKey } from './keys';

export const VARIANTS: Record<VariantKey, ComponentType<{ view: StartView }> | null> = {
  focus: FocusVariant,
  constellation: null,
  wire: null,
};
