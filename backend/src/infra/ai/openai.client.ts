import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is missing');
}

/**
 * Singleton OpenAI client for ASSI.
 * Do NOT create clients per request.
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
