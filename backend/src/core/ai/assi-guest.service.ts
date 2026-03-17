// src/core/ai/assi-guest.service.ts
// ASSI Platform — Guest AI Service
// Unauthenticated users get a limited taste of ASSI Intelligence.
//
// NOTE: Currently using OpenAI (gpt-4o-mini).
// When CLAUDE_API_KEY is available, swap this file for assi-guest.claude.service.ts
// The interface (respond()) stays identical — no other files change.

import OpenAI from 'openai';
import { env } from '@/config/env';

// ─────────────────────────────────────────────
// CLIENT  (lazy-init — only created on first call)
// ─────────────────────────────────────────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. AI features are unavailable.');
  }
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// Guests get guidance only — no answers, no essays, no code.
// Goal: demonstrate value, drive sign-up.
// ─────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are ASSI, a friendly study assistant built for Caribbean students.

Rules you MUST follow:
- Give high-level guidance and study tips only
- Do NOT solve problems, write essays, or write code
- Do NOT give step-by-step answers
- Keep replies under 80 words
- Be warm, encouraging, and Caribbean-aware (CXC, CAPE, CSEC context)
- If the user asks for direct answers, politely decline and suggest signing in for deeper help

You represent the ASSI platform. Every response should feel helpful enough to make them want more.
`.trim();

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────

class AssiGuestService {
  async respond(userMessage: string): Promise<string> {
    try {
      const completion = await getClient().chat.completions.create({
        model:       'gpt-4o-mini',
        temperature: 0.6,
        max_tokens:  120,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userMessage   },
        ],
      });

      return (
        completion.choices[0]?.message?.content?.trim() ??
        "I can help guide you — sign in to go deeper."
      );
    } catch (error: any) {
      console.error('❌ AssiGuestService error:', error.message);
      return "I'm having trouble right now. Sign in for the full ASSI experience.";
    }
  }
}

export const assiGuestService = new AssiGuestService();
