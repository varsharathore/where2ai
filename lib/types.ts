// ─── Raw event shape from your events.json ─────────────────────────────────

export interface RawEvent {
  id: number;
  name: string;
  date?: string;
  day?: string;
  time?: string;
  end_time?: string | null;
  venue?: string;
  area?: string;
  category: string;
  subcategory?: string;
  price_min?: number | null;
  price_max?: number | null;
  price_text?: string;
  vibe_tags?: string[];
  description?: string;
  age_group?: string;
  solo_friendly?: boolean;
  couple_friendly?: boolean;
  group_friendly?: boolean;
  booking_link?: string;
  source_url?: string;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: unknown;
}

// ─── Normalised event used by scorer + UI ────────────────────────────────────

export type Vibe     = 'cozy' | 'social' | 'cultural' | 'active' | 'foodie' | 'party' | 'offbeat';
export type Effort   = 'easy' | 'city' | 'trip';
export type Budget   = 'budget' | 'comfortable' | 'premium' | 'flexible';
export type Risk     = 'safe' | 'mix' | 'hidden_gem' | 'surprise';
export type Who      = 'solo' | 'partner' | 'friends' | 'family' | 'new_people';
export type Feeling  = 'low_battery' | 'relaxed' | 'buzzing' | 'cozy' | 'curious' | 'social';
export type Trigger  =
  | 'crowds' | 'alcohol' | 'early_mornings' | 'long_travel'
  | 'loud_music' | 'spicy_food' | 'outdoor_heat' | 'expensive_plans';

export interface NormalisedEvent {
  id: number;
  name: string;
  emoji: string;
  location: string;
  date: string | null;        // ISO date string e.g. "2026-05-10"
  cost: string;
  cost_bracket: Budget;
  vibe: Vibe;
  effort: Effort;
  feelings: Feeling[];
  companions: Who[];
  risk: Risk;
  triggers: Trigger[];
  // URL handling — kept separate so UI can label correctly
  source_url: string;         // most specific URL available
  booking_link_raw: string;   // original booking_link field from JSON
  is_direct_link: boolean;    // true = direct event page, false = platform homepage
  cta: string;                // button label
  description: string;
  color: string;
  textColor: string;
}

// ─── Quiz answers ─────────────────────────────────────────────────────────────

export interface Answers {
  who: Who;
  vibe: Vibe;
  effort: Effort;
  feeling: Feeling;
  budget: Budget;
  risk: Risk;
}

// ─── Scored event (what the UI renders) ──────────────────────────────────────

export interface ScoredEvent extends NormalisedEvent {
  score: number;
  percentage: number;
  why: string;
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface PlansRequest {
  answers: Answers;
  hardNos: Trigger[];
  weekend: 'this' | 'next';
}

export interface PlansResponse {
  results: ScoredEvent[];
  source: 'claude' | 'local';
  weekendLabel: string;
  limitedMatches: boolean;    // true = fewer than 3 exact date matches found
}
