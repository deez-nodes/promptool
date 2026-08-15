import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const EMPTY = { version: 1, prompts: [], bank: [] };

test('load returns an empty store when nothing is saved', () => {
  const { PT } = load('store.js');
  assert.deepEqual(PT.store.load(), EMPTY);
});

test('save then load round-trips', () => {
  const { PT } = load('store.js');
  const s = { version: 1, bank: [], prompts: [
    { id: 'p_1', name: 'A', kind: 'filled', created: 1, updated: 2,
      sections: [{ id: 's_1', tag: 'role', body: 'x', include: true }] }] };
  PT.store.save(s);
  assert.deepEqual(PT.store.load(), s);
});

test('corrupt JSON yields an empty store and keeps a backup', () => {
  const { PT, localStorage } = load('store.js');
  localStorage.setItem(PT.store.KEY, '{ not json');
  assert.deepEqual(PT.store.load(), EMPTY);
  assert.equal(localStorage.getItem(PT.store.KEY + '_corrupt_backup'), '{ not json');
});

test('a non-object payload yields an empty store', () => {
  const { PT, localStorage } = load('store.js');
  localStorage.setItem(PT.store.KEY, '"a string"');
  assert.deepEqual(PT.store.load(), EMPTY);
});

test('an unknown version yields an empty store', () => {
  const { PT, localStorage } = load('store.js');
  localStorage.setItem(PT.store.KEY, JSON.stringify({ version: 99, prompts: [{}], bank: [] }));
  assert.deepEqual(PT.store.load(), EMPTY);
});

test('missing arrays are repaired rather than thrown on', () => {
  const { PT, localStorage } = load('store.js');
  localStorage.setItem(PT.store.KEY, JSON.stringify({ version: 1 }));
  assert.deepEqual(PT.store.load(), EMPTY);
});

test('exportJson is pretty-printed and re-importable', () => {
  const { PT } = load('store.js');
  const s = { version: 1, prompts: [], bank: [{ id: 't_1', text: 'Unreal Engine', created: 1 }] };
  const text = PT.store.exportJson(s);
  assert.ok(text.includes('\n  '));
  const r = PT.store.importJson(text);
  assert.equal(r.ok, true);
  assert.deepEqual(r.store, s);
});

test('importJson rejects malformed input without throwing', () => {
  const { PT } = load('store.js');
  const r = PT.store.importJson('{ not json');
  assert.equal(r.ok, false);
  assert.equal(typeof r.error, 'string');
});

test('importJson rejects a payload missing prompts', () => {
  const { PT } = load('store.js');
  assert.equal(PT.store.importJson('{"version":1,"bank":[]}').ok, false);
});

test('importJson never writes to storage', () => {
  const { PT, localStorage } = load('store.js');
  PT.store.importJson('{"version":1,"prompts":[],"bank":[]}');
  assert.equal(localStorage.getItem(PT.store.KEY), null);
});
