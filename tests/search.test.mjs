import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const { PT } = load('search.js');

const mk = () => ({
  version: 1, bank: [],
  prompts: [
    { id: 'p_1', name: 'Regime classifier', kind: 'filled', created: 1, updated: 10, sections: [
      { id: 's_1', tag: 'role', body: 'You are a quant', include: true },
      { id: 's_2', tag: 'goal', body: 'Build a gap scanner', include: true }] },
    { id: 'p_2', name: 'Blank brief', kind: 'template', created: 2, updated: 20, sections: [
      { id: 's_3', tag: 'role', body: '', include: true },
      { id: 's_4', tag: 'context', body: 'Unreal Engine project', include: true }] }
  ]
});

test('prompts match on name', () => {
  assert.deepEqual(PT.search.prompts(mk(), 'regime', {}).map((p) => p.id), ['p_1']);
});

test('prompts match on any section body', () => {
  assert.deepEqual(PT.search.prompts(mk(), 'gap scanner', {}).map((p) => p.id), ['p_1']);
});

test('prompts filter by kind', () => {
  assert.deepEqual(PT.search.prompts(mk(), '', { kind: 'template' }).map((p) => p.id), ['p_2']);
});

test('an empty query returns every prompt, newest first', () => {
  assert.deepEqual(PT.search.prompts(mk(), '', {}).map((p) => p.id), ['p_2', 'p_1']);
});

test('search is case-insensitive', () => {
  assert.equal(PT.search.prompts(mk(), 'REGIME', {}).length, 1);
});

test('no match returns an empty array', () => {
  assert.deepEqual(PT.search.prompts(mk(), 'nothing here', {}), []);
});

test('sections match on body and carry their prompt', () => {
  const hits = PT.search.sections(mk(), 'unreal', {});
  assert.equal(hits.length, 1);
  assert.equal(hits[0].promptId, 'p_2');
  assert.equal(hits[0].promptName, 'Blank brief');
  assert.equal(hits[0].section.tag, 'context');
});

test('sections match on tag', () => {
  assert.deepEqual(PT.search.sections(mk(), 'goal', {}).map((h) => h.section.id), ['s_2']);
});

test('sections filter by tag, newest prompt first', () => {
  assert.deepEqual(PT.search.sections(mk(), '', { tag: 'role' }).map((h) => h.section.id), ['s_3', 's_1']);
});

test('tags lists distinct tags, most used first', () => {
  assert.deepEqual(PT.search.tags(mk()), ['role', 'goal', 'context']);
});

test('an empty store yields empty results', () => {
  const s = { version: 1, prompts: [], bank: [] };
  assert.deepEqual(PT.search.prompts(s, '', {}), []);
  assert.deepEqual(PT.search.sections(s, '', {}), []);
  assert.deepEqual(PT.search.tags(s), []);
});
