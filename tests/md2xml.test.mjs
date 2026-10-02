import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mdToXml, mdSlugTag } from '../composables/mdToXml.js';

test('headings become tags, blank line between sections', () => {
  assert.equal(mdToXml('# role\nyou have this role\n\n# goal\nthis i might change'),
    '<role>\nyou have this role\n</role>\n\n<goal>\nthis i might change\n</goal>');
});

test('empty sections are dropped', () => {
  assert.equal(mdToXml('# role\na\n# goal\n   \n'), '<role>\na\n</role>');
  assert.equal(mdToXml(''), '');
  assert.equal(mdToXml('# only\n\n'), '');
});

test('text before the first heading is <instructions>, heading text is slugged', () => {
  assert.equal(mdToXml('do this first\n## Output Format\njson'),
    '<instructions>\ndo this first\n</instructions>\n\n<output_format>\njson\n</output_format>');
});

test('line indentation is preserved, surrounding blank lines trimmed', () => {
  assert.equal(mdToXml('# role\n\n  line one\n  line two  \n\n'), '<role>\n  line one\n  line two  \n</role>');
});

test('headings inside code fences are not sections', () => {
  assert.equal(mdToXml('# code\n```\n# not a heading\n```'), '<code>\n```\n# not a heading\n```\n</code>');
});

test('crlf input and no trailing newline', () => {
  assert.equal(mdToXml('# a\nb\r\n# c\nd'), '<a>\nb\n</a>\n\n<c>\nd\n</c>');
  assert.equal(/\n$/.test(mdToXml('# a\nb')), false);
});

test('slug rules match slugTag', () => {
  assert.equal(mdSlugTag('Output Format'), 'output_format');
  assert.equal(mdSlugTag('1. Step'), 's_1_step');
  assert.equal(mdSlugTag('***'), 'section');
  assert.equal(mdToXml('# 1. Step\nx'), '<s_1_step>\nx\n</s_1_step>');
});
