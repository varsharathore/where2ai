import type { NormalisedEvent, Answers, Trigger, ScoredEvent, Vibe } from './types';

const VIBE_ADJACENCY: Partial<Record<Vibe, Vibe[]>> = {
  social:   ['party', 'foodie'],
  party:    ['social'],
  cozy:     ['cultural', 'offbeat'],
  cultural: ['cozy', 'offbeat', 'foodie'],
  active:   ['offbeat'],
  offbeat:  ['cultural', 'active'],
  foodie:   ['social', 'cultural'],
};

const BUDGET_ORDER = ['budget', 'comfortable', 'premium'] as const;

// ─── Weekend date utilities ────────────────────────────────────────────────────

export function getWeekendDateRange(which: 'this' | 'next'): string[] {
  const today = new Date();
  const day = today.getDay(); // 0=Sun … 6=Sat
  // Find next Friday (or today if it is Friday)
  const daysUntilFri = day === 5 ? 0 : day === 6 ? 6 : (5 - day + 7) % 7;
  const fri = new Date(today);
  fri.setDate(today.getDate() + daysUntilFri + (which === 'next' ? 7 : 0));
  return [0, 1, 2].map(d => {
    const dt = new Date(fri);
    dt.setDate(fri.getDate() + d);
    return dt.toISOString().split('T')[0]; // 'YYYY-MM-DD'
  });
}

/**
 * Score a single event against user answers.
 * Returns null if a hard-no trigger matches (hard elimination).
 */
export function scoreEvent(
  event: NormalisedEvent,
  answers: Answers,
  hardNos: Trigger[],
  weekendDates?: string[],  // optional: if provided, boosts events on those dates
): ScoredEvent | null {
  // Hard elimination
  if (hardNos.some(no => event.triggers.includes(no))) return null;
  if (hardNos.includes('expensive_plans') && event.cost_bracket === 'premium') return null;

  let score = 0;

  // Date match — 25 pts bonus (most important for weekend differentiation)
  // This is what makes this/next weekend give different results
  if (weekendDates && weekendDates.length > 0) {
    if (event.date && weekendDates.includes(event.date)) {
      score += 25; // strong boost for exact date match
    } else if (event.date) {
      score -= 10; // mild penalty for events on other weekends
    }
    // events with no date get neither boost nor penalty (evergreen)
  }

  // Vibe — 30 pts
  if (event.vibe === answers.vibe) {
    score += 30;
  } else if (VIBE_ADJACENCY[answers.vibe]?.includes(event.vibe)) {
    score += 14;
  }

  // Effort — 20 pts
  if (event.effort === answers.effort) {
    score += 20;
  } else if (
    (answers.effort === 'city' && (event.effort === 'easy' || event.effort === 'trip')) ||
    (answers.effort === 'trip' && event.effort === 'city')
  ) {
    score += 10;
  }

  // Feeling — 20 pts
  if (event.feelings.includes(answers.feeling)) score += 20;

  // Budget — 15 pts
  if (answers.budget === 'flexible') {
    score += ['premium', 'comfortable'].includes(event.cost_bracket) ? 15 : 8;
  } else if (event.cost_bracket === answers.budget) {
    score += 15;
  } else {
    const aIdx = BUDGET_ORDER.indexOf(answers.budget as typeof BUDGET_ORDER[number]);
    const eIdx = BUDGET_ORDER.indexOf(event.cost_bracket as typeof BUDGET_ORDER[number]);
    if (aIdx >= 0 && eIdx >= 0 && Math.abs(aIdx - eIdx) === 1) score += 7;
  }

  // Risk — 10 pts
  if (event.risk === answers.risk) score += 10;
  else if (answers.risk === 'mix') score += 5;

  // Companion — 5 pts
  if (event.companions.includes(answers.who)) score += 5;

  const percentage = Math.min(98, Math.max(44, Math.round((score / 100) * 100)));

  return {
    ...event,
    score,
    percentage,
    why: '',
  };
}

/**
 * Score all events, filter, sort, return top N.
 * weekendDates boosts events matching those specific dates.
 */
export function scoreEvents(
  events: NormalisedEvent[],
  answers: Answers,
  hardNos: Trigger[],
  topN = 20,
  weekendDates?: string[],
): ScoredEvent[] {
  const scored = events
    .map(e => scoreEvent(e, answers, hardNos, weekendDates))
    .filter((e): e is ScoredEvent => e !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  if (scored.length < 3 && hardNos.length > 0) {
    return scoreEvents(events, answers, [], topN, weekendDates);
  }

  return scored;
}

/**
 * Returns true if at least 3 of the top candidates have an exact date match.
 */
export function hasEnoughDateMatches(
  events: NormalisedEvent[],
  answers: Answers,
  hardNos: Trigger[],
  weekendDates: string[],
): boolean {
  const withDates = events
    .filter(e => e.date && weekendDates.includes(e.date))
    .map(e => scoreEvent(e, answers, hardNos, weekendDates))
    .filter((e): e is ScoredEvent => e !== null);
  return withDates.length >= 3;
}

/**
 * Enforce diversity across the final 3 picks.
 * Prevents same venue, same subcategory dominating, same event name.
 */
export function enforceDiversity(candidates: ScoredEvent[]): ScoredEvent[] {
  const result: ScoredEvent[] = [];
  const seenIds      = new Set<number>();
  const seenNames    = new Set<string>();
  const seenVenues   = new Set<string>();
  const subCatCount  = new Map<string, number>();

  for (const event of candidates) {
    if (result.length >= 3) break;

    // Hard dedup by id
    if (seenIds.has(event.id)) continue;

    // Dedup by normalised name (catches "Rahul Dua show" appearing twice)
    const normName = event.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
    if (seenNames.has(normName)) continue;

    // Soft venue dedup — skip if same venue already picked
    const venue = event.location.toLowerCase();
    if (result.length >= 1 && seenVenues.has(venue)) continue;

    // Subcategory cap: same subcategory max once in final 3
    // (uses vibe as proxy since subcategory isn't in NormalisedEvent)
    const subKey = event.vibe;
    if ((subCatCount.get(subKey) ?? 0) >= 2) continue;

    result.push(event);
    seenIds.add(event.id);
    seenNames.add(normName);
    seenVenues.add(venue);
    subCatCount.set(subKey, (subCatCount.get(subKey) ?? 0) + 1);
  }

  // If diversity rules filtered too aggressively, fill from original pool without venue rule
  if (result.length < 3) {
    for (const event of candidates) {
      if (result.length >= 3) break;
      if (!seenIds.has(event.id)) {
        result.push(event);
        seenIds.add(event.id);
      }
    }
  }

  return result;
}

/**
 * Generates a "why we picked this" blurb locally.
 * Format: "Picked because you chose [vibe] + [group] + [budget]."
 */
export function generateLocalWhy(event: NormalisedEvent, answers: Answers): string {
  const parts: string[] = [];

  const vibeMap: Partial<Record<string, string>> = {
    cozy:     'slow & cozy',
    social:   'social',
    cultural: 'artsy & cultural',
    active:   'active & outdoorsy',
    foodie:   'foodie',
    party:    'party energy',
    offbeat:  'offbeat',
  };
  if (answers.vibe && vibeMap[answers.vibe]) parts.push(vibeMap[answers.vibe]!);

  const whoMap: Partial<Record<string, string>> = {
    solo: 'solo', partner: 'date night', friends: 'group', family: 'family', new_people: 'meeting new people',
  };
  if (answers.who && whoMap[answers.who]) parts.push(whoMap[answers.who]!);

  const budgetMap: Partial<Record<string, string>> = {
    budget: 'under ₹500', comfortable: 'under ₹2,000', premium: '₹2,000+', flexible: 'flexible budget',
  };
  if (answers.budget && budgetMap[answers.budget]) parts.push(budgetMap[answers.budget]!);

  if (parts.length > 0) {
    return `Picked because you chose ${parts.join(' + ')}. ${event.description}`;
  }
  return event.description;
}
