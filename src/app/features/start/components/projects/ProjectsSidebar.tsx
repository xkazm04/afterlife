import { Icon } from '@/components/icons/Icon';
import { Unread } from '@/components/shell/host';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { HOST_LABEL } from '../../model/stack/format';
import { ADD_HREF, projectHref, projectsNote, type SavedProject } from '../../model/projects/saved';
import styles from './projects.module.css';

/**
 * /start's own sidebar sections: the projects saved on this machine (each opens its orbit), Add a project (the setup
 * orbit for a new one), and the demo estate's onboarding funnel, labelled as the invented estate it is. `projects`
 * undefined: not read yet, a dash, never "none saved". `selected`: the slug showing, null while adding.
 */
export function ProjectsSidebar({ projects, note, selected }: { projects?: readonly SavedProject[]; note?: string; selected: string | null }) {
  return (
    <>
      <SidebarSection title="Projects" aux={projects?.length ? String(projects.length) : undefined}>
        {projects === undefined ? (
          <p className={styles.note} aria-busy>
            <Unread label="saved projects not read yet" />
          </p>
        ) : null}
        {projects?.length === 0 ? <p className={styles.note}>{note ?? projectsNote.none}</p> : null}
        {projects?.map((p) => (
          <SidebarItem
            key={p.slug}
            icon={<Icon name="folder" />}
            label={p.name}
            count={HOST_LABEL[p.host.kind]}
            current={selected === p.slug}
            href={projectHref(p.slug)}
            title={`${p.name} · ${p.root}`}
          />
        ))}
        {projects?.length && note ? <p className={styles.note}>{note}</p> : null}
        <SidebarItem icon={<Icon name="onboard" />} label="Add a project" current={selected === null} href={ADD_HREF} title="Pick a repo: the setup orbit for a new project" />
      </SidebarSection>
      <SidebarSection title="Demo estate">
        <SidebarItem
          icon={<Icon name="setup" />}
          label="Onboarding"
          count="demo"
          href="/onboard/estate"
          title="The invented demo estate's onboarding funnel: illustrative projects, not yours"
        />
      </SidebarSection>
    </>
  );
}
