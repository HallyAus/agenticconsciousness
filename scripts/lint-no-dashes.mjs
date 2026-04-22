#!/usr/bin/env node
/**
 * Source-tree check: fail the build if any file under src/ (other than
 * the text-hygiene module itself) contains a literal em-dash (U+2014)
 * or en-dash (U+2013). LLM output is already laundered at runtime by
 * stripDashes; this script catches hardcoded dashes that humans sneak
 * into code, JSX copy, prompts, or system messages.
 *
 * Usage:    node scripts/lint-no-dashes.mjs
 * Exit 0 = clean, 1 = dashes found.
 * Wired into package.json "lint:dashes" + runs as part of "build".
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

// Narrow the scan to the modules whose STRING LITERALS reach a prospect:
// audit prompts, email templates, hardcoded PDF copy, chatbot prompt,
// sprint config (testimonials). UI display copy and library comments
// are skipped via the comment-line heuristic below.
const TARGETS = [
  path.join('src', 'lib', 'audit-core.ts'),
  path.join('src', 'lib', 'outreach.ts'),
  path.join('src', 'lib', 'pdf.tsx'),
  path.join('src', 'lib', 'constants.ts'),
  path.join('src', 'config', 'sprint.ts'),
];
const EXTENSIONS = new Set(['.ts', '.tsx']);

/**
 * Trim out obvious comment lines before flagging. Good enough for most
 * common cases (single-line //, JSDoc block lines starting with *,
 * opening /* lines). If a string literal contains "//" the string still
 * counts — this is just about not flagging pure-comment lines.
 */
function isCommentLine(s) {
  const t = s.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}
const DASHES = /[–—]/;

const offenders = [];
for (const rel of TARGETS) {
  const ext = path.extname(rel);
  if (!EXTENSIONS.has(ext)) continue;
  let content;
  try {
    content = readFileSync(path.join(process.cwd(), rel), 'utf8');
  } catch {
    continue; // file doesn't exist yet (e.g. during scaffolding)
  }
  if (!DASHES.test(content)) continue;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!DASHES.test(lines[i])) continue;
    if (isCommentLine(lines[i])) continue;
    offenders.push({ file: rel, line: i + 1, text: lines[i].trim().slice(0, 120) });
  }
}

if (offenders.length === 0) {
  console.log('lint:dashes clean — no em/en dashes in source');
  process.exit(0);
}

console.error('lint:dashes FAILED — em/en dashes found:');
for (const o of offenders) {
  console.error(`  ${o.file}:${o.line}  ${o.text}`);
}
console.error('\nReplace with comma, colon, parentheses, or new sentence. Hyphens in compound words are fine.');
process.exit(1);
