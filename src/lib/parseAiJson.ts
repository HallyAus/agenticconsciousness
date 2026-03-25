/**
 * Parse JSON from AI response, stripping markdown code block wrappers if present.
 * Claude sometimes wraps JSON in ```json ... ``` despite being told not to.
 */
export function parseAiJson<T = unknown>(text: string): T {
  // Strip markdown code block wrappers
  let cleaned = text.trim();

  // Remove ```json ... ``` or ``` ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Remove leading/trailing whitespace after stripping
  cleaned = cleaned.trim();

  return JSON.parse(cleaned);
}
