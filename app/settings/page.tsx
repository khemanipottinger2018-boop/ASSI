'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Bell, Palette, Sliders, Check, Sun, Moon, Sparkles } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import type { UserSettings } from '@/contexts/SettingsContext';
import {
  useTheme,
  ColorMode,
  CustomPreset,
  CUSTOM_PRESET_LABELS,
  CUSTOM_PRESET_COLORS,
} from '@/components/shared/themes/ThemeProvider';

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const COLOR_MODES: { value: ColorMode; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'dark',   label: 'Dark',   icon: Moon,     desc: 'Dark panels on gradient background' },
  { value: 'light',  label: 'Light',  icon: Sun,      desc: 'Light UI, neutral background' },
  { value: 'custom', label: 'Custom', icon: Sparkles, desc: 'Your chosen gradient theme' },
];

const PRESETS = Object.keys(CUSTOM_PRESET_LABELS) as CustomPreset[];

export default function SettingsPage() {
  const { settings, update, isLoading } = useSettings();
  const { colorMode, setColorMode, customPreset, setCustomPreset } = useTheme();
  const [saved, setSaved] = useState(false);

  // update() now takes a Partial<UserSettings> patch object
  async function handleUpdate(patch: Partial<UserSettings>) {
    await update(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  if (isLoading || !settings) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4 animate-pulse">
        <div className="panel rounded-3xl h-28" />
        <div className="panel rounded-3xl h-40" />
        <div className="panel rounded-3xl h-56" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* ── Header ── */}
      <motion.div custom={0} variants={fade} initial="initial" animate="animate"
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="glass-soft w-9 h-9 rounded-xl flex items-center justify-center">
            <Settings size={16} className="text-white/80" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg tracking-tight">Settings</h1>
            <p className="text-white/60 text-xs">Personalize your ASSI experience</p>
          </div>
        </div>
        <AnimatedCheck visible={saved} />
      </motion.div>

      {/* ── Notifications ── */}
      <motion.div custom={1} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-4"
      >
        <SectionHeader icon={Bell} title="Notifications" />

        <ToggleRow
          label="Email notifications"
          description="Receive updates and alerts via email"
          value={settings.emailNotifications}
          onChange={(v) => handleUpdate({ emailNotifications: v })}
        />

        <ToggleRow
          label="Push notifications"
          description="Receive in-app push notifications"
          value={settings.pushNotifications}
          onChange={(v) => handleUpdate({ pushNotifications: v })}
        />
      </motion.div>

      {/* ── Appearance ── */}
      <motion.div custom={2} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-5"
      >
        <SectionHeader icon={Palette} title="Appearance" />

        {/* Color Mode */}
        <div>
          <p className="text-white/75 text-xs font-medium mb-3">UI Mode</p>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_MODES.map(({ value, label, icon: Icon, desc }) => {
              const active = colorMode === value;
              return (
                <button
                  key={value}
                  onClick={() => setColorMode(value)}
                  className={`
                    flex flex-col items-center gap-2 py-3 px-2 rounded-xl
                    border text-center transition-all duration-150
                    ${active
                      ? 'bg-white/15 border-white/30 text-white'
                      : 'bg-white/4 border-white/8 text-white/55 hover:text-white/80 hover:bg-white/8'
                    }
                  `}
                >
                  <Icon size={16} className={active ? 'text-orange-400' : 'text-white/50'} />
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="text-[10px] leading-tight text-white/40 hidden sm:block">{desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Preset Picker */}
        <AnimatePresence>
          {colorMode === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <p className="text-white/75 text-xs font-medium mb-3">Custom Theme</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => {
                  const active   = customPreset === preset;
                  const [c1, c2] = CUSTOM_PRESET_COLORS[preset];
                  return (
                    <button
                      key={preset}
                      onClick={() => setCustomPreset(preset)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl
                        border transition-all duration-150
                        ${active
                          ? 'border-white/30 bg-white/12'
                          : 'border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/15'
                        }
                      `}
                    >
                      <span
                        className="w-6 h-6 rounded-lg flex-shrink-0 ring-1 ring-white/10"
                        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                      />
                      <span className={`text-sm font-medium ${active ? 'text-white' : 'text-white/65'}`}>
                        {CUSTOM_PRESET_LABELS[preset]}
                      </span>
                      {active && <Check size={13} className="ml-auto text-orange-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Advanced ── */}
      <motion.div custom={3} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-4"
      >
        <SectionHeader icon={Sliders} title="Advanced" />

        <p className="text-white/65 text-xs leading-relaxed">
          Additional settings such as data exports and account management
          are available from your profile page.
        </p>
      </motion.div>
    </div>
  );
}

/* ── Helpers ── */

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-1 border-b border-white/10">
      <Icon size={14} className="text-white/60" />
      <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">{title}</p>
    </div>
  );
}

function ToggleRow({
  label, description, value, onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-white/55 text-xs mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-orange-500' : 'bg-white/15'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function AnimatedCheck({ visible }: { visible: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.8 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium"
    >
      <Check size={13} />
      Saved
    </motion.div>
  );
}