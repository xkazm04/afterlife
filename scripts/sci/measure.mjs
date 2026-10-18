#!/usr/bin/env node
// SCI and economics per proven MR (DECISIONS.md D6), from a GitLab jobs export. Reads a file and writes a file; it never
// calls GitLab (the export is the operator's, see README.md). Run:
//   node scripts/sci/measure.mjs --input <jobs.json> [--out <report.json>] [--region us-east1] [--proven 7,9]
//     [--projects N] [--poll-hours H] [--mr-updates N] [--judge-input-tokens N] [--judge-output-tokens N] [--book <coefficients.json>]
//   node scripts/sci/measure.mjs --list-ids --input <pipelines.json>   prints the pipeline ids of a pipelines export, one per line
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize, parseDocuments, rawJobs } from './jobs.mjs';
import { measure } from './sci.mjs';
import { table } from './table.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const NUMBERS = { '--projects': 'projects', '--poll-hours': 'pollHours', '--mr-updates': 'mrUpdates', '--judge-input-tokens': 'judgeInputTokens', '--judge-output-tokens': 'judgeOutputTokens' };

function args(argv) {
  const a = { book: path.join(here, 'coefficients.json'), opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => {
      const x = argv[++i];
      if (x === undefined) throw new Error(`${k} needs a value`);
      return x;
    };
    if (k === '--input') a.input = v();
    else if (k === '--out') a.out = v();
    else if (k === '--book') a.book = v();
    else if (k === '--list-ids') a.listIds = true;
    else if (k === '--region') a.opts.region = v();
    else if (k === '--proven') a.opts.proven = v().split(',').map((s) => s.trim()).filter(Boolean);
    else if (k in NUMBERS) {
      const n = Number(v());
      if (!Number.isFinite(n) || n < 0) throw new Error(`${k} must be a number >= 0`);
      a.opts[NUMBERS[k]] = n;
    } else throw new Error(`unknown argument ${k}`);
  }
  if (!a.input) throw new Error('--input <file> is required');
  return a;
}

function main() {
  const a = args(process.argv.slice(2));
  const text = fs.readFileSync(a.input, 'utf8');
  if (a.listIds) {
    for (const doc of parseDocuments(text)) for (const p of Array.isArray(doc) ? doc : (doc.pipelines ?? [])) console.log(p.id);
    return;
  }
  const book = JSON.parse(fs.readFileSync(a.book, 'utf8'));
  const { jobs, unfinished } = normalize(rawJobs(text), book.runner);
  if (jobs.length === 0) throw new Error(`no finished job in ${a.input}`);
  const report = { ...measure(jobs, book, { ...a.opts, unfinished }), input: path.basename(a.input), book: path.basename(a.book) };
  if (a.out) fs.writeFileSync(a.out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(table(report));
  if (a.out) console.log(`\nreport written to ${a.out}`);
}

try {
  main();
} catch (e) {
  console.error(`sci: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
