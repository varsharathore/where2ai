'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, MapPin, Wallet, RotateCcw, ExternalLink, Check } from 'lucide-react';
import type { Answers, ScoredEvent, Trigger } from '@/lib/types';

// ─── Quiz data ─────────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 'who',
    step: '01 / 07',
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
    id: 'vibe',
    step: '02 / 07',
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
    id: 'effort',
    step: '03 / 07',
    text: 'How much effort are we putting in?',
    subtext: 'Nearby, across town, or a proper day out?',
    options: [
      { value: 'easy', label: 'Keep it easy',    emoji: '🛋️', sub: 'Close to home' },
      { value: 'city', label: 'Across the city', emoji: '🚗', sub: 'Happy to travel' },
      { value: 'trip', label: 'Short trip',      emoji: '🚙', sub: 'Day out, no problem' },
    ],
  },
  {
    id: 'feeling',
    step: '04 / 07',
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
    id: 'budget',
    step: '05 / 07',
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
    id: 'risk',
    step: '06 / 07',
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

// ─── Sub-components ────────────────────────────────────────────────────────────

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
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  textColor?: string;
  className?: string;
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
      className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-32 h-32 rounded-full opacity-55 blur-2xl" style={{ backgroundColor: '#FF2E93' }} />
      <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full opacity-45 blur-3xl" style={{ backgroundColor: '#C5F82A' }} />
      <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full opacity-35 blur-2xl" style={{ backgroundColor: '#2EC4FF' }} />

      <div className="relative max-w-3xl w-full text-center">
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
          className="flex justify-center mb-8"><Logo size="lg" /></motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
          className="inline-flex items-center gap-2 px-4 py-2 mb-8 border-[3px] border-black bg-white"
          style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}>
          <MapPin size={12} strokeWidth={3} />
          <span className="text-xs font-bold uppercase tracking-wider">Bengaluru · May 2026</span>
        </motion.div>

        <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25, duration: 0.55 }}
          className="text-7xl md:text-9xl font-black leading-[0.9] mb-6 tracking-tighter"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}>
          your weekend.
          <br />
          <span style={{ backgroundColor: '#FFE93D', padding: '0 0.2em', display: 'inline-block', transform: 'rotate(-1deg)', boxShadow: '6px 6px 0 #0A0A0A', border: '3px solid #0A0A0A' }}>
            sorted.
          </span>
        </motion.h1>

        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl mb-10 max-w-xl mx-auto font-medium leading-snug"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}>
          Answer seven quick questions.<br />Get three plans curated just for you.<br />
          <span className="opacity-50">No endless scrolling required.</span>
        </motion.p>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55 }}>
          <BrutalButton onClick={onStart} color="#C5F82A" className="text-2xl px-12 py-5">
            Find My Plans <ArrowRight size={24} strokeWidth={3} />
          </BrutalButton>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
          className="mt-12 flex items-center justify-center gap-4 md:gap-6 text-sm flex-wrap"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          <span className="font-bold">7 questions</span>
          <span className="opacity-30">·</span>
          <span className="font-bold">2 minutes</span>
          <span className="opacity-30">·</span>
          <span className="font-bold">196 handpicked events</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

function QuizScreen({
  questionIndex, answers, onAnswer, onBack, totalQuestions,
}: {
  questionIndex: number;
  answers: Partial<Answers>;
  onAnswer: (id: string, value: string) => void;
  onBack: () => void;
  totalQuestions: number;
}) {
  const question = QUESTIONS[questionIndex];
  const accent   = Q_ACCENTS[questionIndex % Q_ACCENTS.length];
  const progress = ((questionIndex + 1) / (totalQuestions + 1)) * 100;
  const n        = question.options.length;
  const gridCols = n === 3 ? 'grid-cols-1 md:grid-cols-3' : n > 4 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2';

  return (
    <motion.div key={`q-${questionIndex}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28 }}
      className="min-h-screen flex flex-col px-6 pt-24 pb-12 max-w-3xl mx-auto w-full">
      <div className="mb-8">
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
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-10">
          <h2 className="text-4xl md:text-6xl font-black leading-[1.05] mb-4 tracking-tighter"
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
      </div>
    </motion.div>
  );
}

function HardNoScreen({
  hardNos, onToggle, onSubmit, onBack,
}: {
  hardNos: Trigger[];
  onToggle: (v: Trigger) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div key="hardno" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28 }}
      className="min-h-screen flex flex-col px-6 pt-24 pb-12 max-w-3xl mx-auto w-full">
      <div className="mb-8">
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
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-10">
          <div className="inline-block mb-4 px-3 py-1 border-[3px] border-black text-xs font-bold uppercase tracking-wider"
            style={{ backgroundColor: '#FF2E93', color: '#FFF8E7', fontFamily: '"JetBrains Mono", monospace', boxShadow: '4px 4px 0 #0A0A0A' }}>
            Optional
          </div>
          <h2 className="text-4xl md:text-6xl font-black leading-[1.05] mb-4 tracking-tighter"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}>
            Anything you would rather avoid?
          </h2>
          <p className="text-lg md:text-xl font-medium opacity-50" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Optional, but it helps us plan better. Select all that apply.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
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
  return (
    <motion.div
      initial={{ y: 50, opacity: 0, rotate: 0 }}
      animate={{ y: 0, opacity: 1, rotate: CARD_ROTATIONS[rank] }}
      transition={{ delay, type: 'spring', stiffness: 100, damping: 15 }}
      whileHover={{ rotate: '0deg', y: -8, scale: 1.02 }}
      className="relative border-[4px] border-black overflow-hidden"
      style={{ backgroundColor: event.color, boxShadow: '10px 10px 0 #0A0A0A', color: event.textColor }}>
      <div className="absolute top-4 left-4 z-10 px-3 py-1 border-[3px] border-black bg-white text-xs font-bold uppercase tracking-wider"
        style={{ color: '#0A0A0A', fontFamily: '"JetBrains Mono", monospace', boxShadow: '3px 3px 0 #0A0A0A' }}>
        {RANK_LABELS[rank]}
      </div>
      <div className="absolute top-4 right-4 z-10">
        <div className="px-4 py-2 border-[3px] border-black backdrop-blur-md flex items-center gap-2"
          style={{ backgroundColor: 'rgba(255,255,255,0.38)', boxShadow: '3px 3px 0 #0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}>
          <div className="text-2xl font-black" style={{ color: '#0A0A0A' }}>{event.percentage}%</div>
          <div className="text-[10px] uppercase font-bold leading-tight" style={{ color: '#0A0A0A' }}>match<br />score</div>
        </div>
      </div>

      <div className="p-8 pt-20">
        <div className="text-7xl mb-4">{event.emoji}</div>
        <h3 className="text-3xl md:text-4xl font-black leading-[0.95] mb-5 tracking-tight uppercase"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>{event.name}</h3>

        <div className="flex flex-wrap gap-2 mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-[2px] border-black text-xs font-bold"
            style={{ color: '#0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}>
            <MapPin size={11} strokeWidth={3} /> {event.location}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-[2px] border-black text-xs font-bold"
            style={{ color: '#0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}>
            <Wallet size={11} strokeWidth={3} /> {event.cost}
          </div>
        </div>

        <div className="p-4 mb-6 border-[2px] border-black backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.32)' }}>
          <div className="text-[10px] uppercase font-black tracking-wider mb-1.5 opacity-65"
            style={{ color: '#0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}>
            Why we picked this ↓
          </div>
          <p className="text-base font-medium leading-snug"
            style={{ color: '#0A0A0A', fontFamily: '"Bricolage Grotesque", sans-serif' }}>{event.why}</p>
        </div>

        <a href={event.cta_url !== '#' ? event.cta_url : undefined}
          target="_blank" rel="noopener noreferrer">
          <motion.div whileHover={{ x: -2, y: -2 }} whileTap={{ x: 0, y: 0 }}
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-black border-[3px] border-black text-sm font-black uppercase tracking-wider cursor-pointer"
            style={{ color: event.color, boxShadow: '4px 4px 0 rgba(0,0,0,0.18)', fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            {event.cta} <ExternalLink size={16} strokeWidth={3} />
          </motion.div>
        </a>
      </div>
    </motion.div>
  );
}

// ─── Weekend date helpers (client side) ───────────────────────────────────────

function getWeekendLabel(which: 'this' | 'next'): string {
  const today = new Date();
  const day = today.getDay();
  const daysUntilFri = day === 5 ? 0 : day === 6 ? 6 : (5 - day + 7) % 7;
  const fri = new Date(today);
  fri.setDate(today.getDate() + daysUntilFri + (which === 'next' ? 7 : 0));
  const sun = new Date(fri);
  sun.setDate(fri.getDate() + 2);
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(fri)} – ${fmt(sun)}`;
}

function ResultsScreen({
  results, onRestart, weekend, onWeekendChange, loading,
}: {
  results: ScoredEvent[];
  onRestart: () => void;
  weekend: 'this' | 'next';
  onWeekendChange: (w: 'this' | 'next') => void;
  loading: boolean;
}) {
  return (
    <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen px-6 pt-24 pb-16 max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: -2 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="inline-block mb-6 px-4 py-2 border-[3px] border-black"
          style={{ backgroundColor: '#C5F82A', boxShadow: '5px 5px 0 #0A0A0A', fontFamily: '"JetBrains Mono", monospace' }}>
          <span className="text-sm font-black uppercase tracking-wider">Plans ready ✓</span>
        </motion.div>
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-6xl md:text-8xl font-black leading-[0.9] mb-3 tracking-tighter"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: '#0A0A0A' }}>
          Your weekend,<br />sorted.
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-lg font-medium opacity-50 max-w-lg mx-auto mb-8"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
          Ranked by how well they match your answers. Pick the one that feels right.
        </motion.p>

        {/* Weekend toggle */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="inline-flex border-[3px] border-black overflow-hidden"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
          {(['this', 'next'] as const).map(w => (
            <button key={w} onClick={() => onWeekendChange(w)}
              disabled={loading}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                backgroundColor: weekend === w ? '#0A0A0A' : 'white',
                color: weekend === w ? '#C5F82A' : '#0A0A0A',
                borderRight: w === 'this' ? '3px solid #0A0A0A' : 'none',
              }}>
              {w === 'this' ? 'This weekend' : 'Next weekend'}
              <span className="block text-[9px] opacity-70 normal-case tracking-normal font-bold mt-0.5">
                {getWeekendLabel(w)}
              </span>
            </button>
          ))}
        </motion.div>
      </div>

      {/* Cards or loading overlay */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#FFF8E7]/80 backdrop-blur-sm">
            <div className="text-center">
              <motion.div animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="text-5xl mb-3">🌀</motion.div>
              <p className="font-black text-lg" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                Updating plans...
              </p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 mb-12">
          {results.map((event, idx) => (
            <ResultCard key={event.id} event={event} rank={idx} delay={loading ? 0 : 0.4 + idx * 0.15} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          <BrutalButton onClick={onRestart} color="white">
            <RotateCcw size={18} strokeWidth={3} /> Start over
          </BrutalButton>
        </motion.div>

        <p className="mt-8 text-xs opacity-35 font-bold uppercase tracking-wider"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          where2.ai · Bengaluru · 2026
        </p>
        <p className="mt-2 text-xs opacity-40" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          Made by{' '}
          <a href="https://linkedin.com/in/varshasinghrathore" target="_blank" rel="noopener noreferrer"
            className="underline hover:opacity-70 transition-opacity">Varsha Rathore</a>
          {' · '}
          <a href="https://instagram.com/roamwithrains" target="_blank" rel="noopener noreferrer"
            className="underline hover:opacity-70 transition-opacity">📷 roamwithrains</a>
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type Step = 'intro' | 'quiz' | 'hardno' | 'loading' | 'results';

export default function WeekendPlanner() {
  const [step,          setStep]          = useState<Step>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers,       setAnswers]       = useState<Partial<Answers>>({});
  const [hardNos,       setHardNos]       = useState<Trigger[]>([]);
  const [results,       setResults]       = useState<ScoredEvent[]>([]);
  const [weekend,       setWeekend]       = useState<'this' | 'next'>('this');
  const [weekendLoading, setWeekendLoading] = useState(false);

  // Store last answers/hardNos so weekend toggle can re-fetch
  const lastAnswers  = React.useRef<Partial<Answers>>({});
  const lastHardNos  = React.useRef<Trigger[]>([]);

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
      return data.results as ScoredEvent[];
    } catch {
      const { scoreEvents, generateLocalWhy } = await import('@/lib/scorer');
      const { transformEvents } = await import('@/lib/transformer');
      const rawData = await import('@/data/events.json');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const events = transformEvents((rawData as any).events ?? rawData);
      return scoreEvents(events, ans as Answers, [])
        .slice(0, 3)
        .map(e => ({ ...e, why: generateLocalWhy(e, ans as Answers) }));
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
    setStep('intro'); setQuestionIndex(0); setAnswers({}); setHardNos([]); setResults([]); setWeekend('this');
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
        {step === 'quiz'    && <QuizScreen questionIndex={questionIndex} answers={answers} onAnswer={handleAnswer} onBack={handleBack} totalQuestions={QUESTIONS.length} />}
        {step === 'hardno'  && <HardNoScreen hardNos={hardNos} onToggle={toggleHardNo} onSubmit={submitQuiz} onBack={handleBack} />}
        {step === 'loading' && <LoadingScreen />}
        {step === 'results' && <ResultsScreen results={results} onRestart={restart} weekend={weekend} onWeekendChange={handleWeekendChange} loading={weekendLoading} />}
      </AnimatePresence>
    </div>
  );
}
