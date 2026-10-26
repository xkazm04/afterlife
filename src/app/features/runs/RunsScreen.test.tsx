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

  it('draws the totals, the skipped badge, and every lane with its wave, costliest first', () => {
    const out = renderToStaticMarkup(<RunsScreen data={data} />);
    expect(out).toContain('3 skipped lines');
    expect(out).toContain('Every lane of every wave');
    expect(out).toContain('50%');
    expect(out).toContain('alpha, wave 1, belay/wave-1');
    const order = ['Fix the flaky retry', 'Trim the changelog', 'Bump the lockfile'].map((t) => out.indexOf(t));
    expect(order.every((i, k) => i > 0 && (k === 0 || i > order[k - 1]!))).toBe(true); // $0.25, $0.01, then no cost
    expect(out).toContain('needs a person to pick a version');
    expect(out).toContain('3m 0s'); // lane a's own wall
  });

  it('the wave goes first, then the lane; the outcome filter counts each kind', () => {
    const out = renderToStaticMarkup(<RunsScreen data={data} />);
    expect(out.indexOf('>Wave<')).toBeLessThan(out.indexOf('>Lane<'));
    expect(out).toContain('Lane outcome');
    for (const l of ['All', 'Landed', 'Parked', 'Running']) expect(out).toContain(`>${l}<`);
    expect(out).not.toContain('>Failed<'); // no lane failed: no option for it
  });

  it("a wave is mergeable only when the desk says there is something to take; before that, git was not asked", () => {
    const need = { kind: 'merge-wave' as const, id: 'merge:alpha:1', repo: 'alpha', wave: 1, branch: 'belay/wave-1', base: 'main', landed: 1, checked: true, commands: [] };
    const unread = renderToStaticMarkup(<RunsScreen data={data} />);
    expect(unread).toContain('mergeable, git not asked yet');
    expect(unread).toContain('running');
    expect(renderToStaticMarkup(<RunsScreen data={data} merges={[need]} />)).toMatch(/>mergeable</);
    const none = renderToStaticMarkup(<RunsScreen data={data} merges={[]} />);
    expect(none).toContain('in its base, or branch gone');
    expect(none).not.toMatch(/>mergeable</);
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
