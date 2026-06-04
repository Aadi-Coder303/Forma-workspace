'use client';

import { useState, useEffect, useLayoutEffect, useCallback } from 'react';

// ─── Tour steps ───────────────────────────────────────────────────────────────
interface Step {
  id: string;
  title: string;
  body: string;
  target?: string;        // data-tour attribute value
  side?: 'right' | 'left' | 'bottom' | 'top';
  tab?: string;           // switch to this tab before showing
  icon?: string;
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome to Forma Workspace 👋',
    body: 'A premium, offline-first workspace built for developers and freelancers who think in projects. This quick tour will show you every section in under a minute.',
    icon: '🚀',
  },
  {
    id: 'nav-rail',
    title: 'The Navigation Rail',
    body: 'Everything lives here — Projects, Today, Notes, Team, Clients, and Settings. One click to switch, no nesting, no menus.',
    target: 'sidebar-nav',
    side: 'right',
  },
  {
    id: 'tab-projects',
    title: 'Projects Hub',
    body: 'Your active projects at a glance. Create a fresh project (Forma scaffolds the local folders) or import an existing one from disk with the native folder picker.',
    target: 'tab-projects',
    side: 'right',
    tab: 'Projects',
  },
  {
    id: 'new-project',
    title: 'Create or Import',
    body: 'Type a name and hit Create — Forma makes the folders for you. Or click "Import Existing" to pick any folder already on your machine.',
    target: 'new-project',
    side: 'bottom',
    tab: 'Projects',
  },
  {
    id: 'tab-today',
    title: 'Today',
    body: 'Your daily focus view. Write down the one thing you must get done, check live stats across your workspace, and jump quickly into recent projects.',
    target: 'tab-today',
    side: 'right',
    tab: 'Today',
  },
  {
    id: 'tab-notes',
    title: 'Notes',
    body: 'A persistent markdown scratchpad saved directly to disk. Create notes, title them, write freely and save with ⌘S. Link notes to projects.',
    target: 'tab-notes',
    side: 'right',
    tab: 'Notes',
  },
  {
    id: 'tab-team',
    title: 'Team',
    body: 'Keep track of your collaborators. Add names, roles, and emails — great for sub-contractors or agency teammates.',
    target: 'tab-team',
    side: 'right',
    tab: 'Team',
  },
  {
    id: 'tab-clients',
    title: 'Clients',
    body: 'A full CRM for freelancers. Store client details (email, phone, country, currency), link them to projects, and track every deal through a 9-section, 65-item checklist — from onboarding to handoff.',
    target: 'tab-clients',
    side: 'right',
    tab: 'Clients',
  },
  {
    id: 'tab-invoices',
    title: 'Invoices',
    body: 'Generate, manage, and track professional invoices. Link them to clients and projects, track payments, and get paid faster.',
    target: 'tab-invoices',
    side: 'right',
    tab: 'Invoices',
  },
  {
    id: 'search-btn',
    title: 'Command Palette  ⌘K',
    body: 'Instantly jump to any project or note from anywhere in the app. Just press ⌘K (or Ctrl+K on Windows) — no mouse needed.',
    target: 'search-btn',
    side: 'right',
  },
  {
    id: 'tab-settings',
    title: 'Settings',
    body: 'Set your base directory (where all project folders live), review workspace stats, and re-launch this tour any time from here.',
    target: 'tab-settings',
    side: 'right',
  },
  {
    id: 'done',
    title: "You're all set! 🎉",
    body: "Forma Workspace is ready to use. Start by creating your first project or importing an existing one. You can replay this tour any time from the Settings tab.",
    icon: '✨',
  },
];

const PADDING = 12; // spotlight padding around target element

interface Props {
  onClose: () => void;
  onTabChange: (tab: string) => void;
}

export default function WalkthroughOverlay({ onClose, onTabChange }: Props) {
  const [step, setStep] = useState(0);
  const [spotlight, setSpotlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast  = step === STEPS.length - 1;

  // ── Measure target element ─────────────────────────────────────────────────
  const measure = useCallback(() => {
    if (!current.target) {
      setSpotlight(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (!el) { setSpotlight(null); return; }

    const r = el.getBoundingClientRect();
    const spot = {
      top:    r.top    - PADDING,
      left:   r.left   - PADDING,
      width:  r.width  + PADDING * 2,
      height: r.height + PADDING * 2,
    };
    setSpotlight(spot);

    // Position tooltip
    const side    = current.side ?? 'right';
    const TOOLTIP_W = 320;
    const TOOLTIP_H = 180;
    const GAP = 16;
    let top  = spot.top;
    let left = spot.left;

    if (side === 'right') {
      left = spot.left + spot.width + GAP;
      top  = spot.top + spot.height / 2 - TOOLTIP_H / 2;
    } else if (side === 'left') {
      left = spot.left - TOOLTIP_W - GAP;
      top  = spot.top + spot.height / 2 - TOOLTIP_H / 2;
    } else if (side === 'bottom') {
      top  = spot.top + spot.height + GAP;
      left = spot.left + spot.width / 2 - TOOLTIP_W / 2;
    } else {
      top  = spot.top - TOOLTIP_H - GAP;
      left = spot.left + spot.width / 2 - TOOLTIP_W / 2;
    }

    // Clamp to viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    left = Math.max(GAP, Math.min(left, vw - TOOLTIP_W - GAP));
    top  = Math.max(GAP, Math.min(top,  vh - TOOLTIP_H - GAP));

    setTooltipPos({ top, left });
  }, [current]);

  // Re-measure on step change (after tab switch settles)
  useLayoutEffect(() => {
    setVisible(false);
    const tid = setTimeout(() => {
      measure();
      setVisible(true);
    }, 300);
    return () => clearTimeout(tid);
  }, [step, measure]);

  // Resize
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') advance();
      if (e.key === 'ArrowLeft') retreat();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const advance = () => {
    if (isLast) { onClose(); return; }
    const next = STEPS[step + 1];
    if (next.tab) onTabChange(next.tab);
    setStep(s => s + 1);
  };

  const retreat = () => {
    if (isFirst) return;
    const prev = STEPS[step - 1];
    if (prev.tab) onTabChange(prev.tab);
    setStep(s => s - 1);
  };

  // ── Centered card (first / last step) ─────────────────────────────────────
  const isCentered = !current.target;

  return (
    <div className="fixed inset-0 z-[100]" style={{ fontFamily: 'inherit' }}>

      {/* ── Overlay backdrop with spotlight hole ── */}
      {spotlight ? (
        <>
          {/* Four dark panels around the spotlight */}
          <div className="absolute inset-0 pointer-events-none backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.5)' }} />
          {/* Spotlight cutout — transparent window */}
          <div
            className="absolute pointer-events-none rounded-2xl"
            style={{
              top:    spotlight.top,
              left:   spotlight.left,
              width:  spotlight.width,
              height: spotlight.height,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
              border: '2px solid var(--accent)',
              transition: 'all 0.3s ease',
              opacity: visible ? 1 : 0,
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.7)' }} />
      )}

      {/* ── Skip button ── */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 text-xs text-white/50 hover:text-white transition-colors cursor-pointer z-[101] px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40"
      >
        Skip tour  ✕
      </button>

      {/* ── Step progress dots ── */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-[101]">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width:  i === step ? 20 : 6,
              height: 6,
              backgroundColor: i === step ? 'var(--accent)' : i < step ? 'var(--text-muted)' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      {/* ── Tooltip / centered card ── */}
      {isCentered ? (
        // Centered welcome / done card
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]"
          style={{
            width: 440,
            opacity: visible ? 1 : 0,
            transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.95})`,
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}
        >
          <div className="bg-card border border-border rounded-3xl p-10 shadow-2xl text-center">
            {current.icon && (
              <div className="text-5xl mb-5">{current.icon}</div>
            )}
            <h2 className="text-primary font-display text-2xl font-bold mb-3 leading-tight">
              {current.title}
            </h2>
            <p className="text-muted text-sm leading-relaxed mb-8">
              {current.body}
            </p>
            <button
              onClick={advance}
              className="bg-accent hover:opacity-90 text-canvas px-8 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer w-full"
            >
              {isLast ? 'Start using Forma Workspace →' : 'Start the tour →'}
            </button>
            {isLast && (
              <p className="text-faint text-xs mt-4">
                Re-launch anytime from Settings
              </p>
            )}
          </div>
        </div>
      ) : (
        // Spotlight tooltip card
        <div
          className="absolute z-[101]"
          style={{
            top:     tooltipPos.top,
            left:    tooltipPos.left,
            width:   320,
            opacity: visible ? 1 : 0,
            transform: `translateY(${visible ? 0 : 8}px)`,
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          <div className="bg-card border border-border rounded-2xl p-5 shadow-2xl">
            {/* Step counter */}
            <div className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
              Step {step} of {STEPS.length - 2}
            </div>
            <h3 className="text-primary font-display text-lg font-bold mb-2 leading-snug">
              {current.title}
            </h3>
            <p className="text-muted text-[13px] leading-relaxed mb-5">
              {current.body}
            </p>

            {/* Nav buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={retreat}
                disabled={isFirst}
                className="text-xs text-muted hover:text-primary transition-colors cursor-pointer disabled:opacity-0"
              >
                ← Back
              </button>
              <button
                onClick={advance}
                className="bg-accent hover:opacity-90 text-canvas px-5 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                {isLast ? 'Done ✓' : 'Next →'}
              </button>
            </div>

            {/* Keyboard hint */}
            <p className="text-center text-[10px] text-faint mt-3">
              ← → arrow keys to navigate  ·  Esc to skip
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
