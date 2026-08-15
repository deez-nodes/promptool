import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const { PT } = load('serialize.js');

const S = (tag, body, include = true) => ({ id: 's_' + tag, tag, body, include });
const P = (sections) => ({ id: 'p_x', name: 'n', kind: 'filled', created: 0, updated: 0, sections });

test('emits included non-empty sections in order, blank line between', () => {
  const out = PT.serialize.toXml(P([S('role', 'you have this role'), S('goal', 'this i might change')]));
  assert.equal(out, '<role>\nyou have this role\n</role>\n\n<goal>\nthis i might change\n</goal>');
});

test('omits excluded sections', () => {
  assert.equal(PT.serialize.toXml(P([S('role', 'a'), S('goal', 'b', false)])), '<role>\na\n</role>');
});

test('omits sections whose body is blank or whitespace only', () => {
  assert.equal(PT.serialize.toXml(P([S('role', 'a'), S('goal', '   \n  ')])), '<role>\na\n</role>');
});

test('emits bodies verbatim, never escaped', () => {
  const body = 'use <example> and A & B and "quotes"';
  assert.equal(PT.serialize.toXml(P([S('role', body)])), '<role>\n' + body + '\n</role>');
});

test('does not trim the interior of a body', () => {
  const out = PT.serialize.toXml(P([S('role', '  line one\n  line two  ')]));
  assert.equal(out, '<role>\n  line one\n  line two  \n</role>');
});

test('returns an empty string when nothing qualifies', () => {
  assert.equal(PT.serialize.toXml(P([S('role', '')])), '');
  assert.equal(PT.serialize.toXml(P([])), '');
});

test('has no trailing newline', () => {
  assert.equal(/\n$/.test(PT.serialize.toXml(P([S('role', 'a')]))), false);
});

test('tolerates a missing or malformed prompt', () => {
  assert.equal(PT.serialize.toXml(null), '');
  assert.equal(PT.serialize.toXml({}), '');
});
