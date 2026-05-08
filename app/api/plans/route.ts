import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { transformEvents } from '@/lib/transformer';
import { scoreEvents, getWeekendDateRange, hasEnoughDateMatches, enforceDiversity, generateLocalWhy } from '@/lib/scorer';
import type { PlansRequest, PlansResponse, ScoredEvent } from '@/lib/types';

import rawData from '@/data/events.json';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Weekend label ────────────────────────────────────────────────────────────

function weekendLabel(dates: string[]): string {
  const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(dates[0])} – ${fmt(dates[2])}`;
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Bengaluru weekend planning expert.

Given a user's preferences and a shortlist of pre-scored events, select exactly 3 events and write a personalised "why we picked this" line for each.

STRICT RULES:
1. Return ONLY valid JSON — no markdown, no explanation, no preamble.
2. Select exactly 3 DIFFERENT event IDs. Never repeat an ID.
3. Each ID must appear exactly once across the 3 results.
4. The 3 picks must have different venues where possible.
5. The 3 picks must not all share the same vibe/subcategory.
6. Each "why" must follow this format: "Picked because you chose [vibe] + [group type] + [budget]. [1 sentence about the event itself]."
7. Percentage must be between 50 and 97.
8. Do not invent events. Only use IDs from the candidates list.

OUTPUT FORMAT (JSON array, nothing else):
[
  { "id": 42, "percentage": 87, "why": "Picked because you chose chill + date night + under ₹2,000. A relaxed evening with great music and no pressure." },
  { "id": 7,  "percentage": 79, "why": "..." },
  { "id": 23, "percentage": 71, "why": "..." }
]`;

// ─── User prompt ──────────────────────────────────────────────────────────────

function buildUserPrompt(request: PlansRequest, candidates: ScoredEvent[], wkndLabel: string, limitedMatches: boolean): string {
  const { answers, hardNos } = request;

  return `USER PREFERENCES:
- Weekend: ${wkndLabel}
- Company: ${answers.who}
- Vibe: ${answers.vibe}
- Effort: ${answers.effort}
- Mood: ${answers.feeling}
- Budget: ${answers.budget}
- Adventurousness: ${answers.risk}
${hardNos.length > 0 ? `- Avoid: ${hardNos.join(', ')}` : ''}
${limitedMatches ? '- NOTE: Limited exact date matches found. Include some evergreen/undated events.' : ''}

CANDIDATE EVENTS (sorted by match score, best first):
${candidates.map(e =>
  `ID ${e.id} | "${e.name}" | date:${e.date ?? 'evergreen'} | vibe:${e.vibe} | ${e.effort} | ${e.cost} | ${e.location} | ${e.description}`
).join('\n')}

Pick 3 different IDs. Ensure variety in vibe and location. Return JSON only.`;
}

// ─── Parse response ───────────────────────────────────────────────────────────

function parseClaudeResponse(text: string): Array<{ id: number; percentage: number; why: string }> {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(clean);
  if (!Array.isArray(parsed) || parsed.length < 1) throw new Error('Invalid shape');
  return parsed;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: PlansRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { answers, hardNos, weekend = 'this' } = body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = transformEvents((rawData as any).events ?? rawData);
  const weekendDates = getWeekendDateRange(weekend);
  const label = weekendLabel(weekendDates);
  const limited = !hasEnoughDateMatches(events, answers, hardNos, weekendDates);

  // Pre-score with date awareness → top 20 for Claude
  const candidates = scoreEvents(events, answers, hardNos, 20, weekendDates);

  // If not enough candidates even without hard nos
  if (candidates.length < 3) {
    const fallback = enforceDiversity(
      scoreEvents(events, answers, [], 10, weekendDates)
    ).slice(0, 3).map(e => ({ ...e, why: generateLocalWhy(e, answers) }));
    return NextResponse.json({
      results: fallback, source: 'local', weekendLabel: label, limitedMatches: true,
    } as PlansResponse);
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(body, candidates, label, limited) }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const aiPicks = parseClaudeResponse(text);

    // Merge picks with full event data
    const merged: ScoredEvent[] = aiPicks
      .map(pick => {
        const event = events.find(e => e.id === pick.id);
        if (!event) return null;
        return { ...event, score: pick.percentage, percentage: pick.percentage, why: pick.why };
      })
      .filter((e): e is ScoredEvent => e !== null);

    // Enforce deduplication server-side regardless of what Claude returned
    const deduped = enforceDiversity(merged);

    // Top up if needed
    if (deduped.length < 3) {
      const seenIds = new Set(deduped.map(e => e.id));
      for (const c of candidates) {
        if (deduped.length >= 3) break;
        if (!seenIds.has(c.id)) {
          deduped.push({ ...c, why: generateLocalWhy(c, answers) });
        }
      }
    }

    return NextResponse.json({
      results: deduped.slice(0, 3),
      source: 'claude',
      weekendLabel: label,
      limitedMatches: limited,
    } as PlansResponse);

  } catch (err) {
    console.error('[/api/plans] Claude error, falling back to local:', err);

    const fallback = enforceDiversity(candidates).slice(0, 3)
      .map(e => ({ ...e, why: generateLocalWhy(e, answers) }));

    return NextResponse.json({
      results: fallback, source: 'local', weekendLabel: label, limitedMatches: limited,
    } as PlansResponse);
  }
}
