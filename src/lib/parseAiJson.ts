/**
 * Parse JSON from AI response, handling all common wrapper formats.
 */
export function parseAiJson<T = unknown>(text: string): T {
  if (!text || text.trim().length === 0) {
    throw new SyntaxError('Empty AI response');
  }

  let cleaned = text.trim();

  // Attempt 1: Direct parse
  try {
    return JSON.parse(cleaned);
  } catch { /* continue */ }

  // Attempt 2: Strip markdown code block wrappers
  cleaned = cleaned
    .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch { /* continue */ }

  // Attempt 3: Extract JSON by finding balanced braces
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch { /* continue */ }
  }

  // Attempt 4: Find first { and last } (greedy)
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch { /* continue */ }
  }

  // Attempt 5: Find first [ and last ]
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    try {
      return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
    } catch { /* continue */ }
  }

  // All attempts failed
  throw new SyntaxError(`Cannot parse JSON from AI response. Raw text (first 300 chars): ${text.slice(0, 300)}`);
}
