import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import type { Stage } from '@/schemas';
import type { RouteView } from '../../model/crag/routes';
import { capitalize, rungText } from '../../model/rungs';
import { GapBadge } from '../marks/GapBadge';
import { RungMeter } from '../marks/RungMeter';

/** The nine stages as a source list: rung meter, name, and the rung (or the picked gap's id, which waits for you). */
export function StageList({
  routes,
  pickedByStage,
  selected,
  onSelect,
}: {
  routes: readonly RouteView[];
  /** The id of the picked, unsent gap on each stage that has one. */
  pickedByStage: Readonly<Partial<Record<Stage, string>>>;
  selected: Stage;
  onSelect: (stage: Stage) => void;
}) {
  return (
    <SidebarSection title="Stages">
      <div data-stagelist="" role="group" aria-label="Stages">
        {routes.map((v) => {
          const gap = pickedByStage[v.stage];
          return (
            <SidebarItem
              key={v.stage}
              icon={<RungMeter rung={v.lv} />}
              label={capitalize(v.stage)}
              count={gap ? <GapBadge>{gap}</GapBadge> : rungText(v.lv)}
              current={selected === v.stage}
              onClick={() => onSelect(v.stage)}
            />
          );
        })}
      </div>
    </SidebarSection>
  );
}
