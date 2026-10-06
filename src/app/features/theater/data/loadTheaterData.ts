// What the Theater route needs, read through the data source on the server.
import { getDataSource } from '@/server/data';
import type { TheaterDemo } from '../model/types';

export function loadTheaterData(): TheaterDemo {
  const ds = getDataSource();
  const tracks = ds.getTracks();
  const maturity = ds.getMaturity();
  return {
    stages: ds.getStages(),
    tracksArmed: tracks.filter((t) => t.armed).length,
    tracksTotal: tracks.length,
    loop: ds.getLoop(),
    rungNames: maturity.rungNames,
    rungs: maturity.rungs,
    // the untrusted line quoted from the seeded !44 (task 01J8Q9)
    quote: ds.getTasks().find((t) => t.mr === '!44')?.quote ?? '',
  };
}
