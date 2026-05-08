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

/**
 * Score a single event against user answers.
 * Returns null if a hard-no trigger matches (hard elimination).
 */
export function scoreEvent(
  event: NormalisedEvent,
  answers: Answers,
  hardNos: Trigger[],
): ScoredEvent | null {
  // Hard elimination
  if (hardNos.some(no => event.triggers.includes(no))) return null;
  if (hardNos.includes('expensive_plans') && event.cost_bracket === 'premium') return null;

  let score = 0;

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
    why: '', // filled by Claude API or generateLocalWhy()
  };
}

/**
 * Score all events, filter eliminations, sort by score, return top N.
 */
export function scoreEvents(
  events: NormalisedEvent[],
  answers: Answers,
  hardNos: Trigger[],
  topN = 20,
): ScoredEvent[] {
  const scored = events
    .map(e => scoreEvent(e, answers, hardNos))
    .filter((e): e is ScoredEvent => e !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  // If hard nos filtered too aggressively, fall back without them
  if (scored.length < 3 && hardNos.length > 0) {
    return scoreEvents(events, answers, [], topN);
  }

  return scored;
}

/**
 * Generates a "why we picked this" blurb locally (used when Claude API fails).
 */
export function generateLocalWhy(event: NormalisedEvent, answers: Answers): string {
  const matches: string[] = [];

  const vibeMap: Partial<Record<string, string>> = {
    cozy:     'a slow, unhurried experience',
    social:   'a social atmosphere',
    cultural: 'arts and culture',
    active:   'getting outdoors and moving',
    foodie:   'a proper food experience',
    party:    'high energy and a lively crowd',
    offbeat:  'something a little different',
  };
  if (event.vibe === answers.vibe && vibeMap[event.vibe]) {
    matches.push(`fits your preference for ${vibeMap[event.vibe]}`);
  }

  const whoMap: Partial<Record<string, string>> = {
    solo:       'well suited to solo plans',
    partner:    'great as a date',
    friends:    'a good fit for a group',
    family:     'family-friendly throughout',
    new_people: 'an easy place to meet new people',
  };
  if (event.companions.includes(answers.who) && whoMap[answers.who]) {
    matches.push(whoMap[answers.who]!);
  }

  if (
    event.cost_bracket === answers.budget ||
    (answers.budget === 'flexible' && ['premium', 'comfortable'].includes(event.cost_bracket))
  ) {
    matches.push('sits comfortably within your budget');
  }

  if (event.risk === 'hidden_gem' && answers.risk === 'hidden_gem') {
    matches.push('not something you will easily stumble across on your own');
  }

  const top = matches.slice(0, 3);
  if (top.length === 0) return event.description;
  const first = top[0][0].toUpperCase() + top[0].slice(1);
  if (top.length === 1) return `${first}. ${event.description}`;
  if (top.length === 2) return `${first}, and ${top[1]}.`;
  return `${first}, ${top[1]}, and ${top[2]}.`;
}
