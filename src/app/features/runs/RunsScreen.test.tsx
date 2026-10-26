// No DOM here: the screen is rendered to markup for the fixture's data and for none.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WAVE_1, WAVE_2_RUNNING } from '@/lib/runs/fixture';
import { foldRuns, foldWave } from '@/lib/runs/fold';
import { parseRunLine } from '@/lib/runs/parse';
import type { RunEvent } from '@/schemas/run/run';

vi.mock('next/navigation', () => ({ usePathname: () => '/runs', useRouter: () => ({ push: () => {} }) }));
const { RunsScreen } = await import('./RunsScreen');
const { MergePanel } = await import('./components/MergePanel');

const ev = (l: string[]) => l.map(parseRunLine).filter((e): e is RunEvent => e !== null);
const data = foldRuns([foldWave(ev(WAVE_1), true)!, foldWave(ev(WAVE_2_RUNNING), false)!], 3);

describe('RunsScreen', () => {
  it('names the command and the folder when there are no runs', () => {
    const out = renderToStaticMarkup(<RunsScreen data={foldRuns([], 0)} />);
    expect(out).toContain('No runs yet');
    expect(out).toContain('afterlife run --repo &lt;slug&gt;');
    expect(out).toContain('.afterlife/runs/');
    expect(out).not.toContain('skipped line');
  });

  it('draws the totals, the skipped badge, the waves and their chips', () => {
    const out = renderToStaticMarkup(<RunsScreen data={data} />);
    expect(out).toContain('3 skipped lines');
    expect(out).toContain('alpha');
    expect(out).toContain('Wave 2');
    expect(out).toContain('running');
    expect(out).toContain('mergeable');
    expect(out).toContain('belay/wave-1');
    expect(out).toContain('50%');
    expect(out).toContain('6m 0s'); // wave 1's wall: wave.start 10:00:00 to wave.end 10:06:00
  });

  it('shows the exact merge commands for a mergeable wave, and nothing for a running one', () => {
    const [w2, w1] = data.repos[0]!.waves;
    const out = renderToStaticMarkup(<MergePanel w={w1!} />);
    expect(out).toContain('git -C alpha merge --ff-only belay/wave-1');
    expect(out).toContain('git -C alpha push');
    expect(renderToStaticMarkup(<MergePanel w={w2!} />)).toBe('');
  });

  it("with the desk's merges: the fleet path's commands, or nothing to merge when the wave is in", () => {
    const w1 = data.repos[0]!.waves[1]!;
    const need = { kind: 'merge-wave' as const, id: 'merge:alpha:1', repo: 'alpha', wave: 1, branch: 'belay/wave-1', base: 'main', path: '/w/alpha', landed: 1, checked: true, commands: ['git -C /w/alpha switch main', 'git -C /w/alpha merge --ff-only belay/wave-1', 'git -C /w/alpha push'] };
    expect(renderToStaticMarkup(<MergePanel w={w1} needs={[need]} />)).toContain('git -C /w/alpha merge --ff-only belay/wave-1');
    expect(renderToStaticMarkup(<MergePanel w={w1} needs={[]} />)).toContain('nothing to merge');
  });

  it('an invalid fleet.yml is named with its error, not read as the repo missing from it', () => {
    const w1 = data.repos[0]!.waves[1]!;
    const need = { kind: 'merge-wave' as const, id: 'merge:alpha:1', repo: 'alpha', wave: 1, branch: 'belay/wave-1', base: 'main', landed: 1, checked: false, commands: ['git -C alpha switch main'] };
    const bad = renderToStaticMarkup(<MergePanel w={w1} needs={[need]} fleetError='repos[1]: duplicate slug "a"' />);
    expect(bad).toContain('.afterlife/fleet.yml is invalid (repos[1]: duplicate slug &quot;a&quot;)');
    expect(bad).not.toContain('not in .afterlife/fleet.yml');
    expect(renderToStaticMarkup(<MergePanel w={w1} needs={[need]} />)).toContain('The repo is not in .afterlife/fleet.yml');
  });

  it('writes nothing: no button, only text', () => {
    expect(renderToStaticMarkup(<RunsScreen data={data} />)).not.toContain('<button class="Button');
  });
});
