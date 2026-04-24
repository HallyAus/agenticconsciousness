import Anthropic from '@anthropic-ai/sdk';

/**
 * Model configuration for different task types.
 * Set via .env to swap models without code changes:
 *   AI_FAST_MODEL    — structured extraction, simple generation (default: Haiku)
 *   AI_STANDARD_MODEL — complex analysis, creative writing (default: Sonnet)
 */

// Fast model for simple, structured tasks
export const FAST_MODEL = process.env.AI_FAST_MODEL || 'claude-haiku-4-5-20251001';

// Standard model for complex analysis and creative tasks. Bumped from
// the May 2025 Sonnet 4 to Sonnet 4.6 (latest) — same pricing tier,
// markedly better instruction-following on long structured prompts.
export const STANDARD_MODEL = process.env.AI_STANDARD_MODEL || 'claude-sonnet-4-6';

/** Lazy-init Anthropic client with API key validation */
export function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not configured');
  return new Anthropic({ apiKey: key });
}

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
 *   - energy bill extraction (structured extraction)
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
 *   - energy bill recommendation (personalised analysis)
 */
