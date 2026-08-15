import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const { PT } = load('complete.js');

test('harvests words of three or more characters', () => {
  assert.deepEqual(PT.complete.harvest('a an and ant'), ['and', 'ant']);
});

test('harvests consecutive capitalised words as one phrase', () => {
  const t = PT.complete.harvest('We target Unreal Engine and Claude Code today');
  assert.ok(t.includes('Unreal Engine'));
  assert.ok(t.includes('Claude Code'));
});

test('keeps single words alongside the phrase they form', () => {
  const t = PT.complete.harvest('Unreal Engine');
  assert.ok(t.includes('Unreal'));
  assert.ok(t.includes('Engine'));
  assert.ok(t.includes('Unreal Engine'));
});

test('does not treat a lone capitalised word as a phrase', () => {
  assert.equal(PT.complete.harvest('We target things').includes('We target'), false);
});

test('de-duplicates and preserves first-appearance order', () => {
  assert.deepEqual(PT.complete.harvest('alpha beta alpha gamma'), ['alpha', 'beta', 'gamma']);
});

test('harvests hyphen and underscore tokens whole', () => {
  const t = PT.complete.harvest('see TASK-AUDIT-01 and TASK_TESTING-02');
  assert.ok(t.includes('TASK-AUDIT-01'));
  assert.ok(t.includes('TASK_TESTING-02'));
});

test('handles empty and non-string input', () => {
  assert.deepEqual(PT.complete.harvest(''), []);
  assert.deepEqual(PT.complete.harvest(null), []);
});

test('candidates match prefix case-insensitively', () => {
  assert.deepEqual(PT.complete.candidates('unr', ['Unreal Engine', 'Unreal'], []),
    ['Unreal', 'Unreal Engine']);
});

test('bank terms rank above document terms', () => {
  assert.deepEqual(PT.complete.candidates('cla', ['Clause'], ['Claude Code']),
    ['Claude Code', 'Clause']);
});

test('shorter candidates rank first within a source', () => {
  assert.deepEqual(PT.complete.candidates('ta', ['tabletop', 'tab', 'table'], []),
    ['tab', 'table', 'tabletop']);
});

test('excludes an exact match for the prefix itself', () => {
  assert.deepEqual(PT.complete.candidates('tab', ['tab', 'table'], []), ['table']);
});

test('de-duplicates across the two sources', () => {
  assert.deepEqual(PT.complete.candidates('cla', ['Claude Code'], ['Claude Code']), ['Claude Code']);
});

test('an empty prefix yields no candidates', () => {
  assert.deepEqual(PT.complete.candidates('', ['alpha'], ['beta']), []);
});

test('returns an empty array when nothing matches', () => {
  assert.deepEqual(PT.complete.candidates('zzz', ['alpha'], []), []);
});
