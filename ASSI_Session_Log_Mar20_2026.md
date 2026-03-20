# ASSI Platform — Session Log
**Date:** March 20, 2026  
**Session:** Build Day — Backend deployment → Frontend themes  
**Location:** Kingston, Jamaica 🇯🇲

---

## What We Built Today

### 1. Backend — Fixed & Live on Railway
- Resolved double-slash URL bug (`NEXT_PUBLIC_API_URL` had trailing slash)
- Added `trust proxy 1` for Railway's reverse proxy (fixes rate limiter warnings)
- Fixed settings route mount path (`/api/user/settings` not `/api/user`)
- Fixed `OPENAI_API_KEY` env var name (was `OPEN_AI_KEY` — hours of debugging)
- Added `GET /PUT /api/tutors/my-subjects` — tutor subject management with 3-subject free limit
- Cleaned `user.routes.ts` — removed `max_concurrent_chats` (premature)
- Added `teaching_philosophy` to tutors schema

### 2. Database Migrations (Supabase)
Added missing columns via `ALTER TABLE`:
```sql
-- user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS parental_consent_given BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'standard';

-- user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS assi_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS assi_position JSONB;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT false;

-- tutors
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS chat_mode TEXT;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS is_student_tutor BOOLEAN DEFAULT false;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS teaching_philosophy TEXT;

-- tutor_applications
ALTER TABLE tutor_applications ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT false;
ALTER TABLE tutor_applications ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMP;
ALTER TABLE tutor_applications ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE tutor_applications ADD COLUMN IF NOT EXISTS education_background TEXT;
ALTER TABLE tutor_applications ADD COLUMN IF NOT EXISTS teaching_experience TEXT;
ALTER TABLE tutor_applications ADD COLUMN IF NOT EXISTS why_tutor TEXT;
ALTER TABLE tutor_applications ADD COLUMN IF NOT EXISTS qualifications TEXT;
```

Populated subjects table with all 32 CSEC + 36 CAPE official subjects from cxc.org.

### 3. Prisma Schema Updated
`prisma/schema.prisma` now reflects all new columns. Railway auto-runs `prisma generate` on deploy.

### 4. Frontend — Profile Pages
- Replaced all `router.push('/profile/*/edit')` with modal state (`useState<Modal>`)
- `ProfileEditModal` — shared across student and tutor
- `ManageSubjectsModal` — CSEC/CAPE grouped, max 3 free, upgrade nudge
- `AvailabilityModal` — online/offline toggle against Redis presence
- No new pages created — everything stays on profile page

### 5. Settings — Fully Wired
- `SettingsContext` timing bug fixed (was fetching before auth resolved)
- Settings route mounted correctly at `/api/user/settings`
- All fields exposed: email notifications, push notifications, theme, language, timezone, ASSI enabled, reduce motion
- Account section: username/email/phone change via `PATCH /api/user/profile`
- ASSI+ tier card with upgrade prompt for free users
- Language & Region: Caribbean-first timezone list
- Privacy section

### 6. Theme System — Complete Rebuild

#### Theme Groups
| Group | Variants | Notes |
|-------|----------|-------|
| Lava Lamp | assi, midnight, forest, ocean, sunset, aurora, rose | Default |
| Space | stars, starfall, nebula, galaxy | Realistic parallax star field |
| Seasons | spring, summer, autumn, winter, dry, rainy | + event detection |
| Subjects | mathematics, sciences, languages, business, technology, arts, health | Floating symbols |
| Premium (ASSI+) | cyberpunk, ocean, lofi | Locked for free users |

#### Jamaica Event Calendar (auto-detected by date)
| Event | Dates | Effect |
|-------|-------|--------|
| Christmas | Dec 20–26 | Trees, ornaments, Santa silhouette, snow |
| Boxing Day/New Year | Dec 27–Jan 3 | Confetti, firework bursts |
| Valentine's | Feb 12–15 | Spring petals |
| Easter | Apr 10–20 | Spring petals |
| Emancipation Day | Jul 29–Aug 2 | 🇯🇲 Gold/black/green stars + ribbon confetti |
| Independence Day | Aug 3–8 | 🇯🇲 Same as above |
| Halloween | Oct 28–Nov 1 | Bats, pumpkins |

#### Space Theme — Realistic
- 3 parallax star layers (far/mid/near) with mouse tracking
- Realistic star color temperatures (blue-white, warm yellow, cool white)
- Near stars get glow halos
- Nebula: 5 volumetric blur layers at different depths
- Galaxy: rotating conic gradient + bright core
- Starfall: shooting stars with light trail gradient
- Grain overlay + vignette on all themes

#### Subject Symbols
- Mathematics: ∑ π ∫ √ ∞ ∂ floating at low opacity
- Sciences: floating symbols + rotating molecule clusters
- Languages: multilingual characters + speech bubbles
- Business: currency symbols + animated mini bar charts
- Technology: `</>` + binary strings + pulsing circuit traces
- Arts: musical notes + brush strokes
- Health: beating hearts + medical symbols

#### ASSI+ Premium Themes
- **Cyberpunk**: perspective neon grid + cyan/magenta glow + katakana digital rain
- **Ocean Depths**: caustic light rays + rising bubbles with specular highlight
- **Lo-fi Study**: desk lamp cone of amber light + floating dust motes

#### Dark/Light Mode
- **Dark**: `#080808` black, orange accent glow, grain, vignette
- **Light**: theme-aware per group — lava lamp = warm frosted glass, space = star chart navy, seasons = sunrise/paper-and-ink, subjects = subject-tinted surfaces
- All light mode panels get real `box-shadow` for premium feel
- Text fixed: dark mode near-white `#f8f8f8`, light mode crisp black `#0f0f0f`

#### Dynamic Time of Day
All themes auto-adjust every minute:
| Time | Overlay |
|------|---------|
| Dawn (5–7am) | Warm orange tint |
| Morning (7–10am) | Subtle warmth |
| Day (10am–2pm) | No overlay |
| Afternoon (2–5pm) | Light amber |
| Dusk (5–7pm) | Warm amber/red |
| Evening (7–10pm) | Purple tint |
| Night (10pm–1am) | Dark overlay |
| Midnight (1–5am) | Very dark |

---

## Files Changed Today

### Backend (`src/`)
- `app.ts` — trust proxy, settings route fix
- `routes/user.routes.ts` — removed max_concurrent_chats
- `routes/user/settings.routes.ts` — all ASSI fields enabled
- `routes/tutors.routes.ts` — added my-subjects GET/PUT
- `routes/ai/guest.ts` — new guest AI route
- `routes/ai/ai.index.ts` — guest route wired
- `prisma/schema.prisma` — all new columns

### Frontend (`components/` + `app/`)
- `components/shared/themes/ThemeProvider.tsx` — complete rebuild
- `components/shared/themes/AnimatedGradient.tsx` — premium + atmospheric layers
- `components/shared/themes/FloatingBlobs.tsx` — wires all effect systems
- `components/shared/themes/SeasonalEffects.tsx` — NEW, all seasonal/event effects
- `components/shared/themes/SubjectSymbols.tsx` — NEW, all 7 subject symbol sets
- `components/shared/themes/PremiumThemes.tsx` — NEW, cyberpunk/ocean/lofi
- `app/styles/globals.css` — light mode, text visibility, premium CSS vars
- `app/settings/page.tsx` — full settings page
- `app/profile/student/page.tsx` — modal system
- `app/profile/tutor/page.tsx` — modal system, all 3 modals
- `components/shared/ui/ManageSubjectsModal.tsx` — NEW
- `components/shared/ui/AvailabilityModal.tsx` — NEW
- `contexts/SettingsContext.tsx` — timing fix, all fields
- `components/AppShell.tsx` — guest ASSI launcher

---

## What's Next

### Immediate (before beta)
- [ ] Tutor application flow — fix premature submit bug
- [ ] Browse page — tutor discovery working
- [ ] Live chat flow — end-to-end test
- [ ] Wire `setSubjectOverride()` in live chat when subject selected
- [ ] Deploy frontend to Vercel
- [ ] Custom domain setup

### Soon
- [ ] ASSI+ subscription — Stripe integration (April target)
- [ ] `UserAiUsage` enforcement — cap free AI queries
- [ ] Session reviews — post-session rating flow
- [ ] Notifications — real-time bell working
- [ ] Admin dashboard — Sentinel AI connected

### Architecture (post-launch)
- [ ] Migrate role from `user_profiles` to `user_roles` table
- [ ] Claude API swap for guest + authenticated ASSI (replace OpenAI)
- [ ] Agent architecture — matching agent, assignment review agent
- [ ] PWA offline support — service worker for past papers
- [ ] Caribbean expansion prep — Trinidad, Barbados

---

## Status
**Backend:** ✅ Live on Railway  
**Database:** ✅ Supabase, all columns migrated  
**Auth:** ✅ Working  
**Settings:** ✅ Working  
**Profile editing:** ✅ Working  
**Themes:** ✅ Complete  
**Frontend:** 🔄 Local dev, needs Vercel deploy  
**Live chat:** 🔄 Built, needs end-to-end test  
**Subjects:** ✅ Populated (68 subjects)  

---

*ASSI Platform — Built from a bedroom in Kingston, Jamaica 🇯🇲*  
*"The quiet is over."*
