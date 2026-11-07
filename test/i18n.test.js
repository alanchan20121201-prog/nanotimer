'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rendererFile = path.join(__dirname, '..', 'src', 'renderer', 'renderer.js');
const source = fs.readFileSync(rendererFile, 'utf8');

/**
 * Slice the object literal that starts at `startIndex`, ignoring braces that
 * live inside strings. Returns null when the literal is never closed.
 */
function objectLiteralAt(text, startIndex) {
  let depth = 0;
  let quote = '';

  for (let index = startIndex; index < text.length; index += 1) {
    const character = text[index];

    if (quote) {
      if (character === '\\') {
        index += 1;
      } else if (character === quote) {
        quote = '';
      }

      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }

    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

const marker = 'const UI_TEXT = ';
const literalStart = source.indexOf('{', source.indexOf(marker));
assert.notEqual(literalStart, -1, 'UI_TEXT is missing from renderer.js');

const literal = objectLiteralAt(source, literalStart);
assert.ok(literal, 'UI_TEXT is not a closed object literal');

const UI_TEXT = vm.runInNewContext(`(${literal})`);
const languages = Object.keys(UI_TEXT);

test('every language table carries the same keys', () => {
  assert.deepEqual(languages, ['en', 'zh-TW', 'zh-CN', 'ja']);

  const reference = Object.keys(UI_TEXT.en).sort();

  for (const language of languages) {
    assert.deepEqual(
      Object.keys(UI_TEXT[language]).sort(),
      reference,
      `${language} is out of sync with en`
    );
  }
});

test('no language table repeats a key', () => {
  // A duplicate key collapses silently when the object is parsed, so it has to
  // be spotted in the source. This is the bug that shipped in 1.1.5: one table
  // had the English keys pasted in, the last copy won, and every language
  // showed Japanese.
  for (const language of languages) {
    const quoted = language.includes('-') ? `'${language}'` : language;
    const start = literal.indexOf(`  ${quoted}: {`);

    assert.notEqual(start, -1, `${language} block not found`);

    const block = objectLiteralAt(literal, literal.indexOf('{', start));
    const seen = new Set();
    const duplicates = [];

    for (const match of block.matchAll(/^ {4}([A-Za-z0-9_-]+):/gm)) {
      if (seen.has(match[1])) {
        duplicates.push(match[1]);
      } else {
        seen.add(match[1]);
      }
    }

    assert.deepEqual(duplicates, [], `${language} repeats these keys`);
  }
});

test('every node carries a translation in every language', () => {
  const html = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'renderer', 'index.html'),
    'utf8'
  );
  const attributes = [
    ...html.matchAll(/data-i18n(?:-title|-aria-label)?="([^"]+)"/g)
  ].map((match) => match[1]);
  const missing = [];

  for (const language of languages) {
    for (const key of attributes) {
      if (typeof UI_TEXT[language][key] !== 'string') {
        missing.push(`${language}:${key}`);
      }
    }
  }

  assert.deepEqual(missing, []);
});
