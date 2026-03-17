// src/routes/ai/assi.ts
// ASSI Platform — AI Assistant (authenticated users)
// Uses lazy OpenAI init — no global client import.

import { Router } from 'express';
import OpenAI      from 'openai';
import { requireAuth } from '@/routes/middleware/requireAuth';

const router = Router();

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const SYSTEM_PROMPT = `
You are ASSI — a warm, encouraging academic assistant built for Caribbean students (CSEC & CAPE).
- Help students understand concepts, not complete their work for them
- Keep answers concise (2–4 sentences unless deeper explanation is needed)
- Use encouraging, friendly language
- Nudge students toward live tutors when the topic needs more depth
- Never write full essays, solve full exam questions, or do assignments for the student
`.trim();

router.post('/assist', requireAuth, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ success: false, error: 'Message too long' });
    }

    const contextMessages = (Array.isArray(history) ? history : [])
      .slice(-6)
      .filter((m: any) => m?.role && m?.content)
      .map((m: any) => ({ role: m.role, content: String(m.content) }));

    const completion = await getOpenAI().chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.6,
      max_tokens:  320,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...contextMessages,
        { role: 'user', content: message.trim() },
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) return res.status(500).json({ success: false, error: 'No response from AI' });

    return res.json({ success: true, reply });
  } catch (err: any) {
    console.error('[ASSI] error:', err?.message ?? err);
    return res.status(500).json({
      success: false,
      reply: 'ASSI is having trouble right now. Please try again shortly.',
    });
  }
});

export default router;
