/**
 * Model configuration for different task types.
 * Haiku: fast, cheap — great for structured extraction, simple generation
 * Sonnet: balanced — good for complex analysis, creative writing
 */

// Fast model for simple, structured tasks
export const FAST_MODEL = 'claude-haiku-4-5-20251001';

// Standard model for complex analysis and creative tasks
export const STANDARD_MODEL = 'claude-sonnet-4-20250514';

/**
 * Route model assignments:
 *
 * FAST (Haiku) — structured extraction, simple generation:
 *   - greeting (short text)
 *   - email drafter (rewriting)
 *   - summariser (extraction)
 *   - meeting notes (extraction)
 *   - invoice scanner (extraction)
 *   - smart-contact (classification)
 *   - exit-capture (short snapshot)
 *
 * STANDARD (Sonnet) — complex reasoning, creative output:
 *   - chat (conversational AI)
 *   - audit (strategic analysis)
 *   - quote generator (creative document)
 *   - competitor intel (deep analysis)
 *   - job ad writer (creative + bias checking)
 *   - contract reviewer (legal analysis)
 *   - blog generator (long-form content)
 *   - proposal generator (complex document)
 */
