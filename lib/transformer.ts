import type {
  RawEvent, NormalisedEvent,
  Vibe, Effort, Budget, Risk, Feeling, Trigger, Who,
} from './types';

// ─── Vibe colours & emoji ─────────────────────────────────────────────────────

const VIBE_STYLE: Record<Vibe, { color: string; textColor: string; emoji: string }> = {
  party: { color: '#FF2E93', textColor: '#FFF8E7', emoji: '🪩' },
  social: { color: '#C5F82A', textColor: '#0A0A0A', emoji: '🎤' },
  cozy: { color: '#2EC4FF', textColor: '#0A0A0A', emoji: '🧘' },
  cultural: { color: '#FFE93D', textColor: '#0A0A0A', emoji: '🎭' },
  active: { color: '#FF2E93', textColor: '#FFF8E7', emoji: '🏃' },
  foodie: { color: '#FFB47A', textColor: '#0A0A0A', emoji: '🍛' },
  offbeat: { color: '#FFE93D', textColor: '#0A0A0A', emoji: '✨' },
};

// Add variety — cycle secondary palette by event id
const ALT_COLORS: Record<Vibe, { color: string; textColor: string }[]> = {
  party: [{ color: '#FF2E93', textColor: '#FFF8E7' }, { color: '#C5F82A', textColor: '#0A0A0A' }],
  social: [{ color: '#C5F82A', textColor: '#0A0A0A' }, { color: '#FFE93D', textColor: '#0A0A0A' }],
  cozy: [{ color: '#2EC4FF', textColor: '#0A0A0A' }, { color: '#FFB47A', textColor: '#0A0A0A' }],
  cultural: [{ color: '#FFE93D', textColor: '#0A0A0A' }, { color: '#FF2E93', textColor: '#FFF8E7' }],
  active: [{ color: '#FF2E93', textColor: '#FFF8E7' }, { color: '#2EC4FF', textColor: '#0A0A0A' }],
  foodie: [{ color: '#FFB47A', textColor: '#0A0A0A' }, { color: '#FFE93D', textColor: '#0A0A0A' }],
  offbeat: [{ color: '#FFE93D', textColor: '#0A0A0A' }, { color: '#2EC4FF', textColor: '#0A0A0A' }],
};

// ─── Category → Vibe ─────────────────────────────────────────────────────────

function inferVibe(raw: RawEvent): Vibe {
  const cat = (raw.category ?? '').toLowerCase();
  const sub = (raw.subcategory ?? '').toLowerCase();
  const tags = (raw.vibe_tags ?? []).map(t => t.toLowerCase());

  // Subcategory takes highest priority for ambiguous categories
  if (sub.match(/rave|techno|house|edm|electronic|dj|club/)) return 'party';
  if (sub.match(/cooking|baking|food|wine|tasting|chef/)) return 'foodie';
  if (sub.match(/pottery|craft|paint|resin|macrame|art/)) return 'offbeat';
  if (sub.match(/trek|hike|camping|nature|bird/)) return 'active';
  if (sub.match(/yoga|meditation|wellness|fitness|run/)) return 'cozy';

  // Primary category
  const MAP: Record<string, Vibe> = {
    nightlife: 'party',
    festival: 'party',
    'sports_+_music': 'party',
    comedy: 'social',
    community: 'social',
    open_mic: 'social',
    games: 'social',
    wellness: 'cozy',
    cinema: 'cozy',
    kids: 'cozy',
    cultural: 'cultural',
    performance: 'cultural',
    theatre: 'cultural',
    educational: 'cultural',
    outdoor: 'active',
    sports: 'active',
    trip: 'active',
    food: 'foodie',
    'food_&_drink': 'foodie',
    workshops: 'offbeat',
    tech: 'offbeat',
    conference: 'offbeat',
    business: 'offbeat',
  };

  if (MAP[cat]) return MAP[cat];

  // Music: check subcategory for party vs social
  if (cat === 'music') {
    if (sub.match(/live|band|concert|classical|jazz|indie/)) return 'social';
    return 'party';
  }

  // Vibe tag fallback
  if (tags.includes('social') || tags.includes('community')) return 'social';
  if (tags.includes('cultural') || tags.includes('heritage')) return 'cultural';
  if (tags.includes('outdoor') || tags.includes('trek')) return 'active';

  return 'social'; // safe default
}

// ─── Effort ──────────────────────────────────────────────────────────────────

const FAR_AREAS = [
  'nandi hills', 'chikballapur', 'doddaballapur', 'savandurga', 'kolar',
  'makalidurga', 'anthargange', 'ramanagara', 'manchanabele', 'devanahalli',
];
const MID_AREAS = [
  'whitefield', 'yelahanka', 'hebbal', 'manyata', 'bannerghatta',
  'electronic city', 'sarjapur', 'kanakapura',
];

function inferEffort(raw: RawEvent): Effort {
  const area = (raw.area ?? '').toLowerCase();
  const sub = (raw.subcategory ?? '').toLowerCase();

  if (FAR_AREAS.some(a => area.includes(a))) return 'trip';
  if (sub.match(/trek|camping|day.?trip|day.?out/)) return 'trip';
  if (MID_AREAS.some(a => area.includes(a))) return 'city';
  return 'easy';
}

// ─── Budget ───────────────────────────────────────────────────────────────────

function inferBudget(raw: RawEvent): Budget {
  const max = raw.price_max ?? raw.price_min ?? null;
  if (max === null || max === 0) return 'budget';
  if (max <= 500) return 'budget';
  if (max <= 2000) return 'comfortable';
  return 'premium';
}

function formatCost(raw: RawEvent): string {
  if (raw.price_text && raw.price_text !== 'Not listed') return raw.price_text;
  if (!raw.price_min && !raw.price_max) return 'Check link';
  if (!raw.price_max || raw.price_max === 0) return 'FREE';
  if (!raw.price_min || raw.price_min === 0) return `₹${raw.price_max.toLocaleString('en-IN')}`;
  return `₹${raw.price_min.toLocaleString('en-IN')} – ₹${raw.price_max.toLocaleString('en-IN')}`;
}

// ─── Risk ─────────────────────────────────────────────────────────────────────

function inferRisk(raw: RawEvent): Risk {
  const sub = (raw.subcategory ?? '').toLowerCase();
  const tags = (raw.vibe_tags ?? []).map(t => t.toLowerCase());
  const cat = (raw.category ?? '').toLowerCase();

  if (tags.some(t => ['underground', 'hidden', 'niche', 'invite-only'].includes(t))) return 'hidden_gem';
  if (sub.match(/trial|test|open.?mic|debut/)) return 'mix';

  const SURPRISE_CATS = ['nightlife', 'festival', 'trip', 'outdoor'];
  const SAFE_CATS = ['comedy', 'cultural', 'cinema', 'kids', 'wellness'];
  const MIX_CATS = ['workshops', 'community', 'music', 'food', 'open_mic'];

  if (SURPRISE_CATS.includes(cat)) return 'surprise';
  if (SAFE_CATS.includes(cat)) return 'safe';
  if (MIX_CATS.includes(cat)) return 'mix';
  return 'mix';
}

// ─── Feelings ─────────────────────────────────────────────────────────────────

function inferFeelings(raw: RawEvent): Feeling[] {
  const cat = (raw.category ?? '').toLowerCase();
  const sub = (raw.subcategory ?? '').toLowerCase();
  const tags = (raw.vibe_tags ?? []).map(t => t.toLowerCase());

  const feelings: Feeling[] = [];

  if (['wellness', 'cinema', 'kids'].includes(cat)) feelings.push('low_battery', 'cozy');
  if (['comedy', 'community', 'games'].includes(cat)) feelings.push('relaxed', 'social');
  if (['nightlife', 'festival'].includes(cat)) feelings.push('buzzing', 'social');
  if (['cultural', 'educational'].includes(cat)) feelings.push('curious', 'relaxed');
  if (['workshops'].includes(cat)) feelings.push('curious', 'cozy');
  if (['food', 'food_&_drink'].includes(cat)) feelings.push('relaxed', 'social', 'curious');
  if (['outdoor', 'sports', 'trip'].includes(cat)) feelings.push('buzzing', 'curious');
  if (tags.includes('social')) feelings.push('social');
  if (sub.match(/yoga|meditation/)) feelings.push('cozy', 'low_battery');

  return Array.from(new Set(feelings)).slice(0, 4) as Feeling[];
}

// ─── Companions ───────────────────────────────────────────────────────────────

function inferCompanions(raw: RawEvent): Who[] {
  const companions: Who[] = [];
  const age = (raw.age_group ?? '').toLowerCase();
  const vibe = inferVibe(raw);

  if (raw.solo_friendly !== false) companions.push('solo');
  if (raw.couple_friendly !== false) companions.push('partner');
  if (raw.group_friendly !== false) companions.push('friends');
  if (age === 'all' || age === 'kids') companions.push('family');
  if (['social', 'party'].includes(vibe)) companions.push('new_people');

  // Ensure at least one option
  if (companions.length === 0) companions.push('solo', 'friends');
  return [...new Set(companions)] as Who[];
}

// ─── Triggers ─────────────────────────────────────────────────────────────────

function inferTriggers(raw: RawEvent): Trigger[] {
  const sub = (raw.subcategory ?? '').toLowerCase();
  const tags = (raw.vibe_tags ?? []).map(t => t.toLowerCase());
  const area = (raw.area ?? '').toLowerCase();
  const time = (raw.time ?? '');
  const triggers = new Set<Trigger>();

  // Alcohol
  if (tags.some(t => ['alcohol', 'wine', 'beer', 'cocktail', 'bar'].includes(t))
    || sub.match(/bar|pub|brewery|cocktail|wine|beer/)) {
    triggers.add('alcohol');
  }

  // Early mornings
  const hour = parseInt(time.split(':')[0] ?? '12', 10);
  if (!isNaN(hour) && hour < 8) triggers.add('early_mornings');

  // Long travel
  if (FAR_AREAS.some(a => area.includes(a))
    || sub.match(/trek|camping|day.?trip/)) {
    triggers.add('long_travel');
  }

  // Loud music
  if (tags.some(t => ['loud', 'dj', 'electronic', 'techno', 'rave'].includes(t))
    || sub.match(/club|rave|techno|edm|dj/)) {
    triggers.add('loud_music');
  }

  // Spicy food
  if (sub.match(/street.?food|spicy|chilli/) || tags.includes('spicy')) {
    triggers.add('spicy_food');
  }

  // Outdoor heat
  if (['outdoor', 'trip', 'sports'].includes(raw.category ?? '')
    || sub.match(/trek|run|walk|outdoor|cycling/)) {
    triggers.add('outdoor_heat');
  }

  // Expensive plans
  if ((raw.price_max ?? 0) > 2000) triggers.add('expensive_plans');

  // Crowds
  if (tags.some(t => ['crowd', 'crowd', 'festival', 'large'].includes(t))
    || ['festival', 'nightlife'].includes(raw.category ?? '')) {
    triggers.add('crowds');
  }

  return [...triggers];
}

// ─── CTA text ─────────────────────────────────────────────────────────────────

function inferCta(raw: RawEvent): string {
  const cat = (raw.category ?? '').toLowerCase();
  const sub = (raw.subcategory ?? '').toLowerCase();
  const max = raw.price_max ?? 0;

  if (max === 0 || !raw.price_max) return 'GET DIRECTIONS';
  if (sub.match(/trek|camp|hike/)) return 'BOOK THE TREK';
  if (cat === 'workshops') return 'BOOK A SPOT';
  if (cat === 'comedy') return 'BOOK TICKETS';
  if (cat === 'food') return 'JOIN THE WALK';
  if (cat === 'nightlife') return 'BUY TICKETS';
  if (cat === 'music') return 'BUY TICKETS';
  return 'BOOK NOW';
}

// ─── Location label ───────────────────────────────────────────────────────────

function formatLocation(raw: RawEvent): string {
  const venue = raw.venue ?? '';
  const area = raw.area ?? '';
  if (venue && area && venue !== area) return area; // keep it short: just the area
  return area || venue || 'Bengaluru';
}

// ─── MAIN TRANSFORMER ────────────────────────────────────────────────────────

export function transformEvent(raw: RawEvent, index: number): NormalisedEvent {
  const vibe = inferVibe(raw);
  const alts = ALT_COLORS[vibe];
  const style = index % 3 === 0 ? VIBE_STYLE[vibe] : alts[index % alts.length] ?? VIBE_STYLE[vibe];

  return {
    id: raw.id,
    name: raw.name,
    emoji: VIBE_STYLE[vibe].emoji,
    location: formatLocation(raw),
    cost: formatCost(raw),
    cost_bracket: inferBudget(raw),
    vibe,
    effort: inferEffort(raw),
    feelings: inferFeelings(raw),
    companions: inferCompanions(raw),
    risk: inferRisk(raw),
    triggers: inferTriggers(raw),
    cta: inferCta(raw),
    cta_url: raw.source_url || raw.booking_link || '#',
    description: raw.description || `${raw.category} event in ${raw.area || 'Bengaluru'}.`,
    color: style.color,
    textColor: style.textColor,
  };
}

export function transformEvents(rawEvents: RawEvent[]): NormalisedEvent[] {
  return rawEvents.map((e, i) => transformEvent(e, i));
}
