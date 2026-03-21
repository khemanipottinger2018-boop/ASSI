// lib/subjectToModel.ts
// Maps any CXC/CAPE subject name to the appropriate AI model config.
// Uses keyword matching + category fallback — handles the full CXC/CAPE catalogue.

import {
  Calculator, FlaskConical, Leaf, BookOpen, Landmark, Globe,
  BarChart2, Code2, Music2, Palette, Dumbbell, Heart, Scale,
  Cpu, Microscope, Languages, PenTool, Building2, Waves,
  LucideIcon,
} from 'lucide-react';

export type ModelConfig = {
  model:   string;   // actual model string sent to backend
  display: string;   // shown in UI e.g. "Reasoner"
  color:   string;   // tailwind text class
  icon:    LucideIcon;
};

// ── Model tiers ─────────────────────────────────────────────────────
// Reasoner  — o1-mini  — logic-heavy: maths, sciences, computing
// Writer    — gpt-4o   — language, humanities, arts
// Analyst   — gpt-4o   — social sciences, business, economics
// Coder     — gpt-4o   — IT, computing
// General   — gpt-4o-mini — everything else

const MODELS = {
  reasoner: { model: 'o1-mini',     display: 'Reasoner', color: 'text-blue-400'    },
  writer:   { model: 'gpt-4o',      display: 'Writer',   color: 'text-purple-400'  },
  analyst:  { model: 'gpt-4o',      display: 'Analyst',  color: 'text-teal-400'    },
  coder:    { model: 'gpt-4o',      display: 'Coder',    color: 'text-emerald-400' },
  general:  { model: 'gpt-4o-mini', display: 'ASSI',     color: 'text-orange-400'  },
} as const;

type ModelKey = keyof typeof MODELS;

// ── Keyword → model + icon mapping ──────────────────────────────────
// Checked in order — first match wins.
const RULES: { keywords: string[]; model: ModelKey; icon: LucideIcon }[] = [
  // Maths & pure sciences → Reasoner
  { keywords: ['math', 'additional math', 'pure math', 'applied math'], model: 'reasoner', icon: Calculator },
  { keywords: ['physics'],                                               model: 'reasoner', icon: Cpu        },
  { keywords: ['chemistry'],                                             model: 'reasoner', icon: FlaskConical },
  { keywords: ['statistics'],                                            model: 'reasoner', icon: BarChart2   },

  // IT & Computing → Coder
  { keywords: ['information technology', 'computer science', 'computing', 'it ', 'i.t'], model: 'coder', icon: Code2 },

  // Life / natural sciences → Analyst
  { keywords: ['biology', 'environmental'],                              model: 'analyst', icon: Leaf        },
  { keywords: ['agriculture'],                                           model: 'analyst', icon: Leaf        },
  { keywords: ['integrated science', 'human and social'],                model: 'analyst', icon: Microscope  },
  { keywords: ['food and nutrition', 'nutrition'],                       model: 'analyst', icon: Heart       },
  { keywords: ['physical education', 'physical ed', 'pe '],             model: 'analyst', icon: Dumbbell    },
  { keywords: ['health science', 'health'],                              model: 'analyst', icon: Heart       },

  // Business / social sciences → Analyst
  { keywords: ['economics', 'business', 'accounts', 'accounting', 'management', 'entrepreneurship'], model: 'analyst', icon: BarChart2 },
  { keywords: ['social studies', 'sociology', 'caribbean studies', 'population'],                    model: 'analyst', icon: Globe     },
  { keywords: ['geography'],                                             model: 'analyst', icon: Globe       },
  { keywords: ['history', 'caribbean history'],                          model: 'analyst', icon: Landmark    },
  { keywords: ['law', 'legal'],                                          model: 'analyst', icon: Scale       },
  { keywords: ['tourism', 'hospitality'],                                model: 'analyst', icon: Building2   },

  // Languages & humanities → Writer
  { keywords: ['english', 'language arts', 'communication studies', 'literatures'],  model: 'writer', icon: BookOpen  },
  { keywords: ['french', 'spanish', 'portuguese', 'creole', 'spanish'],              model: 'writer', icon: Languages },
  { keywords: ['religious education', 'religious', 'bible'],                          model: 'writer', icon: BookOpen  },
  { keywords: ['history'],                                               model: 'writer', icon: Landmark    },

  // Creative / performing arts → Writer
  { keywords: ['art', 'visual arts', 'craft'],                          model: 'writer', icon: Palette     },
  { keywords: ['music', 'performing'],                                   model: 'writer', icon: Music2      },
  { keywords: ['theatre', 'drama'],                                      model: 'writer', icon: PenTool     },
  { keywords: ['technical drawing', 'building technology', 'construction'], model: 'analyst', icon: Building2 },
  { keywords: ['electrical', 'electronic', 'mechanical', 'industrial'], model: 'analyst', icon: Waves      },
  { keywords: ['principles of business'],                                model: 'analyst', icon: BarChart2  },
  { keywords: ['office administration'],                                 model: 'analyst', icon: BookOpen   },
];

// ── Category fallbacks ───────────────────────────────────────────────
const CATEGORY_DEFAULTS: Record<string, { model: ModelKey; icon: LucideIcon }> = {
  CSEC: { model: 'general',  icon: BookOpen },
  CAPE: { model: 'analyst',  icon: BookOpen },
};

// ── Main function ────────────────────────────────────────────────────
export function subjectToModel(name: string, category?: string): ModelConfig & { icon: LucideIcon } {
  const lower = name.toLowerCase();

  for (const rule of RULES) {
    if (rule.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return { ...MODELS[rule.model], icon: rule.icon };
    }
  }

  // Category fallback
  const catDefault = category ? CATEGORY_DEFAULTS[category] : null;
  if (catDefault) {
    return { ...MODELS[catDefault.model], icon: catDefault.icon };
  }

  return { ...MODELS.general, icon: BookOpen };
}

// ── Hint text ────────────────────────────────────────────────────────
export function subjectHint(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('math'))     return 'Walk me through a problem step by step…';
  if (lower.includes('english'))  return 'Essay help, comprehension, analysis…';
  if (lower.includes('physics'))  return 'Explain a concept or work through a calculation…';
  if (lower.includes('chem'))     return 'Reactions, equations, organic chemistry…';
  if (lower.includes('biology') || lower.includes('bio')) return 'Cells, systems, ecology, genetics…';
  if (lower.includes('history'))  return 'Events, causes, essay structure…';
  if (lower.includes('geog'))     return 'Physical, human, or Caribbean geography…';
  if (lower.includes('econ'))     return 'Micro, macro, Caribbean case studies…';
  if (lower.includes('account'))  return 'Ledgers, financial statements, analysis…';
  if (lower.includes('business')) return 'Management, marketing, entrepreneurship…';
  if (lower.includes('compute') || lower.includes('i.t')) return 'Code, algorithms, networks, systems…';
  if (lower.includes('french') || lower.includes('spanish')) return 'Grammar, vocabulary, reading comprehension…';
  if (lower.includes('social'))   return 'Caribbean society, culture, development…';
  return 'Ask me anything about this subject…';
}