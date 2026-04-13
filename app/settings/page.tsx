'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Bell, Palette, Sliders, Check,
  Sun, Moon, Sparkles, Star, Leaf, BookOpen,
  User, Globe, Lock, Zap, Eye, EyeOff, Crown, Calendar,
  ShieldCheck, Flame, Loader2, Monitor, Layers,
} from 'lucide-react';
import { useSettings } from '@/features/settings';
import { useAuth } from '@/features/auth';
import { userApi } from '@/lib/api';
import type { UserSettings } from '@/features/settings';
import type { UserMe } from '@/lib/api';
import {
  useTheme,
  CUSTOM_PRESET_LABELS,
  CUSTOM_PRESET_COLORS,
} from '@/features/themes/core/ThemeProvider';
import type {
  ColorMode,
  VisualIntensity,
  LavaLampVariant,
  SpaceVariant,
  SeasonVariant,
  EventVariant,
  SubjectVariant,
  ThemeGroup,
  PremiumVariant,
} from '@/features/themes/core/ThemeProvider';
import { REMEMBER_ME_KEY } from '@/features/auth';

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
  { value: 'light',  label: 'Light',  icon: Sun,      desc: 'White + black text' },
  { value: 'system', label: 'System', icon: Monitor,  desc: 'Follows your OS' },
  { value: 'custom', label: 'Custom', icon: Sparkles, desc: 'Your chosen theme' },
];

const VISUAL_INTENSITY_OPTIONS: { value: VisualIntensity; label: string; desc: string }[] = [
  { value: 'high',     label: 'High',     desc: 'Vivid blur + full glow' },
  { value: 'balanced', label: 'Balanced', desc: 'Default — works for most' },
  { value: 'minimal',  label: 'Minimal',  desc: 'Quieter blur, less glass' },
];

const THEME_GROUPS: { value: ThemeGroup; label: string; icon: React.ElementType; desc: string; plus?: boolean }[] = [
  { value: 'lavalamp', label: 'Lava Lamp', icon: Sparkles,  desc: 'Flowing gradient blobs' },
  { value: 'space',    label: 'Space',     icon: Star,      desc: 'Stars, nebulae & galaxies' },
  { value: 'seasons',  label: 'Seasons',   icon: Leaf,      desc: 'Seasonal atmospheres' },
  { value: 'events',   label: 'Events',    icon: Calendar,  desc: 'Holidays & Jamaica events' },
  { value: 'subjects', label: 'Subjects',  icon: BookOpen,  desc: 'Based on what you study' },
  { value: 'premium',  label: 'ASSI+',     icon: Crown,     desc: 'Exclusive premium themes', plus: true },
];

const PREMIUM_VARIANTS: { value: PremiumVariant; label: string; colors: [string, string]; desc: string }[] = [
  { value: 'cyberpunk', label: 'Cyberpunk',    colors: ['#00ffff', '#ff00ff'], desc: 'Neon grid + digital rain' },
  { value: 'ocean',     label: 'Ocean Depths', colors: ['#0077b6', '#48cae4'], desc: 'Bubbles + caustic light' },
  { value: 'lofi',      label: 'Lo-fi Study',  colors: ['#ff9a3c', '#8B4513'], desc: 'Warm desk lamp glow' },
];

const EVENT_VARIANTS: { value: EventVariant; label: string; colors: [string, string] }[] = [
  { value: 'christmas',    label: '🎄 Christmas',     colors: ['#c41e3a', '#0a7c3e'] },
  { value: 'halloween',    label: '🎃 Halloween',     colors: ['#ff6b00', '#1a0030'] },
  { value: 'new_year',     label: '🎆 New Year',      colors: ['#FFD700', '#4ECDC4'] },
  { value: 'independence', label: '🇯🇲 Independence', colors: ['#FFD700', '#009B3A'] },
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
  standard:   { label: 'Free',       color: 'text-white/60',    bg: 'bg-white/5',        border: 'border-white/10' },
  early_bird: { label: 'Early Bird', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  alpha:      { label: 'Alpha',      color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20' },
  beta:       { label: 'Beta',       color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
  tester:     { label: 'Tester',     color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
  pro:        { label: 'ASSI+',      color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
  admin:      { label: 'Admin',      color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  sentinel:   { label: 'Sentinel',   color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
};

const PREMIUM_TIERS = new Set(['early_bird', 'alpha', 'beta', 'tester', 'pro', 'admin', 'sentinel']);

const GROUP_DEFAULT_VARIANT: Record<ThemeGroup, string> = {
  lavalamp: 'assi',
  space:    'stars',
  seasons:  'summer',
  events:   'christmas',
  subjects: 'mathematics',
  premium:  'cyberpunk',
  sentinel: 'sentinel',
};

export default function SettingsPage() {
  const { settings, update, isLoading } = useSettings();
  const { user } = useAuth();
  const {
    themeGroup, themeVariant, colorMode, isSentinel, isSyncing,
    applyTheme, setThemeVariant, setColorMode, setCustomPreset,
    visualIntensity, setVisualIntensity,
    timeAuto, setTimeAuto,
    seasonAuto, weatherAuto, setSeasonAuto, setWeatherAuto,
  } = useTheme();

  const [saved,         setSaved]         = useState(false);
  const [userMe,        setUserMe]        = useState<UserMe | null>(null);

  // Remember Me — persisted in localStorage
  const [rememberMe, setRememberMeState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  });

  function handleRememberMeToggle(val: boolean) {
    setRememberMeState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REMEMBER_ME_KEY, String(val));
    }
  }

  // Profile state
  const [username,      setUsername]      = useState('');
  const [email,         setEmail]         = useState('');
  const [phoneNumber,   setPhoneNumber]   = useState('');
  const [showPhone,     setShowPhone]     = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError,  setProfileError]  = useState<string | null>(null);
  const [profileSaved,  setProfileSaved]  = useState(false);

  // 2FA state
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaStep,    setTwoFaStep]    = useState<'idle' | 'verify' | 'disable'>('idle');
  const [twoFaQr,      setTwoFaQr]      = useState('');
  const [twoFaCode,    setTwoFaCode]    = useState('');
  const [twoFaError,   setTwoFaError]   = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  useEffect(() => {
    userApi.getMe().then(data => {
      if (data?.user) {
        setUserMe(data.user);
        setShowPhone(data.user.showPhone ?? false);
        setTwoFaEnabled(data.user.twoFactorEnabled ?? false);
      }
    }).catch(() => {});
  }, []);

  const tier     = user?.role === 'admin' ? 'admin' : (userMe?.tier ?? 'standard');
  const tierInfo = TIER_INFO[tier] ?? TIER_INFO.standard;
  const hasAssisPlus = PREMIUM_TIERS.has(tier) || isSentinel;
  const isAdmin      = user?.role === 'admin' || isSentinel;

  async function handleUpdate(patch: Partial<UserSettings>) {
    await update(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function handleGroupSelect(value: ThemeGroup) {
    applyTheme('custom', value, GROUP_DEFAULT_VARIANT[value] as any);
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

  async function handleEnable2FA() {
    setTwoFaLoading(true);
    setTwoFaError('');
    try {
      const data = await userApi.setup2FA();
      setTwoFaQr(data.qrDataUrl);
      setTwoFaStep('verify');
    } catch (err: any) {
      setTwoFaError(err?.message || 'Failed to start 2FA setup');
    } finally {
      setTwoFaLoading(false);
    }
  }

  async function handleVerify2FA() {
    if (twoFaCode.length !== 6) return;
    setTwoFaLoading(true);
    setTwoFaError('');
    try {
      await userApi.verify2FA(twoFaCode);
      setTwoFaEnabled(true);
      setTwoFaStep('idle');
      setTwoFaCode('');
      setTwoFaQr('');
    } catch (err: any) {
      setTwoFaError(err?.message || 'Invalid code');
      setTwoFaCode('');
    } finally {
      setTwoFaLoading(false);
    }
  }

  async function handleDisable2FA() {
    if (twoFaCode.length !== 6) return;
    setTwoFaLoading(true);
    setTwoFaError('');
    try {
      await userApi.disable2FA(twoFaCode);
      setTwoFaEnabled(false);
      setTwoFaStep('idle');
      setTwoFaCode('');
    } catch (err: any) {
      setTwoFaError(err?.message || 'Invalid code');
      setTwoFaCode('');
    } finally {
      setTwoFaLoading(false);
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
        <div className="flex items-center gap-2">
          {isSyncing && <Loader2 size={13} className="text-white/30 animate-spin" />}
          <AnimatedCheck visible={saved} />
        </div>
      </motion.div>

      {/* Tier badge */}
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
                {isAdmin
                  ? 'Full platform access — all themes unlocked'
                  : tier === 'standard'
                    ? 'Upgrade to ASSI+ for unlimited AI, more subjects & priority tutors'
                    : tier === 'early_bird'
                      ? 'Early bird — grandfathered pricing forever 🎉'
                      : tier === 'beta'
                        ? 'Beta tester — early access to new features'
                        : tier === 'tester'
                          ? 'Internal tester — full platform access'
                          : 'Full platform access'}
              </p>
            </div>
          </div>
          {tier === 'standard' ? (
            <button className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold transition flex-shrink-0">
              Upgrade
            </button>
          ) : (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${tierInfo.color} ${tierInfo.border} flex-shrink-0`}>
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

      {/* Streak */}
      <motion.div custom={4} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-4"
      >
        <SectionHeader icon={Flame} title="Streak" />
        <ToggleRow label="Daily login streak"
          description="Track consecutive login days (Reach 365 to earn ASSI+ for a full year)"
          value={settings.streakEnabled}
          onChange={(v) => handleUpdate({ streakEnabled: v })} />
        <ToggleRow label="Streak reminders"
          description="Get a reminder if you haven't logged in by evening"
          value={settings.streakNotifications}
          onChange={(v) => handleUpdate({ streakNotifications: v })} />
      </motion.div>

      {/* Session */}
      <motion.div custom={5} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-4"
      >
        <SectionHeader icon={ShieldCheck} title="Session" />
        <ToggleRow
          label="Remember Me"
          description="Stay logged in between browser sessions. Required for login streak tracking."
          value={rememberMe}
          onChange={handleRememberMeToggle}
        />
      </motion.div>

      {/* Appearance */}
      <motion.div custom={6} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-5"
      >
        <SectionHeader icon={Palette} title="Appearance" />
        <div>
          <p className="text-white/75 text-xs font-medium mb-3">UI Mode</p>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_MODES
              .filter(m => settings.themesEnabled || m.value !== 'custom')
              .map(({ value, label, icon: Icon, desc }) => {
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

        {/* Visual Intensity */}
        <div>
          <p className="text-white/75 text-xs font-medium mb-3">Visual Intensity</p>
          <div className="grid grid-cols-3 gap-2">
            {VISUAL_INTENSITY_OPTIONS.map(({ value, label, desc }) => {
              const active = visualIntensity === value;
              return (
                <button key={value} onClick={() => setVisualIntensity(value)}
                  className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-center transition-all ${
                    active
                      ? 'bg-white/15 border-white/30 text-white'
                      : 'bg-white/4 border-white/8 text-white/55 hover:text-white/80 hover:bg-white/8'
                  }`}
                >
                  <Layers size={15} className={active ? 'text-orange-400' : 'text-white/40'} />
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="text-[10px] leading-tight text-white/40 hidden sm:block">{desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {colorMode === 'custom' && settings.themesEnabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
              className="overflow-hidden space-y-4"
            >
              <div>
                <p className="text-white/75 text-xs font-medium mb-3">Theme Style</p>
                <div className="grid grid-cols-2 gap-2">
                  {THEME_GROUPS.map(({ value, label, icon: Icon, desc, plus }) => {
                    const active = themeGroup === value;
                    const locked = plus && !hasAssisPlus;
                    return (
                      <button key={value}
                        onClick={() => { if (!locked) handleGroupSelect(value); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                          active  ? 'border-white/30 bg-white/12' :
                          locked  ? 'border-white/5 bg-white/2 opacity-60 cursor-not-allowed' :
                          'border-white/8 bg-white/4 hover:bg-white/8'
                        }`}>
                        <Icon size={15} className={active ? 'text-orange-400' : locked ? 'text-white/25' : 'text-white/40'} />
                        <div className="text-left">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-sm font-medium ${active ? 'text-white' : locked ? 'text-white/35' : 'text-white/60'}`}>{label}</p>
                            {plus && isAdmin                    && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">ADMIN</span>}
                            {plus && !isAdmin && hasAssisPlus  && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-semibold">✓</span>}
                            {plus && !hasAssisPlus             && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-semibold">PLUS</span>}
                          </div>
                          <p className="text-[10px] text-white/30">{desc}</p>
                        </div>
                        {active && !locked && <Check size={12} className="ml-auto text-orange-400 flex-shrink-0" />}
                        {locked            && <Lock  size={11} className="ml-auto text-white/20 flex-shrink-0" />}
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

              {themeGroup === 'events' && (
                <>
                  <VariantGrid label="Jamaica & Holiday Events" items={EVENT_VARIANTS} cols={2}
                    active={themeVariant as string} onSelect={(v) => setThemeVariant(v as EventVariant)} />
                  <div className="glass-soft rounded-xl px-3 py-2.5 flex items-start gap-2">
                    <span className="text-orange-400 text-xs mt-0.5">✦</span>
                    <p className="text-white/40 text-xs leading-relaxed">
                      Events are also auto-detected by date — ASSI switches to the right theme automatically around each holiday.
                    </p>
                  </div>
                </>
              )}

              {themeGroup === 'subjects' && (
                <VariantGrid label="Subject Theme" items={SUBJECT_VARIANTS}
                  active={themeVariant as string} onSelect={(v) => setThemeVariant(v as SubjectVariant)} />
              )}

              {themeGroup === 'premium' && hasAssisPlus && (
                <div>
                  <p className="text-white/75 text-xs font-medium mb-3">
                    Premium Style
                    {isAdmin && <span className="ml-2 text-[10px] text-red-400 font-normal">(admin access)</span>}
                  </p>
                  <div className="space-y-2">
                    {PREMIUM_VARIANTS.map(({ value, label, colors, desc }) => {
                      const isActive = themeVariant === value;
                      return (
                        <button key={value} onClick={() => setThemeVariant(value as PremiumVariant)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all ${
                            isActive ? 'border-white/30 bg-white/12' : 'border-white/8 bg-white/4 hover:bg-white/8'
                          }`}>
                          <span className="w-8 h-8 rounded-xl flex-shrink-0 ring-1 ring-white/10"
                            style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }} />
                          <div className="text-left">
                            <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-white/65'}`}>{label}</p>
                            <p className="text-[10px] text-white/30">{desc}</p>
                          </div>
                          {isActive && <Check size={12} className="ml-auto text-orange-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-1 border-t border-white/8">
                <p className="text-white/75 text-xs font-medium pt-1">Time &amp; Environment</p>
                <ToggleRow
                  label="Time of day effects"
                  description="Darkens the background at night and warms it at sunrise and sunset"
                  value={timeAuto}
                  onChange={setTimeAuto}
                />
              </div>

              {settings.dynamicThemes && (
                <div className="space-y-3 pt-1 border-t border-white/8">
                  <p className="text-white/75 text-xs font-medium pt-1">Dynamic Themes</p>
                  <ToggleRow label="Season auto-switch"
                    description="Automatically match the theme to the current Caribbean season"
                    value={seasonAuto}
                    onChange={setSeasonAuto} />
                  <ToggleRow label="Weather overlay"
                    description="Adjust theme warmth based on local weather (requires location access)"
                    value={weatherAuto}
                    onChange={setWeatherAuto} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Language & Region */}
      <motion.div custom={6} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-4"
      >
        <SectionHeader icon={Globe} title="Language & Region" />
        <SelectRow label="Language" value={settings.language} options={LANGUAGES}
          onChange={(v) => handleUpdate({ language: v })} />
        <SelectRow label="Timezone" value={settings.timezone} options={TIMEZONES}
          onChange={(v) => handleUpdate({ timezone: v })} />
      </motion.div>

      {/* ASSI Assistant */}
      <motion.div custom={7} variants={fade} initial="initial" animate="animate"
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

      {/* Security */}
      <motion.div custom={8} variants={fade} initial="initial" animate="animate"
        className="panel rounded-3xl p-5 space-y-4"
      >
        <SectionHeader icon={ShieldCheck} title="Security" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-white text-sm font-medium">Two-factor authentication</p>
            <p className="text-white/55 text-xs mt-0.5">
              {twoFaEnabled
                ? 'Your account is protected with 2FA'
                : 'Add an extra layer of security to your account'}
            </p>
          </div>
          {twoFaEnabled ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
              Enabled
            </span>
          ) : (
            <button onClick={handleEnable2FA}
              disabled={twoFaLoading || twoFaStep !== 'idle'}
              className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15 disabled:opacity-40 transition flex-shrink-0">
              {twoFaLoading && twoFaStep === 'idle'
                ? <Loader2 size={12} className="animate-spin" />
                : 'Enable'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {twoFaStep === 'verify' && (
            <motion.div key="verify"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-3"
            >
              <p className="text-white/55 text-xs">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to confirm.
              </p>
              {twoFaQr && (
                <div className="flex justify-center py-1">
                  <img src={twoFaQr} alt="2FA QR Code" className="w-36 h-36 rounded-xl ring-1 ring-white/20 bg-white p-1.5" />
                </div>
              )}
              {twoFaError && <p className="text-red-400 text-xs">{twoFaError}</p>}
              <div className="flex gap-2">
                <input
                  type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                  autoFocus value={twoFaCode}
                  onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 glass-soft rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none text-center tracking-[0.4em] font-mono border border-white/10 focus:border-white/25 transition"
                />
                <button onClick={handleVerify2FA}
                  disabled={twoFaLoading || twoFaCode.length !== 6}
                  className="px-4 py-2.5 rounded-xl bg-white text-orange-600 font-semibold text-xs disabled:opacity-40 transition hover:bg-white/90 flex-shrink-0">
                  {twoFaLoading ? <Loader2 size={12} className="animate-spin" /> : 'Verify'}
                </button>
              </div>
              <button
                onClick={() => { setTwoFaStep('idle'); setTwoFaQr(''); setTwoFaCode(''); setTwoFaError(''); }}
                className="text-xs text-white/30 hover:text-white/60 transition">
                Cancel
              </button>
            </motion.div>
          )}

          {twoFaStep === 'disable' && (
            <motion.div key="disable"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-3"
            >
              <p className="text-white/55 text-xs">Enter your current 6-digit authenticator code to disable 2FA.</p>
              {twoFaError && <p className="text-red-400 text-xs">{twoFaError}</p>}
              <div className="flex gap-2">
                <input
                  type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                  autoFocus value={twoFaCode}
                  onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 glass-soft rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none text-center tracking-[0.4em] font-mono border border-white/10 focus:border-white/25 transition"
                />
                <button onClick={handleDisable2FA}
                  disabled={twoFaLoading || twoFaCode.length !== 6}
                  className="px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 disabled:opacity-40 transition hover:bg-red-500/30 flex-shrink-0">
                  {twoFaLoading ? <Loader2 size={12} className="animate-spin" /> : 'Disable'}
                </button>
              </div>
              <button
                onClick={() => { setTwoFaStep('idle'); setTwoFaCode(''); setTwoFaError(''); }}
                className="text-xs text-white/30 hover:text-white/60 transition">
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {twoFaEnabled && twoFaStep === 'idle' && (
          <button onClick={() => setTwoFaStep('disable')}
            className="text-xs text-red-400/50 hover:text-red-400 transition">
            Disable 2FA
          </button>
        )}
      </motion.div>

      {/* Privacy */}
      <motion.div custom={9} variants={fade} initial="initial" animate="animate"
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
      <motion.div custom={10} variants={fade} initial="initial" animate="animate"
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
          const isActive = active === value;
          return (
            <button key={value} onClick={() => onSelect(value)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                isActive ? 'border-white/30 bg-white/12' : 'border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/15'
              }`}>
              <span className="w-6 h-6 rounded-lg flex-shrink-0 ring-1 ring-white/10"
                style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }} />
              <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/65'}`}>{l}</span>
              {isActive && <Check size={12} className="ml-auto text-orange-400 flex-shrink-0" />}
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
