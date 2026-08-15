import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const { PT } = load('model.js');
const DEFAULTS = ['role', 'context', 'goal', 'background', 'state', 'output'];

test('newId prefixes and is unique', () => {
  const a = PT.model.newId('p');
  assert.match(a, /^p_[a-z0-9]{8}$/);
  assert.notEqual(a, PT.model.newId('p'));
});

test('slugTag normalises labels to valid XML names', () => {
  assert.equal(PT.model.slugTag('Role / Context'), 'role_context');
  assert.equal(PT.model.slugTag('  Background / Theory '), 'background_theory');
  assert.equal(PT.model.slugTag('Output   Format'), 'output_format');
  assert.equal(PT.model.slugTag('!!!'), 'section');
  assert.equal(PT.model.slugTag('2024 goals'), 's_2024_goals');
});

test('newSection defaults to an empty included body', () => {
  const s = PT.model.newSection({ tag: 'role' });
  assert.equal(s.tag, 'role');
  assert.equal(s.body, '');
  assert.equal(s.include, true);
  assert.match(s.id, /^s_/);
});

test('newSection slugs the tag it is given', () => {
  assert.equal(PT.model.newSection({ tag: 'Custom Thing' }).tag, 'custom_thing');
});

test('newPrompt has the six default sections, empty and included', () => {
  const p = PT.model.newPrompt({ name: 'X', kind: 'filled' });
  assert.equal(p.name, 'X');
  assert.equal(p.kind, 'filled');
  assert.match(p.id, /^p_/);
  assert.deepEqual(p.sections.map((s) => s.tag), DEFAULTS);
  assert.ok(p.sections.every((s) => s.body === '' && s.include === true));
});

test('addSection does not mutate the original prompt', () => {
  const p = PT.model.newPrompt({ name: 'X', kind: 'filled' });
  const p2 = PT.model.addSection(p, PT.model.newSection({ tag: 'extra' }), 0);
  assert.equal(p.sections.length, 6);
  assert.equal(p2.sections.length, 7);
  assert.equal(p2.sections[0].tag, 'extra');
});

test('removeSection removes only the named section', () => {
  const p = PT.model.newPrompt({ name: 'X', kind: 'filled' });
  const id = p.sections[2].id;
  const p2 = PT.model.removeSection(p, id);
  assert.equal(p2.sections.length, 5);
  assert.equal(p2.sections.find((s) => s.id === id), undefined);
  assert.equal(p.sections.length, 6);
});

test('moveSection reorders without mutating', () => {
  const p = PT.model.newPrompt({ name: 'X', kind: 'filled' });
  const p2 = PT.model.moveSection(p, p.sections[0].id, 2);
  assert.deepEqual(p2.sections.map((s) => s.tag),
    ['context', 'goal', 'role', 'background', 'state', 'output']);
  assert.equal(p.sections[0].tag, 'role');
});

test('setSection patches one section only', () => {
  const p = PT.model.newPrompt({ name: 'X', kind: 'filled' });
  const p2 = PT.model.setSection(p, p.sections[1].id, { body: 'hello', include: false });
  assert.equal(p2.sections[1].body, 'hello');
  assert.equal(p2.sections[1].include, false);
  assert.equal(p2.sections[0].body, '');
  assert.equal(p.sections[1].body, '');
});

test('setSection slugs a tag patch', () => {
  const p = PT.model.newPrompt({ name: 'X', kind: 'filled' });
  const p2 = PT.model.setSection(p, p.sections[0].id, { tag: 'Custom Thing' });
  assert.equal(p2.sections[0].tag, 'custom_thing');
});

test('cloneSection copies content under a new id', () => {
  const s = PT.model.newSection({ tag: 'role', body: 'text' });
  const c = PT.model.cloneSection(s);
  assert.notEqual(c.id, s.id);
  assert.equal(c.tag, 'role');
  assert.equal(c.body, 'text');
});

test('validate accepts a fresh prompt', () => {
  assert.deepEqual(PT.model.validate(PT.model.newPrompt({ name: 'X', kind: 'filled' })), []);
});

test('validate reports an empty tag', () => {
  const p = PT.model.newPrompt({ name: 'X', kind: 'filled' });
  p.sections[0].tag = '';
  const problems = PT.model.validate(p);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /tag/i);
});

test('validate reports an unknown kind', () => {
  const p = PT.model.newPrompt({ name: 'X', kind: 'filled' });
  p.kind = 'weird';
  assert.match(PT.model.validate(p).join(' '), /kind/i);
});
