/**
 * Parse JSON from AI response, handling all common wrapper formats.
 * Claude (especially Haiku) may wrap JSON in:
 * - ```json ... ```
 * - ``` ... ```
 * - Text before/after the JSON object
 * - Extra whitespace
 */
export function parseAiJson<T = unknown>(text: string): T {
  let cleaned = text.trim();

  // Remove ```json ... ``` or ``` ... ``` wrappers
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  cleaned = cleaned.trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // If direct parse fails, try to extract JSON object or array
  }

  // Find the first { or [ and last } or ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const start = firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)
    ? firstBrace
    : firstBracket;

  if (start < 0) {
    throw new SyntaxError(`No JSON found in response: ${cleaned.slice(0, 100)}...`);
  }

  const isObject = cleaned[start] === '{';
  const closeChar = isObject ? '}' : ']';

  // Find the matching closing brace/bracket by counting nesting
  let depth = 0;
  let end = -1;
  let inString = false;
  let escape = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end < 0) {
    throw new SyntaxError(`Unclosed JSON in response: ${cleaned.slice(0, 100)}...`);
  }

  const jsonStr = cleaned.slice(start, end + 1);
  return JSON.parse(jsonStr);
}
