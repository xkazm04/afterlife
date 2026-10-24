import { describe, expect, it } from 'vitest';
import { mapGroup, mapJob, mapPipeline, mapProject, mapRelease, mapUser, mapVulnerability } from '../../adapter/mappers';
import { mapMergeRequest } from '../../adapter/mappersMr';

const base = {
  id: 1, iid: 1, project_id: 1, username: 'u', name: 'n', path: 'p', path_with_namespace: 'g/p', status: 's', ref: 'main',
  sha: 'abc', created_at: 't', updated_at: 't', title: 't', severity: 'high', state: 'opened', source_branch: 'b',
  target_branch: 'main', tag_name: 'v1',
};
const BAD = ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', '//evil.example/x', 'not a url'];
const GOOD = 'https://gitlab.com/acme/p';

const mapped = (url: string) => [
  mapUser({ ...base, web_url: url }).webUrl, mapGroup({ ...base, web_url: url }).webUrl,
  mapProject({ ...base, web_url: url }).webUrl, mapPipeline({ ...base, web_url: url }).webUrl,
  mapJob({ ...base, web_url: url }).webUrl, mapMergeRequest({ ...base, web_url: url }).webUrl,
  mapRelease({ ...base, _links: { self: url } }).webUrl, mapVulnerability({ ...base, web_url: url }).webUrl,
];

describe('mappers: a GitLab address is http(s) or nothing', () => {
  it.each(BAD)('refuses %s at every web_url the mappers read', (url) => {
    expect(mapped(url)).toEqual(['', '', '', '', '', '', '', null]);
  });

  it('keeps an http(s) address as GitLab sent it', () => {
    expect(new Set(mapped(GOOD))).toEqual(new Set([GOOD]));
    expect(mapProject({ ...base, web_url: 'http://gitlab.internal/a' }).webUrl).toBe('http://gitlab.internal/a');
  });
});
