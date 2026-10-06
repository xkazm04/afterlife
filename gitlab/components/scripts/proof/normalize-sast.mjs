// Turns a GitLab security report (gl-sast-report.json, gl-dependency-scanning-report.json) into the rescan record the
// engine's exploit-test reads: {engine_version, finding_ids}. Run it on the base scan and on the head scan.
// [R?] The report fields used (scan.analyzer.name/version, scan.scanner.name/version, vulnerabilities[].id) are recalled
// from the security report schema, not read from the docs. Also open: a finding's id in a report is a per-scan UUID, so
// a stable finding key (location + identifiers) may be needed for "the same finding is gone at head".
import fs from 'node:fs';
import { arg, die, need } from '../lib/lib.mjs';

const report = JSON.parse(fs.readFileSync(need('report'), 'utf8'));
const tool = report.scan?.analyzer ?? report.scan?.scanner;
if (!tool?.name || !tool?.version) die('the report names no analyzer or scanner version');
const ids = (report.vulnerabilities ?? []).map((v) => String(v.id ?? '')).filter(Boolean);
fs.writeFileSync(arg('out', 'scan.json'), JSON.stringify({ engine_version: `${tool.name} ${tool.version}`, finding_ids: ids }, null, 2));
console.error(`belay: ${ids.length} finding(s) from ${tool.name} ${tool.version}`);
