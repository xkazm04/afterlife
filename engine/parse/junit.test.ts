import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fx } from '../__tests__/helpers';
import { findCases, isRed, matchesTestId } from './cases';
import { decodeEntities, parseJUnit } from './junit';

describe('parseJUnit', () => {
  const base = parseJUnit(fs.readFileSync(fx('exploit', 'base.junit.xml'), 'utf8'));

  it('reads every testcase with its status, message and output', () => {
    expect(base.map((c) => [c.name, c.status])).toEqual([
      ['rejectsDotDotSegments()', 'failed'],
      ['rejectsSiblingStatementPrefix()', 'failed'],
      ['servesNormalStatementFile()', 'passed'],
    ]);
    expect(base[0]?.message).toContain('../../../etc/passwd');
    expect(base[0]?.output).toContain('StatementExportTraversalTest.kt:16');
    expect(base[0]?.classname).toBe('io.ledgerline.statements.StatementExportTraversalTest');
  });

  it('classifies error, skipped and self-closing cases, across nested suites', () => {
    const xml = `<testsuites><testsuite name="a"><testcase classname="A" name="e"><error message="boom">trace</error></testcase>
      <testcase classname="A" name="s"><skipped message="why"/></testcase><testcase classname="A" name="p"/></testsuite>
      <testsuite name="b"><testcase classname="B" name="f"><failure message="x &lt; y &amp;&amp; z">at B</failure><system-out>log &#65;</system-out></testcase></testsuite></testsuites>`;
    const cases = parseJUnit(xml);
    expect(cases.map((c) => c.status)).toEqual(['error', 'skipped', 'passed', 'failed']);
    expect(cases[3]?.message).toBe('x < y && z');
    expect(cases[3]?.output).toContain('log A');
  });

  it('tolerates comments, CDATA, single quotes, and unbalanced or truncated XML', () => {
    const cases = parseJUnit(`<?xml version='1.0'?><!-- <testcase name="ghost"/> --><testsuite><testcase name='a' classname='C'><failure message='m'><![CDATA[<raw & text>]]></failure></testcase></oops><testcase name="b" classname="C"`);
    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({ name: 'a', status: 'failed', message: 'm', output: '<raw & text>' });
    expect(parseJUnit('not xml at all')).toEqual([]);
    expect(parseJUnit('')).toEqual([]);
  });

  it('decodes numeric and named entities', () => {
    expect(decodeEntities('&lt;a&gt; &quot;q&quot; &apos;s&apos; &#x41;&#66; &amp;amp; &bogus;')).toBe('<a> "q" \'s\' AB &amp; &bogus;');
  });
});

describe('test id matching', () => {
  const cases = parseJUnit(fs.readFileSync(fx('exploit', 'base.junit.xml'), 'utf8'));
  it('matches a whole class, short or qualified', () => {
    expect(findCases(cases, 'StatementExportTraversalTest')).toHaveLength(3);
    expect(findCases(cases, 'io.ledgerline.statements.StatementExportTraversalTest')).toHaveLength(3);
    expect(findCases(cases, 'OtherTest')).toHaveLength(0);
  });
  it('matches one case by name, Class#name or Class.name, ignoring ()', () => {
    for (const id of ['rejectsDotDotSegments', 'rejectsDotDotSegments()', 'StatementExportTraversalTest#rejectsDotDotSegments', 'StatementExportTraversalTest.rejectsDotDotSegments', 'io.ledgerline.statements.StatementExportTraversalTest#rejectsDotDotSegments()']) {
      expect(findCases(cases, id).map((c) => c.name), id).toEqual(['rejectsDotDotSegments()']);
    }
  });
  it('does not match a different class that merely ends the same way', () => {
    expect(matchesTestId({ classname: 'x.MyStatementExportTraversalTest', name: 'a', status: 'passed', message: '', output: '' }, 'StatementExportTraversalTest')).toBe(false);
    expect(findCases(cases, 'Other#rejectsDotDotSegments')).toHaveLength(0);
  });
  it('knows red from green', () => {
    expect(cases.filter(isRed)).toHaveLength(2);
  });
});
