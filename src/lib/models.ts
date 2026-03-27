/**
 * Model configuration for different task types.
 * Set via .env to swap models without code changes:
 *   AI_FAST_MODEL    — structured extraction, simple generation (default: Haiku)
 *   AI_STANDARD_MODEL — complex analysis, creative writing (default: Sonnet)
 */

// Fast model for simple, structured tasks
export const FAST_MODEL = process.env.AI_FAST_MODEL || 'claude-haiku-4-5-20251001';

// Standard model for complex analysis and creative tasks
export const STANDARD_MODEL = process.env.AI_STANDARD_MODEL || 'claude-sonnet-4-20250514';

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
