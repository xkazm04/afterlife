import type { ComponentType } from 'react';
import { GatesEntrance } from './gates/GatesEntrance';
import { IrisEntrance } from './iris/IrisEntrance';
import { VaultEntrance } from './vault/VaultEntrance';
import type { EntranceId, EntranceProps } from './types';

/** The three prototypes, side by side until one is picked. */
export const ENTRANCES: Readonly<Record<EntranceId, { name: string; Door: ComponentType<EntranceProps> }>> = {
  a: { name: 'Vault', Door: VaultEntrance },
  b: { name: 'Treasure gates', Door: GatesEntrance },
  c: { name: 'Hex iris', Door: IrisEntrance },
};

export const DEFAULT_ENTRANCE: EntranceId = 'a';

/** `?entrance=` to a prototype: a, b or c; off (or anything unknown that says off) shows none; absent is the default. */
export function entranceOf(param: string | string[] | undefined): EntranceId | null {
  const v = Array.isArray(param) ? param[0] : param;
  if (v === 'off') return null;
  return v === 'a' || v === 'b' || v === 'c' ? v : DEFAULT_ENTRANCE;
}
