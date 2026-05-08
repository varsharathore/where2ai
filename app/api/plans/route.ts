import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { transformEvents } from '@/lib/transformer';
import { scoreEvents, generateLocalWhy } from '@/lib/scorer';
import type { PlansRequest, PlansResponse, ScoredEvent } from '@/lib/types';

// ─── Weekend date helpers ──────────────────────────────────────────────────────

function getWeekendDates(which: 'this' | 'next'): { label: string; dates: string[] } {
  const today = new Date();
  const day = today.getDay(); // 0=Sun … 6=Sat
  const daysUntilFri = day === 5 ? 0 : day === 6 ? 6 : (5 - day + 7) % 7;
  const fri = new Date(today);
  fri.setDate(today.getDate() + daysUntilFri + (which === 'next' ? 7 : 0));
  const dates = [0, 1, 2].map(d => {
    const dt = new Date(fri);
    dt.setDate(fri.getDate() + d);
    return dt.toISOString().split('T')[0];
  });
  const fmt = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return { label: `${fmt(dates[0])} – ${fmt(dates[2])}`, dates };
}

// Import your events JSON — drop your file at /data/events.json
import rawData from '@/data/events.json';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a knowledgeable Bengaluru weekend planning expert.

Your job: given a user's preferences and a shortlist of events, select exactly 3 events that best match them and write a personalised "why we picked this" explanation for each.

RULES:
1. Return ONLY valid JSON — no markdown, no explanation, no preamble.
2. Select exactly 3 event IDs from the candidates list.
3. Do not invent events. Only use IDs from the provided list.
4. Each "why" must be 1–2 sentences, warm and specific to the user's answers.
5. Percentage must be between 45 and 98.
6. Ensure the 3 picks feel different from each other (not all the same vibe/location).

OUTPUT FORMAT (JSON array, nothing else):
[
  {
    "id": 42,
    "percentage": 87,
    "why": "Matches your preference for a slow evening, and well suited to a date night out."
  },
  { "id": 7,  "percentage": 79, "why": "..." },
  { "id": 23, "percentage": 71, "why": "..." }
]`;

// ─── User prompt builder ────────────────────────────────────────────────────────

function buildUserPrompt(request: PlansRequest, candidates: ScoredEvent[]): string {
  const { answers, hardNos } = request;
  const weekend = getWeekendDates(request.weekend ?? 'this');

  const prefsText = `
USER PREFERENCES:
- Weekend: ${weekend.label} (${request.weekend === 'next' ? 'next' : 'this'} weekend)
- Company:    ${answers.who}
- Weekend vibe: ${answers.vibe}
- Energy/effort: ${answers.effort}
- Current mood: ${answers.feeling}
- Budget: ${answers.budget}
- Adventurousness: ${answers.risk}
${hardNos.length > 0 ? `- Wants to avoid: ${hardNos.join(', ')}` : '- No specific exclusions'}
`.trim();

  const candidatesText = candidates
    .map(e => `ID ${e.id} | "${e.name}" | ${e.vibe} | ${e.effort} | ${e.cost} | ${e.location} | ${e.description}`)
    .join('\n');

  return `${prefsText}

CANDIDATE EVENTS (pre-scored, best matches first):
${candidatesText}

Select the best 3 and return JSON only.`;
}

// ─── Parse Claude response ─────────────────────────────────────────────────────

function parseClaudeResponse(text: string): Array<{ id: number; percentage: number; why: string }> {
  // Strip markdown fences if present
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(clean);
  if (!Array.isArray(parsed) || parsed.length < 3) throw new Error('Invalid response shape');
  return parsed;
}

// ─── API handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body: PlansRequest = await request.json();
    const { answers, hardNos } = body;

    // 1. Transform raw JSON → normalised schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = transformEvents((rawData as any).events ?? rawData);

    // 2. Pre-filter with local scorer → top 20 candidates for Claude
    const candidates = scoreEvents(events, answers, hardNos, 20);

    if (candidates.length < 3) {
      // Not enough events after filtering — return local results immediately
      const fallback = scoreEvents(events, answers, [], 3).map(e => ({
        ...e,
        why: generateLocalWhy(e, answers),
      }));
      const response: PlansResponse = { results: fallback, source: 'local' };
      return NextResponse.json(response);
    }

    // 3. Call Claude with top 20 candidates
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildUserPrompt(body, candidates) },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const aiPicks = parseClaudeResponse(responseText);

    // 4. Merge AI picks (id + percentage + why) with full event data
    const results: ScoredEvent[] = aiPicks
      .map(pick => {
        const event = events.find(e => e.id === pick.id);
        if (!event) return null;
        return {
          ...event,
          score: pick.percentage,
          percentage: pick.percentage,
          why: pick.why,
        };
      })
      .filter((e): e is ScoredEvent => e !== null);

    // Safety: if Claude returned fewer than 3 valid events, top up with local
    if (results.length < 3) {
      const seen = new Set(results.map(e => e.id));
      for (const candidate of candidates) {
        if (results.length >= 3) break;
        if (!seen.has(candidate.id)) {
          results.push({ ...candidate, why: generateLocalWhy(candidate, answers) });
        }
      }
    }

    const response: PlansResponse = { results: results.slice(0, 3), source: 'claude' };
    return NextResponse.json(response);

  } catch (error) {
    console.error('[/api/plans] Error:', error);

    // Graceful fallback — always return something
    try {
      const body: PlansRequest = await request.clone().json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const events = transformEvents((rawData as any).events ?? rawData);
      const fallback = scoreEvents(events, body.answers, [], 3).map(e => ({
        ...e,
        why: generateLocalWhy(e, body.answers),
      }));
      return NextResponse.json({ results: fallback, source: 'local' } as PlansResponse);
    } catch {
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 },
      );
    }
  }
}
