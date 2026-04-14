import type { Variants, Transition } from 'framer-motion';

// ── Shared easing curves ──────────────────────────────────────────────────
const spring  = { ease: [0.22, 1, 0.36, 1] as const };   // smooth decelerate
const crisp   = { ease: [0.32, 0, 0.67, 0] as const };   // quick, snappy
const linear  = { ease: 'linear'           as const };

// ─────────────────────────────────────────────────────────────────────────
// PAGE transitions — vertical axis, slower pacing, feels like navigation
// Use: top-level page enter/exit via AnimatePresence in page components
// ─────────────────────────────────────────────────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -8 },
};
export const pageTransition: Transition = { duration: 0.35, ...spring };

// ─────────────────────────────────────────────────────────────────────────
// MODAL transitions — scale + vertical, communicates elevation
// Use: full-screen interrupts, booking modals, confirmation dialogs
// ─────────────────────────────────────────────────────────────────────────
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 20 },
  animate: { opacity: 1, scale: 1,    y: 0  },
  exit:    { opacity: 0, scale: 0.96, y: 12 },
};
export const modalTransition: Transition = { duration: 0.28, ...spring };

// ─────────────────────────────────────────────────────────────────────────
// BACKDROP — pure opacity fade, no movement
// Use: modal overlays, drawer backdrops
// ─────────────────────────────────────────────────────────────────────────
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};
export const backdropTransition: Transition = { duration: 0.20 };

// ─────────────────────────────────────────────────────────────────────────
// LIST ITEM transitions — staggered short vertical, fast
// Use: dashboard cards, session rows, notification items, subject chips
// ─────────────────────────────────────────────────────────────────────────
export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: 4 },
};
export const listTransition = (index: number): Transition => ({
  duration: 0.26,
  delay: index * 0.055,
  ...spring,
});

// ─────────────────────────────────────────────────────────────────────────
// ALERT / INTERRUPT — enters from slightly above, urgent feel
// Use: TutorRequestModal card, live request banners, error toasts
// ─────────────────────────────────────────────────────────────────────────
export const alertVariants: Variants = {
  initial: { opacity: 0, scale: 0.97, y: -8 },
  animate: { opacity: 1, scale: 1,    y: 0  },
  exit:    { opacity: 0, scale: 0.95, y: -4 },
};
export const alertTransition: Transition = { duration: 0.22, ...spring };

// ─────────────────────────────────────────────────────────────────────────
// FEEDBACK — micro-scale only, instant response
// Use: button press states, toggle clicks, card taps
// ─────────────────────────────────────────────────────────────────────────
export const feedbackVariants: Variants = {
  tap:   { scale: 0.97 },
  hover: { scale: 1.015 },
};
export const feedbackTransition: Transition = { duration: 0.10, ease: 'easeOut' };

// ─────────────────────────────────────────────────────────────────────────
// SIDEBAR — horizontal width-only transition
// Use: Sidebar collapse/expand
// ─────────────────────────────────────────────────────────────────────────
export const sidebarTransition: Transition = { duration: 0.22, ...spring };

// ─────────────────────────────────────────────────────────────────────────
// CAROUSEL SLIDE — directional horizontal slide
// Use: category carousel, tab switcher, nav item group transitions
// dir: 1 = slide in from right, -1 = slide in from left
// ─────────────────────────────────────────────────────────────────────────
export const slideVariants = (dir: number): Variants => ({
  initial: { x: dir * 24, opacity: 0 },
  animate: { x: 0,        opacity: 1 },
  exit:    { x: dir * -24, opacity: 0 },
});
export const slideTransition: Transition = { duration: 0.18, ...spring };

// ─────────────────────────────────────────────────────────────────────────
// PANEL REVEAL — horizontal expand from left, content sections
// Use: collapsible panels, settings sections, expandable rows
// ─────────────────────────────────────────────────────────────────────────
export const panelVariants: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0  },
  exit:    { opacity: 0, x: -4 },
};
export const panelTransition: Transition = { duration: 0.18, ...spring };

// ─────────────────────────────────────────────────────────────────────────
// TOOLTIP / DROPDOWN — scale from top, fast
// Use: hover tooltips, context menus, small floating cards
// ─────────────────────────────────────────────────────────────────────────
export const tooltipVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: -4 },
  animate: { opacity: 1, scale: 1,    y: 0  },
  exit:    { opacity: 0, scale: 0.95, y: -4 },
};
export const tooltipTransition: Transition = { duration: 0.14, ...spring };
