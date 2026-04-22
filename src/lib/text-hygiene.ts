/**
 * Text hygiene for outbound copy.
 *
 * Daniel's house rule: NEVER use em-dash (U+2014) or en-dash (U+2013) as
 * punctuation anywhere in emails, PDFs, or UI copy. Use commas, colons,
 * parentheses, or a new sentence instead.
 *
 * This matters because LLMs (including the one generating the audit)
 * love em-dashes and it breaks brand voice consistency.
 *
 * Usage:
 *   import { lintNoDashes, stripDashes } from '@/lib/text-hygiene';
 *   lintNoDashes(someString);     // throws if found (build-time guard)
 *   stripDashes(someString);       // rewrites at runtime (for LLM output)
 */

const EM_DASH = '—';
const EN_DASH = '–';

export function hasForbiddenDashes(s: string): boolean {
  return s.includes(EM_DASH) || s.includes(EN_DASH);
}

export function lintNoDashes(s: string, context = ''): void {
  if (hasForbiddenDashes(s)) {
    const sample = s.slice(Math.max(0, s.indexOf(EM_DASH) - 20), s.indexOf(EM_DASH) + 20);
    throw new Error(`lintNoDashes failed${context ? ` in ${context}` : ''}: found em/en dash near "${sample}"`);
  }
}

/**
 * Rewrite em/en dashes to comma-space for safe output of untrusted LLM text.
 * Not perfect prose but preserves meaning and keeps brand rule.
 */
export function stripDashes(s: string): string {
  return s
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*–\s*/g, ', ')
    // Also normalise curly quotes that tend to tag along
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // Convert fancy arrows that don't render reliably in PDF fonts
    .replace(/→/g, '->')
    .replace(/⟶/g, '->');
}
