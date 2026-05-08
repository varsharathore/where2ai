'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, MapPin, Wallet, RotateCcw,
  ExternalLink, Check, Search, Calendar,
} from 'lucide-react';
import type { Answers, ScoredEvent, Trigger } from '@/lib/types';

// ─── Quiz data ─────────────────────────────────────────────────────────────────
// Progressive disclosure: 3 groups shown in phases
// Phase 1 (required): who, vibe, budget  → "Core 3"
// Phase 2 (fine-tune): effort, feeling   → "2 more to fine-tune"
// Phase 3 (optional): risk               → "Last one, promise"
// Phase 4: hard nos                      → separate screen

const QUESTIONS = [
  {
    id: 'who', phase: 1,
    step: '01 / 06',
    text: "Who's joining the plan?",
    subtext: "Tell us the company, and we'll match the mood.",
    options: [
      { value: 'solo',       label: 'Just me',         emoji: '🧑' },
      { value: 'partner',    label: 'Date / partner',   emoji: '💕' },
      { value: 'friends',    label: 'Friends',          emoji: '🫂' },
      { value: 'family',     label: 'Family',           emoji: '👨‍👩‍👧' },
      { value: 'new_people', label: 'Meet new people',  emoji: '🤝' },
    ],
  },
  {
    id: 'vibe', phase: 1,
    step: '02 / 06',
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
    id: 'budget', phase: 1,
    step: '03 / 06',
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
    id: 'effort', phase: 2,
    step: '04 / 06',
    text: 'How much effort are we putting in?',
    subtext: 'Nearby, across town, or a proper day out?',
    phaseBanner: '2 more to fine-tune your plans.',
    options: [
      { value: 'easy', label: 'Keep it easy',    emoji: '🛋️', sub: 'Close to home' },
      { value: 'city', label: 'Across the city', emoji: '🚗', sub: 'Happy to travel' },
      { value: 'trip', label: 'Short trip',      emoji: '🚙', sub: 'Day out, no problem' },
    ],
  },
  {
    id: 'feeling', phase: 2,
    step: '05 / 06',
    text: 'What mood are we planning around?',
    subtext: 'Your weekend should match your energy.',
    options: [
      { value: 'low_battery', label: 'Low battery', emoji: '🪫' },
      { value: 'relaxed',     label: 'Relaxed',      emoji: '😌' },
      { value: 'buzzing',     label: 'Buzzing',       emoji: '⚡' },
      { value: 'cozy',        label: 'Soft & cozy',  emoji: '🕯️' },
      { value: 'curious',     label: 'Curious',      emoji: '🔮' },
      { value: 'social',      label: 'Social',       emoji: '💬' },
    ],
  },
  {
    id: 'risk', phase: 3,
    step: '06 / 06',
    text: 'How adventurous should the plan be?',
    subtext: 'Safe bet, or something you have never tried?',
    phaseBanner: "Last one, promise.",
    options: [
      { value: 'safe',       label: 'Safe bet',    emoji: '🤲', sub: 'Tried & trusted' },
      { value: 'mix',        label: 'Mix it up',   emoji: '🎲', sub: 'Old and new' },
      { value: 'hidden_gem', label: 'Hidden gem',  emoji: '💎', sub: 'Under the radar' },
      { value: 'surprise',   label: 'Surprise me', emoji: '🌪️', sub: 'Full discovery mode' },
    ],
  },
];

const HARD_NOS = [
  { value: 'crowds',          label: 'Crowds',          emoji: '🚫' },
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
const PHASE_AFTER_CORE = 3; // question index after which to show "skip" option

// ─── Shared helpers ────────────────────────────────────────────────────────────

function getWeekendLabel(which: 'this' | 'next'): string {
  const today = new Date();
  const day = today.getDay();
  const daysUntilFri = day === 5 ? 0 : day === 6 ? 6 : (5 - day + 7) % 7;
  const fri = new Date(today);
  fri.setDate(today.getDate() + daysUntilFri + (which === 'next' ? 7 : 0));
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(fri)} – ${fmt(sun)}`;
}

const CreatorCredit = () => (
  <p className="text-xs opacity-40" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
    Made by{' '}
    <a href="https://linkedin.com/in/varshasinghrathore" target="_blank" rel="noopener noreferrer"
      className="underline hover:opacity-70 transition-opacity">Varsha Rathore</a>
    {' · '}
    <a href="https://instagram.com/roamwithrains" target="_blank" rel="noopener noreferrer"
      className="underline hover:opacity-70 transition-opacity">📷 roamwithrains</a>
  </p>
);

const Logo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sz = { sm: 'text-xl', md: 'text-2xl', lg: 'text-5xl' }[size];
  return (
    <div className={`inline-flex items-baseline gap-0 font-black tracking-tighter select-none ${sz}`}
      style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}>
      <span>where</span>
      <span style={{ backgroundColor: '#C5F82A', color: '#0A0A0A', padding: '1px 4px', border: '2.5px solid #0A0A0A', lineHeight: 1.1, display: 'inline-block', transform: 'translateY(-1px)' }}>2</span>
      <span style={{ color: '#FF2E93' }}>.ai</span>
    </div>
  );
};

const BrutalButton = ({
  children, onClick, color = '#C5F82A', textColor = '#0A0A0A', className = '',
}: {
  children: React.ReactNode; onClick?: () => void;
  color?: string; textColor?: string; className?: string;
}) => (
  <motion.button onClick={onClick}
    whileHover={{ x: -3, y: -3 }} whileTap={{ x: 0, y: 0 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    className={`relative inline-flex items-center justify-center gap-2 px-6 py-3 font-bold uppercase tracking-tight border-[3px] border-black ${className}`}
    style={{ backgroundColor: color, color: textColor, boxShadow: '6px 6px 0 #0A0A0A', fontFamily: '"Bricolage Grotesque", sans-serif' }}>
    {children}
  </motion.button>
);

const NavHeader = () => (
  <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b-[3px] border-black"
    style={{ backgroundColor: '#FFF8E7', backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
    <Logo size="md" />
    <div className="text-[10px] font-bold uppercase tracking-widest opacity-40" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Bengaluru · May 2026</div>
  </div>
);

// ─── Screens ──────────────────────────────────────────────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-32 h-32 rounded-full opacity-55 blur-2xl" style={{ backgroundColor: '#FF2E93' }} />
      <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full opacity-45 blur-3xl" style={{ backgroundColor: '#C5F82A' }} />
      <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full opacity-35 blur-2xl" style={{ backgroundColor: '#2EC4FF' }} />

      <div className="relative max-w-3xl w-full text-center flex-1 flex flex-col items-center justify-center">
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
          className="flex justify-center mb-6"><Logo size="lg" /></motion.div>

        {/* Differentiation proof point — above the fold */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 border-[3px] border-black"
          style={{ backgroundColor: '#FFE93D', boxShadow: '4px 4px 0 #0A0A0A', fontFamily: '"Bricolage Grotesque", sans-serif' }}>
          <span className="text-sm font-black">We filter 196 Bengaluru events → 3 plans that fit your weekend.</span>
        </motion.div>

        <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25, duration: 0.55 }}
          className="text-7xl md:text-9xl font-black leading-[0.9] mb-5 tracking-tighter"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}>
          your weekend.
          <br />
          <span style={{ backgroundColor: '#FFE93D', padding: '0 0.2em', display: 'inline-block', transform: 'rotate(-1deg)', boxShadow: '6px 6px 0 #0A0A0A', border: '3px solid #0A0A0A' }}>
            sorted.
          </span>
        </motion.h1>

        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl mb-8 max-w-xl mx-auto font-medium leading-snug"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}>
          Stop scrolling through 100 events.
          <br />
          <span className="opacity-50">Answer 6 quick questions. Get 3 plans that actually fit you.</span>
        </motion.p>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55 }}>
          <BrutalButton onClick={onStart} color="#C5F82A" className="text-2xl px-12 py-5">
            Find My Plans <ArrowRight size={24} strokeWidth={3} />
          </BrutalButton>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
          className="mt-10 flex items-center justify-center gap-4 md:gap-6 text-sm flex-wrap"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          <span className="font-bold">6 questions</span>
          <span className="opacity-30">·</span>
          <span className="font-bold">2 minutes</span>
          <span className="opacity-30">·</span>
          <span className="font-bold">196 handpicked events</span>
        </motion.div>
      </div>

      {/* Creator credit on home screen */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
        className="relative mt-8 text-center">
        <CreatorCredit />
      </motion.div>
    </motion.div>
  );
}

function QuizScreen({
  questionIndex, answers, onAnswer, onBack, totalQuestions, onSkipToPlans,
}: {
  questionIndex: number; answers: Partial<Answers>;
  onAnswer: (id: string, value: string) => void;
  onBack: () => void; totalQuestions: number;
  onSkipToPlans: () => void;
}) {
  const question = QUESTIONS[questionIndex];
  const accent   = Q_ACCENTS[questionIndex % Q_ACCENTS.length];
  const progress = ((questionIndex + 1) / (totalQuestions + 1)) * 100;
  const n        = question.options.length;
  const gridCols = n === 3 ? 'grid-cols-1 md:grid-cols-3' : n > 4 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2';
  const showSkip = questionIndex >= PHASE_AFTER_CORE;

  return (
    <motion.div key={`q-${questionIndex}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28 }}
      className="min-h-screen flex flex-col px-6 pt-24 pb-12 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} disabled={questionIndex === 0}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider disabled:opacity-25 hover:opacity-65 transition-opacity"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <span className="text-sm font-bold opacity-50" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            {question.step}
          </span>
        </div>
        <div className="h-3 w-full border-[3px] border-black bg-white overflow-hidden" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }} className="h-full" style={{ backgroundColor: accent }} />
        </div>

        {/* Phase banner — appears at start of phase 2 and 3 */}
        {'phaseBanner' in question && question.phaseBanner && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 inline-block px-3 py-1 border-[2px] border-black text-xs font-bold"
            style={{ backgroundColor: accent, fontFamily: '"JetBrains Mono", monospace' }}>
            {question.phaseBanner}
          </motion.div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-8">
          <h2 className="text-4xl md:text-6xl font-black leading-[1.05] mb-3 tracking-tighter"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}>{question.text}</h2>
          <p className="text-lg md:text-xl font-medium opacity-50" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            {question.subtext}
          </p>
        </motion.div>

        <div className={`grid gap-4 ${gridCols}`}>
          {question.options.map((option, idx) => {
            const selected = (answers as Record<string, string>)[question.id] === option.value;
            return (
              <motion.button key={option.value}
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.13 + idx * 0.045 }}
                whileHover={{ x: -3, y: -3 }} whileTap={{ x: 0, y: 0, scale: 0.98 }}
                onClick={() => onAnswer(question.id, option.value)}
                className="relative bg-white border-[3px] border-black p-5 md:p-6 text-left"
                style={{ boxShadow: `6px 6px 0 ${selected ? accent : '#0A0A0A'}`, backgroundColor: selected ? accent : 'white' }}>
                <div className="text-4xl md:text-5xl mb-3">{option.emoji}</div>
                <div className="text-base md:text-lg font-bold"
                  style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}>{option.label}</div>
                {'sub' in option && option.sub && (
                  <div className="text-xs opacity-50 mt-1 font-medium" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {option.sub}
                  </div>
                )}
                {selected && (
                  <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
                    className="absolute top-3 right-3 w-7 h-7 bg-black rounded-full flex items-center justify-center">
                    <Check size={16} color="white" strokeWidth={4} />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Skip to plans — appears after core 3 questions */}
        {showSkip && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="mt-6 text-center">
            <button onClick={onSkipToPlans}
              className="text-sm font-bold uppercase tracking-wider underline opacity-40 hover:opacity-80 transition-opacity"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Skip and show my plans →
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function HardNoScreen({
  hardNos, onToggle, onSubmit, onBack,
}: {
  hardNos: Trigger[]; onToggle: (v: Trigger) => void;
  onSubmit: () => void; onBack: () => void;
}) {
  return (
    <motion.div key="hardno" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28 }}
      className="min-h-screen flex flex-col px-6 pt-24 pb-12 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:opacity-65 transition-opacity"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <span className="text-sm font-bold opacity-50" style={{ fontFamily: '"JetBrains Mono", monospace' }}>07 / 07</span>
        </div>
        <div className="h-3 w-full border-[3px] border-black bg-white overflow-hidden" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
          <motion.div initial={{ width: '85%' }} animate={{ width: '100%' }} transition={{ duration: 0.4 }}
            className="h-full" style={{ backgroundColor: '#FF2E93' }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-8">
          <div className="inline-block mb-3 px-3 py-1 border-[3px] border-black text-xs font-bold uppercase tracking-wider"
            style={{ backgroundColor: '#FF2E93', color: '#FFF8E7', fontFamily: '"JetBrains Mono", monospace', boxShadow: '4px 4px 0 #0A0A0A' }}>
            Optional
          </div>
          <h2 className="text-4xl md:text-6xl font-black leading-[1.05] mb-3 tracking-tighter"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}>
            Anything you would rather avoid?
          </h2>
          <p className="text-lg md:text-xl font-medium opacity-50" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Optional, but it helps us plan better.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {HARD_NOS.map((no, idx) => {
            const selected = hardNos.includes(no.value as Trigger);
            return (
              <motion.button key={no.value}
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.12 + idx * 0.04 }}
                whileHover={{ x: -3, y: -3 }} whileTap={{ scale: 0.98 }}
                onClick={() => onToggle(no.value as Trigger)}
                className="relative border-[3px] border-black p-4 text-left"
                style={{ backgroundColor: selected ? '#FF2E93' : 'white', color: selected ? '#FFF8E7' : '#0A0A0A', boxShadow: '5px 5px 0 #0A0A0A' }}>
                <div className="text-3xl mb-2">{no.emoji}</div>
                <div className="text-sm font-bold leading-tight" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>{no.label}</div>
                {selected && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute top-2.5 right-2.5 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <Check size={12} color="#FF2E93" strokeWidth={4} />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <button onClick={onSubmit}
            className="text-sm font-bold uppercase tracking-wider underline opacity-50 hover:opacity-90 transition-opacity"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}>
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
    const t = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MESSAGES.length), 700);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        className="text-7xl mb-8">🌀</motion.div>
      <AnimatePresence mode="wait">
        <motion.div key={msgIdx} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.28 }}
          className="text-2xl md:text-4xl font-black tracking-tight text-center"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}>
          {LOADING_MESSAGES[msgIdx]}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

const CARD_ROTATIONS = ['-1.2deg', '0.6deg', '-0.6deg'];
const RANK_LABELS    = ['Top pick', '2nd pick', '3rd pick'];

function ResultCard({ event, rank, delay }: { event: ScoredEvent; rank: number; delay: number }) {
  // Determine CTA label based on whether link is direct
  const ctaLabel  = event.is_direct_link ? event.cta : 'Search on platform';
  const ctaIcon   = event.is_direct_link ? <ExternalLink size={14} strokeWidth={3} /> : <Search size={14} strokeWidth={3} />;

  return (
    <motion.div
      initial={{ y: 50, opacity: 0, rotate: 0 }}
      animate={{ y: 0, opacity: 1, rotate: CARD_ROTATIONS[rank] }}
      transition={{ delay, type: 'spring', stiffness: 100, damping: 15 }}
      whileHover={{ rotate: '0deg', y: -6, scale: 1.01 }}
      className="relative border-[4px] border-black overflow-hidden"
      style={{ backgroundColor: event.color, boxShadow: '8px 8px 0 #0A0A0A', color: event.textColor }}>

      {/* Rank */}
      <div className="absolute top-3 left-3 z-10 px-2.5 py-1 border-[3px] border-black bg-white text-xs font-bold uppercase tracking-wider"
        style={{ color: '#0A0A0A', fontFamily: '"JetBrains Mono", monospace', boxShadow: '3px 3px 0 #0A0A0A' }}>
        {RANK_LABELS[rank]}
      </div>

      {/* Match % */}
      <div className="absolute top-3 right-3 z-10">
        <div className="px-3 py-1.5 border-[3px] border-black backdrop-blur-md flex items-center gap-1.5"
          style={{ backgroundColor: 'rgba(255,255,255,0.38)', boxShadow: '3px 3px 0 #0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}>
          <div className="text-xl font-black" style={{ color: '#0A0A0A' }}>{event.percentage}%</div>
          <div className="text-[9px] uppercase font-bold leading-tight" style={{ color: '#0A0A0A' }}>match</div>
        </div>
      </div>

      <div className="p-6 pt-16">
        <div className="text-5xl mb-3">{event.emoji}</div>
        <h3 className="text-2xl md:text-3xl font-black leading-tight mb-3 tracking-tight uppercase"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>{event.name}</h3>

        {/* Meta row */}
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border-[2px] border-black text-xs font-bold"
            style={{ color: '#0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}>
            <MapPin size={10} strokeWidth={3} /> {event.location}
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border-[2px] border-black text-xs font-bold"
            style={{ color: '#0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}>
            <Wallet size={10} strokeWidth={3} /> {event.cost}
          </div>
          {event.date && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border-[2px] border-black text-xs font-bold"
              style={{ color: '#0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}>
              <Calendar size={10} strokeWidth={3} />
              {new Date(event.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}
            </div>
          )}
        </div>

        {/* Why this plan — compact, specific */}
        <div className="p-3 mb-4 border-[2px] border-black" style={{ backgroundColor: 'rgba(255,255,255,0.32)' }}>
          <div className="text-[9px] uppercase font-black tracking-wider mb-1 opacity-65"
            style={{ color: '#0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}>
            Why we picked this ↓
          </div>
          <p className="text-sm font-medium leading-snug"
            style={{ color: '#0A0A0A', fontFamily: '"Bricolage Grotesque", sans-serif' }}>{event.why}</p>
        </div>

        {/* CTA — labelled honestly based on link type */}
        <a href={event.source_url} target="_blank" rel="noopener noreferrer">
          <motion.div whileHover={{ x: -2, y: -2 }} whileTap={{ x: 0, y: 0 }}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-black border-[3px] border-black text-xs font-black uppercase tracking-wider cursor-pointer"
            style={{ color: event.color, boxShadow: '4px 4px 0 rgba(0,0,0,0.18)', fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            {ctaLabel} {ctaIcon}
          </motion.div>
        </a>

        {/* If not direct, show what platform it opens */}
        {!event.is_direct_link && (
          <p className="mt-1.5 text-center text-[9px] opacity-50 font-bold"
            style={{ fontFamily: '"JetBrains Mono", monospace', color: '#0A0A0A' }}>
            Opens {event.booking_link_raw || 'search results'}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function ResultsScreen({
  results, onRestart, weekend, onWeekendChange, loading, weekendLabel: wkndLabel, limitedMatches,
}: {
  results: ScoredEvent[]; onRestart: () => void;
  weekend: 'this' | 'next'; onWeekendChange: (w: 'this' | 'next') => void;
  loading: boolean; weekendLabel: string; limitedMatches: boolean;
}) {
  return (
    <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen px-4 md:px-6 pt-20 pb-12 max-w-7xl mx-auto">

      {/* Compact results header — keeps cards visible above fold */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="px-3 py-1.5 border-[3px] border-black text-xs font-black uppercase tracking-wider"
            style={{ backgroundColor: '#C5F82A', boxShadow: '3px 3px 0 #0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}>
            3 plans ready ✓
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-base font-bold opacity-50" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Pick the one that feels right.
          </motion.p>
        </div>

        {/* Weekend toggle — inline with header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="inline-flex border-[3px] border-black overflow-hidden flex-shrink-0"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
          {(['this', 'next'] as const).map(w => (
            <button key={w} onClick={() => onWeekendChange(w)} disabled={loading}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                backgroundColor: weekend === w ? '#0A0A0A' : 'white',
                color: weekend === w ? '#C5F82A' : '#0A0A0A',
                borderRight: w === 'this' ? '3px solid #0A0A0A' : 'none',
              }}>
              {w === 'this' ? 'This weekend' : 'Next weekend'}
              <span className="block text-[8px] opacity-60 normal-case tracking-normal font-bold mt-0.5">
                {getWeekendLabel(w)}
              </span>
            </button>
          ))}
        </motion.div>
      </div>

      {/* Limited matches notice */}
      {limitedMatches && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-4 px-4 py-2.5 border-[2px] border-black text-xs font-medium"
          style={{ backgroundColor: '#FFE93D', fontFamily: '"Bricolage Grotesque", sans-serif' }}>
          We found limited exact matches for this weekend, so we included a few nearby options too.
        </motion.div>
      )}

      {/* Cards — immediately visible, no long scroll */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#FFF8E7]/80 backdrop-blur-sm rounded">
            <div className="text-center">
              <motion.div animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="text-5xl mb-3">🌀</motion.div>
              <p className="font-black text-lg" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                Updating plans...
              </p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {results.map((event, idx) => (
            <ResultCard key={event.id} event={event} rank={idx} delay={loading ? 0 : 0.3 + idx * 0.1} />
          ))}
        </div>
      </div>

      {/* Footer — compact */}
      <div className="text-center">
        <BrutalButton onClick={onRestart} color="white">
          <RotateCcw size={16} strokeWidth={3} /> Start over
        </BrutalButton>
        <div className="mt-6 flex flex-col items-center gap-1.5">
          <p className="text-xs opacity-30 font-bold uppercase tracking-wider"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            where2.ai · Bengaluru · 2026
          </p>
          <CreatorCredit />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

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
    setHardNos(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

  const fetchPlans = async (ans: Partial<Answers>, nos: Trigger[], wknd: 'this' | 'next') => {
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: ans, hardNos: nos, weekend: wknd }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setWeekendLbl(data.weekendLabel ?? '');
      setLimitedMatches(data.limitedMatches ?? false);
      return data.results as ScoredEvent[];
    } catch {
      const { scoreEvents, generateLocalWhy, getWeekendDateRange, enforceDiversity } = await import('@/lib/scorer');
      const { transformEvents } = await import('@/lib/transformer');
      const rawData = await import('@/data/events.json');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const events = transformEvents((rawData as any).events ?? rawData);
      const dates = getWeekendDateRange(wknd);
      const fallback = enforceDiversity(scoreEvents(events, ans as Answers, [], 10, dates))
        .slice(0, 3)
        .map(e => ({ ...e, why: generateLocalWhy(e, ans as Answers) }));
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
    setStep('intro'); setQuestionIndex(0); setAnswers({});
    setHardNos([]); setResults([]); setWeekend('this');
    setWeekendLbl(''); setLimitedMatches(false);
  };

  return (
    <div className="min-h-screen w-full"
      style={{
        backgroundColor: '#FFF8E7',
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.07) 1px, transparent 0)`,
        backgroundSize: '24px 24px',
        fontFamily: '"Bricolage Grotesque", sans-serif',
        color: '#0A0A0A',
      }}>
      {step !== 'intro' && <NavHeader />}
      <AnimatePresence mode="wait">
        {step === 'intro'   && <IntroScreen onStart={() => { setStep('quiz'); setQuestionIndex(0); }} />}
        {step === 'quiz'    && (
          <QuizScreen
            questionIndex={questionIndex} answers={answers}
            onAnswer={handleAnswer} onBack={handleBack}
            totalQuestions={QUESTIONS.length}
            onSkipToPlans={() => setStep('hardno')}
          />
        )}
        {step === 'hardno'  && <HardNoScreen hardNos={hardNos} onToggle={toggleHardNo} onSubmit={submitQuiz} onBack={handleBack} />}
        {step === 'loading' && <LoadingScreen />}
        {step === 'results' && (
          <ResultsScreen
            results={results} onRestart={restart}
            weekend={weekend} onWeekendChange={handleWeekendChange}
            loading={weekendLoading} weekendLabel={weekendLbl}
            limitedMatches={limitedMatches}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
