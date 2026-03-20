'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Bell, Palette, Sliders, Check,
  Sun, Moon, Sparkles, Star, Leaf, BookOpen,
  User, Globe, Lock, Zap, Eye, EyeOff,
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import type { UserSettings } from '@/contexts/SettingsContext';
import {
  useTheme,
  ColorMode,
  CUSTOM_PRESET_LABELS,
  CUSTOM_PRESET_COLORS,
} from '@/components/shared/themes/ThemeProvider';
import type {
  LavaLampVariant,
  SpaceVariant,
  SeasonVariant,
  SubjectVariant,
  ThemeGroup,
} from '@/components/shared/themes/ThemeProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const COLOR_MODES: { value: ColorMode; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'dark',   label: 'Dark',   icon: Moon,     desc: 'Black + orange accents' },
  { value: 'light',  label: 'Light',  icon: Sun,      desc: 'White + orange accents' },
  { value: 'custom', label: 'Custom', icon: Sparkles, desc: 'Your chosen theme' },
];

const THEME_GROUPS: { value: ThemeGroup; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'lavalamp', label: 'Lava Lamp', icon: Sparkles, desc: 'Flowing gradient blobs' },
  { value: 'space',    label: 'Space',     icon: Star,     desc: 'Stars, nebulae & galaxies' },
  { value: 'seasons',  label: 'Seasons',   icon: Leaf,     desc: 'Seasonal atmospheres' },
  { value: 'subjects', label: 'Subjects',  icon: BookOpen, desc: 'Based on what you study' },
];

const SPACE_VARIANTS: { value: SpaceVariant; label: string; colors: [string, string] }[] = [
  { value: 'stars',    label: 'Drifting Stars', colors: ['#4fc3f7', '#90caf9'] },
  { value: 'starfall', label: 'Starfall',       colors: ['#7c4dff', '#40c4ff'] },
  { value: 'nebula',   label: 'Nebula',         colors: ['#7b2ff7', '#f72585'] },
  { value: 'galaxy',   label: 'Galaxy',         colors: ['#9d4edd', '#4361ee'] },
];

const SEASON_VARIANTS: { value: SeasonVariant; label: string; colors: [string, string] }[] = [
  { value: 'spring', label: 'Spring',       colors: ['#a8edea', '#fed6e3'] },
  { value: 'summer', label: 'Summer',       colors: ['#f7971e', '#21d190'] },
  { value: 'autumn', label: 'Autumn',       colors: ['#c94b4b', '#f39c12'] },
  { value: 'winter', label: 'Winter',       colors: ['#e0eafc', '#a8c0ff'] },
  { value: 'dry',    label: 'Dry Season',   colors: ['#ffd200', '#56ab2f'] },
  { value: 'rainy',  label: 'Rainy Season', colors: ['#4286f4', '#5c6bc0'] },
];

const SUBJECT_VARIANTS: { value: SubjectVariant; label: string; colors: [string, string] }[] = [
  { value: 'mathematics', label: 'Mathematics',   colors: ['#1976d2', '#42a5f5'] },
  { value: 'sciences',    label: 'Sciences',      colors: ['#2e7d32', '#66bb6a'] },
  { value: 'languages',   label: 'Languages',     colors: ['#8e24aa', '#ce93d8'] },
  { value: 'business',    label: 'Business',      colors: ['#00695c', '#4db6ac'] },
  { value: 'technology',  label: 'Technology',    colors: ['#283593', '#5c6bc0'] },
  { value: 'arts',        label: 'Arts & Social', colors: ['#e64a19', '#ff8a65'] },
  { value: 'health',      label: 'Health & PE',   colors: ['#c2185b', '#f48fb1'] },
];

const LAVA_PRESETS = Object.keys(CUSTOM_PRESET_LABELS) as LavaLampVariant[];

const LANGUAGES = [
  { label: 'English',    value: 'en' },
  { label: 'Spanish',    value: 'es' },
  { label: 'French',     value: 'fr' },
  { label: 'Portuguese', value: 'pt' },
];

const TIMEZONES = [
  { label: 'Jamaica (GMT-5)',     value: 'America/Jamaica' },
  { label: 'Trinidad (GMT-4)',    value: 'America/Port_of_Spain' },
  { label: 'Barbados (GMT-4)',    value: 'America/Barbados' },
  { label: 'Guyana (GMT-4)',      value: 'America/Guyana' },
  { label: 'Belize (GMT-6)',      value: 'America/Belize' },
  { label: 'New York (GMT-5/-4)', value: 'America/New_York' },
  { label: 'London (GMT+0/+1)',   value: 'Europe/London' },
  { label: 'Toronto (GMT-5/-4)',  value: 'America/Toronto' },
  { label: 'UTC',                 value: 'UTC' },
];

const TIER_INFO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  standard:   { label: 'Free',       color: 'text-white/60',   bg: 'bg-white/5',       border: 'border-white/10' },
  early_bird: { label: 'Early Bird', color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  alpha:      { label: 'Alpha',      color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  pro:        { label: 'ASSI+',      color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
};

export default function SettingsPage() {
  const { settings, update, isLoading } = useSettings();
  const { user } = useAuth();
  const {
    themeGroup, themeVariant, colorMode,
    setThemeGroup, setThemeVariant, setColorMode, setCustomPreset,
  } = useTheme();

  const [saved,         setSaved]         = useState(false);
  const [username,      setUsername]      = useState('');
  const [email,         setEmail]         = useState('');
  const [phoneNumber,   setPhoneNumber]   = useState('');
  const [showPhone,     setShowPhone]     = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError,  setProfileError]  = useState<string | null>(null);
  const [profileSaved,  setProfileSaved]  = useState(false);

  const tier     = (user as any)?.tier ?? 'standard';
  const tierInfo = TIER_INFO[tier] ?? TIER_INFO.standard;

  async function handleUpdate(patch: Partial<UserSettings>) {
    await update(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  async function handleProfileSave() {
    if (!username.trim() && !email.trim() && !phoneNumber.trim()) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      const body: Record<string, any> = {};
      if (username.trim())    body.username     = username.trim();
      if (email.trim())       body.email        = email.trim();
      if (phoneNumber.trim()) body.phone_number = phoneNumber.trim();
      body.show_phone = showPhone;

      const res  = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
      setUsername(''); setEmail(''); setPhoneNumber('');
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  if (isLoading || !settings) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4 animate-pulse">
        {[28, 32, 40, 56, 28, 32, 28].map((h, i) => (
          <div key={i} className="panel rounded-3xl" style={{ height: `${h * 4}px` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* Header */}
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

      {/* ASSI+ Tier */}
      <motion.div custom={1} variants={fade} initial="initial" animate="animate"
        className={`panel rounded-3xl p-5 border ${tierInfo.border} ${tierInfo.bg}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="glass-soft w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap size={16} className={tierInfo.color} />
            </div>
            <div>
              <p className="text-white font-medium text-sm">{tierInfo.label} Plan</p>
              <p className="text-white/40 text-xs mt-0.5">
                {tier === 'standard'
                  ? 'Upgrade to ASSI+ for unlimited AI, more subjects & priority tutors'
                  : tier === 'early_bird'
                    ? 'Early bird — grandfathered pricing forever 🎉'
                    : 'Full platform access'}
              </p>
            </div>
          </div>
          {tier === 'standard' ? (
            <button className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold transition flex-shrink-0">
              Upgrade
            </button>
          ) : (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${tierInfo.color} ${tierInfo.border}`}>
              {tierInfo.label}
            </span>
          )}
        </div>
        {tier === 'standard' && (
          <div className="mt-4 pt-4 border-t border-white/8 grid grid-cols-3 gap-2">
            {['Unlimited ASSI', 'Unlimited subjects', 'Priority tutors'].map((f) => (
              <div key={f} className="flex items-center gap-1.5">
                <span className="text-white/20 text-xs">🔒</span>
                <span className="text-white/35 text-xs">{f}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Account */}
      <motion.div custom={2} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-4"
      >
        <SectionHeader icon={User} title="Account" />
        <p className="text-white/40 text-xs">Leave a field blank to keep it unchanged.</p>
        <div className="space-y-3">
          <InputRow label="Username" placeholder={user?.username ?? 'New username'}
            value={username} onChange={setUsername}
            hint="3–32 characters, letters, numbers and underscores" />
          <InputRow label="Email" placeholder={user?.email ?? 'New email address'}
            value={email} onChange={setEmail} type="email" />
          <InputRow label="Phone number" placeholder="+1 876 000 0000"
            value={phoneNumber} onChange={setPhoneNumber} type="tel"
            hint="Optional — shown only if you enable visibility below" />
        </div>
        <ToggleRow label="Show phone number"
          description="Let tutors and students see your phone number"
          value={showPhone} onChange={setShowPhone} />
        {profileError && <p className="text-red-400 text-xs">{profileError}</p>}
        <div className="flex items-center justify-between pt-1">
          <AnimatePresence>
            {profileSaved && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-emerald-400 text-xs flex items-center gap-1">
                <Check size={12} /> Profile updated
              </motion.p>
            )}
          </AnimatePresence>
          <button onClick={handleProfileSave}
            disabled={savingProfile || (!username.trim() && !email.trim() && !phoneNumber.trim())}
            className="ml-auto px-4 py-2 rounded-xl bg-white text-orange-600 font-semibold text-xs hover:bg-white/90 disabled:opacity-40 transition"
          >
            {savingProfile ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div custom={3} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-4"
      >
        <SectionHeader icon={Bell} title="Notifications" />
        <ToggleRow label="Email notifications"
          description="Session reminders, tutor messages and platform updates"
          value={settings.emailNotifications}
          onChange={(v) => handleUpdate({ emailNotifications: v })} />
        <ToggleRow label="Push notifications"
          description="Real-time alerts while you're using ASSI"
          value={settings.pushNotifications}
          onChange={(v) => handleUpdate({ pushNotifications: v })} />
      </motion.div>

      {/* Appearance */}
      <motion.div custom={4} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-5"
      >
        <SectionHeader icon={Palette} title="Appearance" />
        <div>
          <p className="text-white/75 text-xs font-medium mb-3">UI Mode</p>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_MODES.map(({ value, label, icon: Icon, desc }) => {
              const active = colorMode === value;
              return (
                <button key={value} onClick={() => setColorMode(value)}
                  className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-center transition-all ${
                    active ? 'bg-white/15 border-white/30 text-white' : 'bg-white/4 border-white/8 text-white/55 hover:text-white/80 hover:bg-white/8'
                  }`}>
                  <Icon size={16} className={active ? 'text-orange-400' : 'text-white/50'} />
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="text-[10px] leading-tight text-white/40 hidden sm:block">{desc}</span>
                </button>
              );
            })}
          </div>
        </div>
        <AnimatePresence>
          {colorMode === 'custom' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
              className="overflow-hidden space-y-4"
            >
              <div>
                <p className="text-white/75 text-xs font-medium mb-3">Theme Style</p>
                <div className="grid grid-cols-2 gap-2">
                  {THEME_GROUPS.map(({ value, label, icon: Icon, desc }) => {
                    const active = themeGroup === value;
                    return (
                      <button key={value}
                        onClick={() => {
                          setThemeGroup(value);
                          if (value === 'lavalamp') setThemeVariant('assi');
                          if (value === 'space')    setThemeVariant('stars');
                          if (value === 'seasons')  setThemeVariant('summer');
                          if (value === 'subjects') setThemeVariant('mathematics');
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                          active ? 'border-white/30 bg-white/12' : 'border-white/8 bg-white/4 hover:bg-white/8'
                        }`}>
                        <Icon size={15} className={active ? 'text-orange-400' : 'text-white/40'} />
                        <div className="text-left">
                          <p className={`text-sm font-medium ${active ? 'text-white' : 'text-white/60'}`}>{label}</p>
                          <p className="text-[10px] text-white/30">{desc}</p>
                        </div>
                        {active && <Check size={12} className="ml-auto text-orange-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              {themeGroup === 'lavalamp' && (
                <VariantGrid label="Lava Lamp Style"
                  items={LAVA_PRESETS.map(p => ({ value: p, label: CUSTOM_PRESET_LABELS[p], colors: CUSTOM_PRESET_COLORS[p] }))}
                  active={themeVariant as string}
                  onSelect={(v) => { setCustomPreset(v as LavaLampVariant); setThemeVariant(v as LavaLampVariant); }} />
              )}
              {themeGroup === 'space' && (
                <VariantGrid label="Space Style" items={SPACE_VARIANTS}
                  active={themeVariant as string} onSelect={(v) => setThemeVariant(v as SpaceVariant)} />
              )}
              {themeGroup === 'seasons' && (
                <VariantGrid label="Season" items={SEASON_VARIANTS} cols={3}
                  active={themeVariant as string} onSelect={(v) => setThemeVariant(v as SeasonVariant)} />
              )}
              {themeGroup === 'subjects' && (
                <VariantGrid label="Subject Theme" items={SUBJECT_VARIANTS}
                  active={themeVariant as string} onSelect={(v) => setThemeVariant(v as SubjectVariant)} />
              )}
              <div className="glass-soft rounded-xl px-3 py-2.5 flex items-start gap-2">
                <span className="text-orange-400 text-xs mt-0.5">✦</span>
                <p className="text-white/40 text-xs leading-relaxed">
                  All themes adjust brightness and warmth throughout the day — darker at night, warmer at sunrise and sunset.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Language & Region */}
      <motion.div custom={5} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-4"
      >
        <SectionHeader icon={Globe} title="Language & Region" />
        <SelectRow label="Language" value={settings.language} options={LANGUAGES}
          onChange={(v) => handleUpdate({ language: v })} />
        <SelectRow label="Timezone" value={settings.timezone} options={TIMEZONES}
          onChange={(v) => handleUpdate({ timezone: v })} />
      </motion.div>

      {/* ASSI Assistant */}
      <motion.div custom={6} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-4"
      >
        <SectionHeader icon={Sparkles} title="ASSI Assistant" />
        <ToggleRow label="Show ASSI"
          description="Display the floating ASSI assistant throughout the app"
          value={settings.assiEnabled}
          onChange={(v) => handleUpdate({ assiEnabled: v })} />
        <ToggleRow label="Reduce motion"
          description="Minimize animations and floating effects throughout the app"
          value={settings.reduceMotion}
          onChange={(v) => handleUpdate({ reduceMotion: v })} />
      </motion.div>

      {/* Privacy */}
      <motion.div custom={7} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-4"
      >
        <SectionHeader icon={Lock} title="Privacy" />
        <p className="text-white/40 text-xs leading-relaxed">
          Control what other users can see about you. Your email is never shared.
        </p>
        <div className="space-y-2">
          <div className="glass-soft rounded-xl px-4 py-3">
            <p className="text-white/60 text-xs font-medium">Email address</p>
            <p className="text-white/30 text-xs mt-0.5">Never visible to other users</p>
          </div>
          <div className="glass-soft rounded-xl px-4 py-3">
            <p className="text-white/60 text-xs font-medium">Phone number</p>
            <p className="text-white/30 text-xs mt-0.5">
              {showPhone ? 'Visible to tutors and students' : 'Hidden — enable in Account section above'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Advanced */}
      <motion.div custom={8} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-4"
      >
        <SectionHeader icon={Sliders} title="Advanced" />
        <p className="text-white/65 text-xs leading-relaxed">
          Data exports, account deletion, and session history are available from your profile page.
        </p>
        <div className="glass-soft rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-medium">App version</p>
            <p className="text-white/25 text-xs">ASSI Platform v1.0 · Kingston, Jamaica 🇯🇲</p>
          </div>
        </div>
      </motion.div>

    </div>
  );
}

/* ── Reusable components ── */

function VariantGrid({ label, items, active, onSelect, cols = 2 }: {
  label: string;
  items: { value: string; label: string; colors: [string, string] }[];
  active: string; onSelect: (v: string) => void; cols?: 2 | 3;
}) {
  return (
    <div>
      <p className="text-white/75 text-xs font-medium mb-3">{label}</p>
      <div className={`grid gap-2 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {items.map(({ value, label: l, colors }) => {
          const active_ = active === value;
          return (
            <button key={value} onClick={() => onSelect(value)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                active_ ? 'border-white/30 bg-white/12' : 'border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/15'
              }`}>
              <span className="w-6 h-6 rounded-lg flex-shrink-0 ring-1 ring-white/10"
                style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }} />
              <span className={`text-sm font-medium truncate ${active_ ? 'text-white' : 'text-white/65'}`}>{l}</span>
              {active_ && <Check size={12} className="ml-auto text-orange-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-1 border-b border-white/10">
      <Icon size={14} className="text-white/60" />
      <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">{title}</p>
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-white/55 text-xs mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-orange-500' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: {
  label: string; value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-white text-sm font-medium">{label}</p>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="glass-soft text-white text-sm rounded-xl px-3 py-2 outline-none border border-white/10 focus:border-white/25 transition bg-transparent">
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-black bg-white">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function InputRow({ label, placeholder, value, onChange, type = 'text', hint }: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-1">
      <label className="text-white/60 text-xs font-medium">{label}</label>
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : type === 'password' ? 'text' : type}
          placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full glass-soft rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-white/25 transition"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p className="text-white/25 text-[10px]">{hint}</p>}
    </div>
  );
}

function AnimatedCheck({ visible }: { visible: boolean }) {
  return (
    <motion.div initial={false} animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.8 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
      <Check size={13} /> Saved
    </motion.div>
  );
}