'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, MapPin, Wallet, RotateCcw,
  ExternalLink, Check, Search, Calendar,
} from 'lucide-react';
import type { Answers, ScoredEvent, Trigger } from '@/lib/types';

// ─── Security: enum allow-lists ────────────────────────────────────────────────
// All user inputs are validated against these lists before leaving the client.
// Nothing outside these values ever reaches the API route.

const ALLOWED_VALUES: Record<string, string[]> = {
  who:     ['solo', 'partner', 'friends', 'family', 'new_people'],
  vibe:    ['cozy', 'social', 'cultural', 'active', 'foodie', 'party', 'offbeat'],
  effort:  ['easy', 'city', 'trip'],
  feeling: ['low_battery', 'relaxed', 'buzzing', 'cozy', 'curious', 'social'],
  budget:  ['budget', 'comfortable', 'premium', 'flexible'],
  risk:    ['safe', 'mix', 'hidden_gem', 'surprise'],
};

const ALLOWED_TRIGGERS = [
  'crowds', 'alcohol', 'early_mornings', 'long_travel',
  'loud_music', 'spicy_food', 'outdoor_heat', 'expensive_plans',
];

function sanitizeAnswers(raw: Partial<Answers>): Partial<Answers> {
  const clean: Partial<Answers> = {};
  for (const key of Object.keys(ALLOWED_VALUES) as (keyof Answers)[]) {
    const val = raw[key] as string | undefined;
    if (val && ALLOWED_VALUES[key].includes(val)) {
      (clean as Record<string, string>)[key] = val;
    }
  }
  return clean;
}

function sanitizeTriggers(raw: string[]): Trigger[] {
  return raw.filter(t => ALLOWED_TRIGGERS.includes(t)) as Trigger[];
}

// ─── Quiz data ─────────────────────────────────────────────────────────────────
// Progressive disclosure — same 6 questions, feels like 3 mini-steps:
//   Phase 1 (Core):      who, vibe, budget   → counter shows "1/3, 2/3, 3/3"
//   Phase 2 (Fine-tune): effort, feeling      → "1/2, 2/2" + phase banner
//   Phase 3 (Optional):  risk                 → "Optional" badge + skip always visible

interface QuestionOption {
  value: string;
  label: string;
  emoji: string;
  sub?: string;
}

interface Question {
  id: string;
  phase: 1 | 2 | 3;
  phaseStep: number;
  phaseTotal: number;
  phaseBanner?: string;
  optional?: true;
  text: string;
  subtext: string;
  options: QuestionOption[];
}

const QUESTIONS: Question[] = [
  {
    id: 'who', phase: 1, phaseStep: 1, phaseTotal: 3,
    text: "Who's joining the plan?",
    subtext: "Tell us the company, and we'll match the mood.",
    options: [
      { value: 'solo',       label: 'Just me',        emoji: '🧑' },
      { value: 'partner',    label: 'Date / partner',  emoji: '💕' },
      { value: 'friends',    label: 'Friends',         emoji: '🫂' },
      { value: 'family',     label: 'Family',          emoji: '👨‍👩‍👧' },
      { value: 'new_people', label: 'Meet new people', emoji: '🤝' },
    ],
  },
  {
    id: 'vibe', phase: 1, phaseStep: 2, phaseTotal: 3,
    text: 'What kind of weekend are you in the mood for?',
    subtext: 'Pick the energy you want.',
    options: [
      { value: 'cozy',     label: 'Slow & cozy',         emoji: '🕯️' },
      { value: 'social',   label: 'Social & fun',         emoji: '🎉' },
      { value: 'cultural', label: 'Artsy & cultural',     emoji: '🎭' },
      { value: 'active',   label: 'Active & outdoorsy',   emoji: '🏃' },
      { value: 'foodie',   label: 'Foodie & indulgent',   emoji: '🍛' },
      { value: 'party',    label: 'Party energy',         emoji: '🔥' },
      { value: 'offbeat',  label: 'Offbeat & unexpected', emoji: '✨' },
    ],
  },
  {
    id: 'budget', phase: 1, phaseStep: 3, phaseTotal: 3,
    text: "What's the budget comfort zone?",
    subtext: 'Good plans exist at every price point.',
    options: [
      { value: 'budget',      label: 'Easy on the wallet', emoji: '🪙', sub: '₹0 – ₹500' },
      { value: 'comfortable', label: 'Comfortable',         emoji: '💵', sub: '₹500 – ₹2,000' },
      { value: 'premium',     label: 'Premium',             emoji: '💳', sub: '₹2,000+' },
      { value: 'flexible',    label: 'Worth the splurge',   emoji: '✦',  sub: 'Flexible' },
    ],
  },
  {
    id: 'effort', phase: 2, phaseStep: 1, phaseTotal: 2,
    phaseBanner: '2 more to fine-tune your plans.',
    text: 'How much effort are we putting in?',
    subtext: 'Nearby, across town, or a proper day out?',
    options: [
      { value: 'easy', label: 'Keep it easy',    emoji: '🛋️', sub: 'Close to home' },
      { value: 'city', label: 'Across the city', emoji: '🚗', sub: 'Happy to travel' },
      { value: 'trip', label: 'Short trip',      emoji: '🚙', sub: 'Day out, no problem' },
    ],
  },
  {
    id: 'feeling', phase: 2, phaseStep: 2, phaseTotal: 2,
    text: 'What mood are we planning around?',
    subtext: 'Your weekend should match your energy.',
    options: [
      { value: 'low_battery', label: 'Low battery', emoji: '🪫' },
      { value: 'relaxed',     label: 'Relaxed',     emoji: '😌' },
      { value: 'buzzing',     label: 'Buzzing',      emoji: '⚡' },
      { value: 'cozy',        label: 'Soft & cozy', emoji: '🕯️' },
      { value: 'curious',     label: 'Curious',     emoji: '🔮' },
      { value: 'social',      label: 'Social',      emoji: '💬' },
    ],
  },
  {
    id: 'risk', phase: 3, phaseStep: 1, phaseTotal: 1,
    phaseBanner: 'Last one, promise.',
    optional: true,
    text: 'How adventurous should the plan be?',
    subtext: 'Safe bet, or something you have never tried?',
    options: [
      { value: 'safe',       label: 'Safe bet',    emoji: '🤲', sub: 'Tried & trusted' },
      { value: 'mix',        label: 'Mix it up',   emoji: '🎲', sub: 'Old and new' },
      { value: 'hidden_gem', label: 'Hidden gem',  emoji: '💎', sub: 'Under the radar' },
      { value: 'surprise',   label: 'Surprise me', emoji: '🌪️', sub: 'Full discovery mode' },
    ],
  },
];

const HARD_NOS = [
  { value: 'crowds',          label: 'Crowds',         emoji: '🚫' },
  { value: 'alcohol',         label: 'Alcohol',         emoji: '🍺' },
  { value: 'early_mornings',  label: 'Early mornings',  emoji: '⏰' },
  { value: 'long_travel',     label: 'Long travel',     emoji: '🚗' },
  { value: 'loud_music',      label: 'Loud music',      emoji: '🔊' },
  { value: 'spicy_food',      label: 'Spicy food',      emoji: '🌶️' },
  { value: 'outdoor_heat',    label: 'Outdoor heat',    emoji: '☀️' },
  { value: 'expensive_plans', label: 'Expensive plans', emoji: '💸' },
];

const LOADING_MESSAGES = [
  'Searching across Bengaluru...',
  'Matching your preferences...',
  'Building your weekend plan...',
  'Curating the best options...',
  'Almost ready...',
];

const Q_ACCENTS = ['#C5F82A', '#FF2E93', '#2EC4FF', '#FFE93D', '#FFB47A', '#C5F82A'];

// ─── Shared helpers ────────────────────────────────────────────────────────────

function getWeekendLabel(which: 'this' | 'next'): string {
  const today = new Date();
  const day = today.getDay();
  const daysUntilFri = day === 5 ? 0 : day === 6 ? 6 : (5 - day + 7) % 7;
  const fri = new Date(today);
  fri.setDate(today.getDate() + daysUntilFri + (which === 'next' ? 7 : 0));
  const sun = new Date(fri);
  sun.setDate(fri.getDate() + 2);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(fri)} – ${fmt(sun)}`;
}

const CreatorCredit = () => (
  <p className="text-xs opacity-40" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
    Made by{' '}
    <a
      href="https://linkedin.com/in/varshasinghrathore"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:opacity-70 transition-opacity"
    >
      Varsha Rathore
    </a>
    {' · '}
    <a
      href="https://instagram.com/roamwithrains"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:opacity-70 transition-opacity"
    >
      📷 roamwithrains
    </a>
  </p>
);

const Logo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sz = { sm: 'text-xl', md: 'text-2xl', lg: 'text-5xl' }[size];
  return (
    <div
      className={`inline-flex items-baseline gap-0 font-black tracking-tighter select-none ${sz}`}
      style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}
    >
      <span>where</span>
      <span
        style={{
          backgroundColor: '#C5F82A',
          color: '#0A0A0A',
          padding: '1px 4px',
          border: '2.5px solid #0A0A0A',
          lineHeight: 1.1,
          display: 'inline-block',
          transform: 'translateY(-1px)',
        }}
      >
        2
      </span>
      <span style={{ color: '#FF2E93' }}>.ai</span>
    </div>
  );
};

const BrutalButton = ({
  children,
  onClick,
  color = '#C5F82A',
  textColor = '#0A0A0A',
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  textColor?: string;
  className?: string;
}) => (
  <motion.button
    onClick={onClick}
    whileHover={{ x: -3, y: -3 }}
    whileTap={{ x: 0, y: 0 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    className={`relative inline-flex items-center justify-center gap-2 px-6 py-3 font-bold uppercase tracking-tight border-[3px] border-black ${className}`}
    style={{
      backgroundColor: color,
      color: textColor,
      boxShadow: '6px 6px 0 #0A0A0A',
      fontFamily: '"Bricolage Grotesque", sans-serif',
    }}
  >
    {children}
  </motion.button>
);

// ─── Floating nav ──────────────────────────────────────────────────────────────
// FIX: was max-w-5xl — now max-w-7xl to match the results grid container.
// Previously the pill ended at ~1024px while cards stretched to ~1280px,
// leaving a visible width gap on large screens.

const NavHeader = ({ onRestart }: { onRestart?: () => void }) => (
  <div
    className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-7xl"
    style={{ filter: 'drop-shadow(0 4px 24px rgba(10,10,10,0.10))' }}
  >
    <div
      className="flex items-center justify-between px-5 py-3 rounded-2xl border border-black/10"
      style={{
        backgroundColor: 'rgba(255,248,231,0.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow:
          '0 2px 0 rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
      }}
    >
      <button
        onClick={onRestart}
        className="cursor-pointer transition-opacity hover:opacity-70 active:opacity-50 focus:outline-none"
        aria-label="Return to home"
      >
        <Logo size="md" />
      </button>
      <div
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ fontFamily: '"JetBrains Mono", monospace', color: '#4B4B4B' }}
      >
        Bengaluru · May 2026
      </div>
    </div>
  </div>
);

// ─── Answer chips ──────────────────────────────────────────────────────────────
// Replaces the old `buildIntentionBlurb` sentence.
//
// BEFORE (broken UX):
//   Amber row → "We picked this for a slow & cozy date night"
//   Body row  → "A relaxed evening with great music..."  ← reads as same thing
//
// AFTER (fixed):
//   Amber row → chips: [🕯️ Cozy] [💕 Date night] [💵 < ₹2k]
//   Body row  → Claude's event-specific reason (always different)
//
// The two rows are now semantically distinct:
//   Row 1 = who YOU are / what YOU asked for
//   Row 2 = why THIS EVENT fits that

const WHO_META: Record<string, { emoji: string; label: string }> = {
  solo:       { emoji: '🧑',    label: 'Solo' },
  partner:    { emoji: '💕',    label: 'Date night' },
  friends:    { emoji: '🫂',    label: 'With friends' },
  family:     { emoji: '👨‍👩‍👧', label: 'Family' },
  new_people: { emoji: '🤝',    label: 'Meet people' },
};
const VIBE_META: Record<string, { emoji: string; label: string }> = {
  cozy:     { emoji: '🕯️', label: 'Cozy' },
  social:   { emoji: '🎉', label: 'Social' },
  cultural: { emoji: '🎭', label: 'Cultural' },
  active:   { emoji: '🏃', label: 'Active' },
  foodie:   { emoji: '🍛', label: 'Foodie' },
  party:    { emoji: '🔥', label: 'Party' },
  offbeat:  { emoji: '✨', label: 'Offbeat' },
};
const BUDGET_META: Record<string, { emoji: string; label: string }> = {
  budget:      { emoji: '🪙', label: '< ₹500' },
  comfortable: { emoji: '💵', label: '< ₹2k' },
  premium:     { emoji: '💳', label: '₹2k+' },
  flexible:    { emoji: '✦',  label: 'Flexible' },
};

function AnswerChips({ answers }: { answers: Partial<Answers> }) {
  const chips: { emoji: string; label: string; key: string }[] = [];
  if (answers.who    && WHO_META[answers.who])       chips.push({ ...WHO_META[answers.who],       key: 'who' });
  if (answers.vibe   && VIBE_META[answers.vibe])     chips.push({ ...VIBE_META[answers.vibe],     key: 'vibe' });
  if (answers.budget && BUDGET_META[answers.budget]) chips.push({ ...BUDGET_META[answers.budget], key: 'budget' });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 items-center min-w-0">
      {chips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border-[1.5px] whitespace-nowrap"
          style={{
            color: '#92400E',
            borderColor: '#92400E',
            backgroundColor: 'rgba(255,255,255,0.5)',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          {chip.emoji} {chip.label}
        </span>
      ))}
    </div>
  );
}

// ─── Screens ───────────────────────────────────────────────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      key="intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
    >
      <div className="absolute top-10 left-10 w-32 h-32 rounded-full opacity-55 blur-2xl" style={{ backgroundColor: '#FF2E93' }} />
      <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full opacity-45 blur-3xl" style={{ backgroundColor: '#C5F82A' }} />
      <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full opacity-35 blur-2xl" style={{ backgroundColor: '#2EC4FF' }} />

      <div className="relative max-w-3xl w-full text-center flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120 }}
          className="mb-8"
        >
          <Logo size="lg" />
        </motion.div>

        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-4xl sm:text-5xl md:text-7xl font-black leading-[0.95] tracking-tight uppercase mb-6"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}
        >
          Your Bengaluru<br />weekend,{' '}
          <span
            className="inline-block px-2 border-[3px] border-black"
            style={{ backgroundColor: '#FF2E93', color: '#FFF8E7', transform: 'rotate(-1deg)' }}
          >
            sorted.
          </span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-base md:text-xl font-medium mb-10 max-w-xl leading-relaxed"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#4B4B4B' }}
        >
          6 quick picks → 3 AI-curated plans.<br />
          No scrolling. No group chats. Just your weekend.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <BrutalButton onClick={onStart} className="text-xl">
            Find my plans <ArrowRight size={22} strokeWidth={3} />
          </BrutalButton>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-xs font-bold uppercase tracking-widest"
          style={{ fontFamily: '"JetBrains Mono", monospace', color: '#9B9B9B' }}
        >
          196 Bengaluru events · Curated by AI
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 flex flex-col items-center gap-1.5"
      >
        <CreatorCredit />
      </motion.div>
    </motion.div>
  );
}

function QuizScreen({
  questionIndex,
  answers,
  onAnswer,
  onBack,
  totalQuestions,
  onSkipToPlans,
}: {
  questionIndex: number;
  answers: Partial<Answers>;
  onAnswer: (id: string, value: string) => void;
  onBack: () => void;
  totalQuestions: number;
  onSkipToPlans: () => void;
}) {
  const question   = QUESTIONS[questionIndex];
  const accent     = Q_ACCENTS[questionIndex % Q_ACCENTS.length];
  const progress   = ((questionIndex + 1) / totalQuestions) * 100;
  const n          = question.options.length;
  const gridCols   =
    n <= 3 ? 'grid-cols-1' :
    n === 4 ? 'grid-cols-2' :
    'grid-cols-2 md:grid-cols-3';

  const phaseLabel  = question.phase === 1 ? 'Core picks' : question.phase === 2 ? 'Fine-tuning' : null;
  const isNewPhase  = !!question.phaseBanner;
  const isOptional  = !!question.optional;
  // Skip visible once phase 1 is complete (index 3+)
  const canSkip     = questionIndex >= 3;

  return (
    <motion.div
      key={`q-${questionIndex}`}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.28 }}
      className="min-h-screen flex flex-col px-6 pt-24 pb-12 max-w-3xl mx-auto w-full"
    >
      {/* ── Top bar ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider opacity-60 hover:opacity-90 transition-opacity"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          {/* Phase-relative counter
              BEFORE: "04 / 06" — felt like an endless list
              AFTER:  "1 / 2" with "Fine-tuning" label — feels like a quick sub-section */}
          <div className="flex items-center gap-2">
            {phaseLabel && (
              <span
                className="text-[9px] font-bold uppercase tracking-widest hidden sm:block"
                style={{ fontFamily: '"JetBrains Mono", monospace', color: '#9B9B9B' }}
              >
                {phaseLabel}
              </span>
            )}
            {isOptional ? (
              <span
                className="text-[10px] px-2 py-0.5 border-[2px] border-black font-bold uppercase tracking-wider"
                style={{ backgroundColor: accent, fontFamily: '"JetBrains Mono", monospace' }}
              >
                Optional
              </span>
            ) : (
              <span
                className="text-sm font-bold"
                style={{ fontFamily: '"JetBrains Mono", monospace', color: '#4B4B4B' }}
              >
                {question.phaseStep} / {question.phaseTotal}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="h-3 w-full border-[3px] border-black bg-white overflow-hidden"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="h-full"
            style={{ backgroundColor: accent }}
          />
        </div>

        {/* Phase banner — animated in at start of phase 2 and 3 */}
        {isNewPhase && question.phaseBanner && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 border-[2px] border-black text-xs font-bold"
            style={{ backgroundColor: accent, fontFamily: '"JetBrains Mono", monospace' }}
          >
            {question.phase === 3 ? '🎯' : '✓'} {question.phaseBanner}
          </motion.div>
        )}
      </div>

      {/* ── Question ── */}
      <div className="flex-1 flex flex-col justify-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2
            className="text-3xl md:text-5xl font-black leading-[1.05] mb-3 tracking-tight uppercase"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}
          >
            {question.text}
          </h2>
          <p
            className="text-base font-medium"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#4B4B4B' }}
          >
            {question.subtext}
          </p>
        </motion.div>

        <motion.div
          className={`grid ${gridCols} gap-3`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {question.options.map((opt, i) => {
            const isSelected =
              (answers as Record<string, string>)[question.id] === opt.value;
            return (
              <motion.button
                key={opt.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                whileHover={{ x: -2, y: -2 }}
                whileTap={{ x: 0, y: 0 }}
                onClick={() => onAnswer(question.id, opt.value)}
                className="relative p-4 border-[3px] border-black text-left transition-colors"
                style={{
                  backgroundColor: isSelected ? accent : 'white',
                  color: '#0A0A0A',
                  boxShadow: isSelected ? '4px 4px 0 #0A0A0A' : '3px 3px 0 #0A0A0A',
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                }}
              >
                <div className="text-2xl mb-1.5">{opt.emoji}</div>
                <div className="text-sm font-bold leading-tight">{opt.label}</div>
                {opt.sub && (
                  <div className="text-xs mt-0.5 font-medium" style={{ color: '#6B6B6B' }}>
                    {opt.sub}
                  </div>
                )}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 bg-black rounded-full flex items-center justify-center"
                  >
                    <Check size={11} color="white" strokeWidth={3} />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Skip — visible once phase 1 is complete */}
      {canSkip && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <button
            onClick={onSkipToPlans}
            className="text-xs font-bold uppercase tracking-wider underline opacity-50 hover:opacity-90 transition-opacity"
            style={{ fontFamily: '"JetBrains Mono", monospace', color: '#4B4B4B' }}
          >
            Skip optional questions → show my plans
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

function HardNoScreen({
  hardNos,
  onToggle,
  onSubmit,
  onBack,
}: {
  hardNos: Trigger[];
  onToggle: (v: Trigger) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      key="hardno"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.28 }}
      className="min-h-screen flex flex-col px-6 pt-24 pb-12 max-w-3xl mx-auto w-full"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider opacity-60 hover:opacity-90 transition-opacity"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <span
            className="text-[10px] px-2 py-1 border-[2px] border-black font-bold uppercase tracking-wider"
            style={{ fontFamily: '"JetBrains Mono", monospace', backgroundColor: '#FFE93D' }}
          >
            Almost there
          </span>
        </div>
        {/* Progress bar — full/100% since all questions are done */}
        <div
          className="h-3 w-full border-[3px] border-black overflow-hidden"
          style={{ backgroundColor: '#C5F82A', boxShadow: '3px 3px 0 #0A0A0A' }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-8">
          <h2
            className="text-3xl md:text-5xl font-black leading-[1.05] mb-3 tracking-tight uppercase"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}
          >
            Any hard nos?
          </h2>
          <p
            className="text-base font-medium"
            style={{ color: '#4B4B4B', fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            We'll filter these out completely. Skip if none.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {HARD_NOS.map(no => {
            const selected = hardNos.includes(no.value as Trigger);
            return (
              <motion.button
                key={no.value}
                whileHover={{ x: -2, y: -2 }}
                whileTap={{ x: 0, y: 0 }}
                onClick={() => onToggle(no.value as Trigger)}
                className="relative p-4 border-[3px] border-black text-center"
                style={{
                  backgroundColor: selected ? '#FF2E93' : 'white',
                  color: selected ? '#FFF8E7' : '#0A0A0A',
                  boxShadow: '5px 5px 0 #0A0A0A',
                }}
              >
                <div className="text-3xl mb-2">{no.emoji}</div>
                <div
                  className="text-sm font-bold leading-tight"
                  style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                >
                  {no.label}
                </div>
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2.5 right-2.5 w-5 h-5 bg-white rounded-full flex items-center justify-center"
                  >
                    <Check size={12} color="#FF2E93" strokeWidth={4} />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <button
            onClick={onSubmit}
            className="text-sm font-bold uppercase tracking-wider underline opacity-50 hover:opacity-90 transition-opacity"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            No preferences — show everything →
          </button>
          <BrutalButton onClick={onSubmit} color="#C5F82A" className="text-xl">
            Show My Plans <ArrowRight size={20} strokeWidth={3} />
          </BrutalButton>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingScreen() {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setMsgIdx(i => (i + 1) % LOADING_MESSAGES.length),
      700,
    );
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6"
    >
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        className="text-7xl mb-8"
      >
        🌀
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.div
          key={msgIdx}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="text-2xl md:text-4xl font-black tracking-tight text-center"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}
        >
          {LOADING_MESSAGES[msgIdx]}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Result card ───────────────────────────────────────────────────────────────

const CARD_ROTATIONS = ['-1.2deg', '0.6deg', '-0.6deg'];
const RANK_LABELS    = ['Top pick', '2nd pick', '3rd pick'];

function ResultCard({
  event,
  rank,
  delay,
  answers,
}: {
  event: ScoredEvent;
  rank: number;
  delay: number;
  answers: Partial<Answers>;
}) {
  const ctaLabel = event.is_direct_link ? event.cta : 'Find on platform';
  const ctaIcon  = event.is_direct_link
    ? <ExternalLink size={13} strokeWidth={3} />
    : <Search size={13} strokeWidth={3} />;

  return (
    <motion.div
      initial={{ y: 50, opacity: 0, rotate: 0 }}
      animate={{ y: 0, opacity: 1, rotate: CARD_ROTATIONS[rank] }}
      transition={{ delay, type: 'spring', stiffness: 100, damping: 15 }}
      whileHover={{ rotate: '0deg', y: -6, scale: 1.01 }}
      className="relative border-[4px] border-black overflow-hidden"
      style={{
        backgroundColor: event.color,
        boxShadow: '8px 8px 0 #0A0A0A',
        color: event.textColor,
      }}
    >
      {/* Rank tag */}
      <div
        className="absolute top-3 left-3 z-10 px-2.5 py-1 border-[3px] border-black bg-white text-xs font-bold uppercase tracking-wider"
        style={{
          color: '#0A0A0A',
          fontFamily: '"JetBrains Mono", monospace',
          boxShadow: '3px 3px 0 #0A0A0A',
        }}
      >
        {RANK_LABELS[rank]}
      </div>

      {/* Match % */}
      <div className="absolute top-3 right-3 z-10">
        <div
          className="px-3 py-1.5 border-[3px] border-black backdrop-blur-md flex items-center gap-1.5"
          style={{
            backgroundColor: 'rgba(255,255,255,0.38)',
            boxShadow: '3px 3px 0 #0A0A0A',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          <div className="text-xl font-black" style={{ color: '#1A1A1A' }}>
            {event.percentage}%
          </div>
          <div className="text-[9px] uppercase font-bold leading-tight" style={{ color: '#1A1A1A' }}>
            match
          </div>
        </div>
      </div>

      <div className="p-6 pt-16">
        <div className="text-5xl mb-3">{event.emoji}</div>
        <h3
          className="text-2xl md:text-3xl font-black leading-tight mb-3 tracking-tight uppercase"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
        >
          {event.name}
        </h3>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border-[2px] border-black text-xs font-bold"
            style={{ color: '#0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}
          >
            <MapPin size={10} strokeWidth={3} /> {event.location}
          </div>
          <div
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border-[2px] border-black text-xs font-bold"
            style={{ color: '#0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}
          >
            <Wallet size={10} strokeWidth={3} /> {event.cost}
          </div>
          {event.date && (
            <div
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border-[2px] border-black text-xs font-bold"
              style={{ color: '#0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}
            >
              <Calendar size={10} strokeWidth={3} />
              {new Date(event.date + 'T00:00:00').toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', weekday: 'short',
              })}
            </div>
          )}
        </div>

        {/* ── Why this fits you ─────────────────────────────────────────────────
            BEFORE:
              Amber row → "We picked this for a slow & cozy date night"  (sentence)
              Body row  → "A relaxed evening with great music..."        (same idea)

            AFTER:
              Amber row → [🕯️ Cozy] [💕 Date night] [💵 < ₹2k]          (chips = your picks)
              Body row  → Claude's event-specific reason                  (unique per event)

            Why chips > sentence:
              · Scannable at a glance — users confirm "yes this is mine"
              · Visually different from the text below — no longer reads as duplicate
              · Zero latency — still client-side, no API call                           */}
        <div className="mb-4 border-[2px] border-black overflow-hidden">
          {/* Amber: your selections as chips */}
          <div
            className="flex items-center gap-2 px-3 py-2 border-b-[2px] border-black flex-wrap"
            style={{ backgroundColor: '#FFF3CD' }}
          >
            <span
              className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border-[1.5px] whitespace-nowrap"
              style={{
                color: '#92400E',
                borderColor: '#92400E',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              Curated for
            </span>
            <AnswerChips answers={answers} />
          </div>

          {/* Body: Claude's event-specific reason */}
          <div className="px-3 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
            <p
              className="text-sm font-medium leading-snug"
              style={{ color: '#0A0A0A', fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              {event.why}
            </p>
          </div>
        </div>

        {/* CTA */}
        <a href={event.source_url} target="_blank" rel="noopener noreferrer">
          <motion.div
            whileHover={{ x: -2, y: -2 }}
            whileTap={{ x: 0, y: 0 }}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-black border-[3px] border-black text-xs font-black uppercase tracking-wider cursor-pointer"
            style={{
              color: event.color,
              boxShadow: '4px 4px 0 rgba(0,0,0,0.18)',
              fontFamily: '"Bricolage Grotesque", sans-serif',
            }}
          >
            {ctaLabel} {ctaIcon}
          </motion.div>
        </a>
      </div>
    </motion.div>
  );
}

// ─── Results screen ────────────────────────────────────────────────────────────

function ResultsScreen({
  results,
  onRestart,
  weekend,
  onWeekendChange,
  loading,
  weekendLabel: wkndLabel,
  limitedMatches,
  answers,
}: {
  results: ScoredEvent[];
  onRestart: () => void;
  weekend: 'this' | 'next';
  onWeekendChange: (w: 'this' | 'next') => void;
  loading: boolean;
  weekendLabel: string;
  limitedMatches: boolean;
  answers: Partial<Answers>;
}) {
  return (
    <motion.div
      key="results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      // max-w-7xl matches NavHeader — they are now the same width
      className="min-h-screen px-4 md:px-6 pt-24 pb-12 max-w-7xl mx-auto"
    >
      {/* Results header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="px-3 py-1.5 border-[3px] border-black text-xs font-black uppercase tracking-wider"
            style={{ backgroundColor: '#C5F82A', boxShadow: '3px 3px 0 #0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}
          >
            3 plans ready ✓
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-base font-bold"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#4B4B4B' }}
          >
            Pick the one that feels right.
          </motion.p>
        </div>

        {/* Weekend toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="inline-flex border-[3px] border-black overflow-hidden flex-shrink-0"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          {(['this', 'next'] as const).map(w => (
            <button
              key={w}
              onClick={() => onWeekendChange(w)}
              disabled={loading}
              className="px-4 py-2.5 transition-colors disabled:opacity-50"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                backgroundColor: weekend === w ? '#0A0A0A' : 'white',
                color: weekend === w ? '#C5F82A' : '#1A1A1A',
                borderRight: w === 'this' ? '3px solid #0A0A0A' : 'none',
              }}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide leading-tight">
                {w === 'this' ? 'This weekend' : 'Next weekend'}
              </span>
              <span
                className="block text-[9px] font-medium normal-case tracking-normal mt-0.5 leading-none"
                style={{ color: weekend === w ? 'rgba(197,247,42,0.75)' : '#6B6B6B' }}
              >
                {getWeekendLabel(w)}
              </span>
            </button>
          ))}
        </motion.div>
      </div>

      {/* Limited matches notice */}
      {limitedMatches && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 px-4 py-2.5 border-[2px] border-black text-xs font-medium"
          style={{ backgroundColor: '#FFE93D', fontFamily: '"Bricolage Grotesque", sans-serif' }}
        >
          We found limited exact matches for this weekend, so we included a few nearby options too.
        </motion.div>
      )}

      {/* Cards */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#FFF8E7]/80 backdrop-blur-sm rounded">
            <div className="text-center">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="text-5xl mb-3"
              >
                🌀
              </motion.div>
              <p className="font-black text-lg" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                Updating plans...
              </p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {results.map((event, idx) => (
            <ResultCard
              key={event.id}
              event={event}
              rank={idx}
              delay={loading ? 0 : 0.3 + idx * 0.1}
              answers={answers}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <BrutalButton onClick={onRestart} color="white">
          <RotateCcw size={16} strokeWidth={3} /> Start over
        </BrutalButton>
        <div className="mt-6 flex flex-col items-center gap-1.5">
          <p
            className="text-xs font-bold uppercase tracking-wider"
            style={{ fontFamily: '"JetBrains Mono", monospace', color: '#9B9B9B' }}
          >
            where2.ai · Bengaluru · 2026
          </p>
          <CreatorCredit />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main app ──────────────────────────────────────────────────────────────────

type Step = 'intro' | 'quiz' | 'hardno' | 'loading' | 'results';

export default function WeekendPlanner() {
  const [step,           setStep]           = useState<Step>('intro');
  const [questionIndex,  setQuestionIndex]  = useState(0);
  const [answers,        setAnswers]        = useState<Partial<Answers>>({});
  const [hardNos,        setHardNos]        = useState<Trigger[]>([]);
  const [results,        setResults]        = useState<ScoredEvent[]>([]);
  const [weekend,        setWeekend]        = useState<'this' | 'next'>('this');
  const [weekendLoading, setWeekendLoading] = useState(false);
  const [weekendLbl,     setWeekendLbl]     = useState('');
  const [limitedMatches, setLimitedMatches] = useState(false);

  const lastAnswers = React.useRef<Partial<Answers>>({});
  const lastHardNos = React.useRef<Trigger[]>([]);

  const handleAnswer = (id: string, value: string) => {
    const updated = { ...answers, [id]: value };
    setAnswers(updated);
    setTimeout(() => {
      if (questionIndex < QUESTIONS.length - 1) setQuestionIndex(q => q + 1);
      else setStep('hardno');
    }, 240);
  };

  const handleBack = () => {
    if (step === 'hardno') { setStep('quiz'); return; }
    if (questionIndex > 0) setQuestionIndex(q => q - 1);
    else setStep('intro');
  };

  const toggleHardNo = (value: Trigger) =>
    setHardNos(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value],
    );

  const fetchPlans = async (
    ans: Partial<Answers>,
    nos: Trigger[],
    wknd: 'this' | 'next',
  ) => {
    // Always sanitize — strip values not in the allow-list before sending
    const safeAns = sanitizeAnswers(ans);
    const safeNos = sanitizeTriggers(nos as string[]);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: safeAns, hardNos: safeNos, weekend: wknd }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setWeekendLbl(data.weekendLabel ?? '');
      setLimitedMatches(data.limitedMatches ?? false);
      return data.results as ScoredEvent[];
    } catch {
      // Graceful local fallback — user always gets results
      const { scoreEvents, generateLocalWhy, getWeekendDateRange, enforceDiversity } =
        await import('@/lib/scorer');
      const { transformEvents } = await import('@/lib/transformer');
      const rawData = await import('@/data/events.json');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const events   = transformEvents((rawData as any).events ?? rawData);
      const dates    = getWeekendDateRange(wknd);
      const fallback = enforceDiversity(
        scoreEvents(events, safeAns as Answers, [], 10, dates),
      )
        .slice(0, 3)
        .map(e => ({ ...e, why: generateLocalWhy(e, safeAns as Answers) }));
      return fallback;
    }
  };

  const submitQuiz = async () => {
    setStep('loading');
    lastAnswers.current = answers;
    lastHardNos.current = hardNos;
    const res = await fetchPlans(answers, hardNos, weekend);
    setResults(res);
    setStep('results');
  };

  const handleWeekendChange = async (w: 'this' | 'next') => {
    setWeekend(w);
    setWeekendLoading(true);
    const res = await fetchPlans(lastAnswers.current, lastHardNos.current, w);
    setResults(res);
    setWeekendLoading(false);
  };

  const restart = () => {
    setStep('intro');
    setQuestionIndex(0);
    setAnswers({});
    setHardNos([]);
    setResults([]);
    setWeekend('this');
    setWeekendLbl('');
    setLimitedMatches(false);
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: '#FFF8E7',
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.07) 1px, transparent 0)`,
        backgroundSize: '24px 24px',
        fontFamily: '"Bricolage Grotesque", sans-serif',
        color: '#0A0A0A',
      }}
    >
      {step !== 'intro' && <NavHeader onRestart={restart} />}
      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <IntroScreen onStart={() => { setStep('quiz'); setQuestionIndex(0); }} />
        )}
        {step === 'quiz' && (
          <QuizScreen
            questionIndex={questionIndex}
            answers={answers}
            onAnswer={handleAnswer}
            onBack={handleBack}
            totalQuestions={QUESTIONS.length}
            onSkipToPlans={() => setStep('hardno')}
          />
        )}
        {step === 'hardno' && (
          <HardNoScreen
            hardNos={hardNos}
            onToggle={toggleHardNo}
            onSubmit={submitQuiz}
            onBack={handleBack}
          />
        )}
        {step === 'loading' && <LoadingScreen />}
        {step === 'results' && (
          <ResultsScreen
            results={results}
            onRestart={restart}
            weekend={weekend}
            onWeekendChange={handleWeekendChange}
            loading={weekendLoading}
            weekendLabel={weekendLbl}
            limitedMatches={limitedMatches}
            answers={answers}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
