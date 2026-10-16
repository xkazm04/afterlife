import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { StageMeter } from '@/components/viz/StageMeter';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import type { Stage } from '@/schemas';
import type { RouteView } from '../../model/crag/routes';
import { capitalize, rungText } from '../../model/rungs';

/** The picked, unsent gap on each stage, from `pending` (the screen's one definition of waiting; the last gap on a stage wins). */
export function pickedByStage(pending: readonly string[], ctx: { gap: (id: string) => { id: string; stage: Stage } | undefined }): Partial<Record<Stage, string>> {
  const out: Partial<Record<Stage, string>> = {};
  for (const id of pending) {
    const g = ctx.gap(id);
    if (g) out[g.stage] = g.id;
  }
  return out;
}

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
              icon={<StageMeter rung={v.lv} deep={v.deep} />}
              label={capitalize(v.stage)}
              count={gap ? <NeedsYouBadge small variant="group" label={gap} title="gap picked, waits for you" /> : rungText(v.lv)}
              current={selected === v.stage}
              onClick={() => onSelect(v.stage)}
            />
          );
        })}
      </div>
    </SidebarSection>
  );
}
