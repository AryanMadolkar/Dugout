# AI FPL Manager — Design Brief for Design Doc

> **Purpose of this document:** Provide Claude (or any designer) with full product, UX, and visual context to produce a comprehensive design system and screen specifications for a premium Fantasy Premier League decision app.

---

## 1. Product Summary

**Name:** AI FPL Manager  
**One-liner:** Upload a screenshot of your FPL squad → receive the highest-value move (transfers, captain, formation, chips) with plain-language reasoning.

**North star question the product must answer in under 10 seconds:**
> "Given my exact squad, budget, transfers, chips, and upcoming fixtures — what is the highest-value move I can make before the deadline?"

**Core principle (non-negotiable):**
```
Data → ML predictions → optimization → AI explanation
```
The LLM **explains** recommendations. It does **not** invent predictions. All numbers must trace to a model or optimizer output. Design should visually reinforce trust and traceability — not "magic AI vibes."

**Competitive differentiation:** We do not compete on stat database size. We compete on **decision quality**: understanding the user's exact squad, modeling uncertainty, optimizing the full action space, and explaining the best decision clearly.

---

## 2. Target Users

| Segment | Need | UX implication |
|---|---|---|
| Casual FPL players | Simple weekly answer | Action-first, minimal jargon |
| Serious managers | Analytical second opinion | Expose projections, risk, alternatives |
| Mini-league optimizers | Weekly edge | Deadline urgency, comparison |
| Advanced users | Scenarios, chip strategy | What-If, multi-GW planning (Pro) |

---

## 3. Core User Journey

1. **Upload** FPL team screenshot (PNG/JPG)
2. **Vision/OCR** detects squad: starting XI, bench, captain, vice, formation
3. **Confirm/correct** detected squad + bank, free transfers, chips
4. **System** pulls live FPL data, runs projections + optimizer
5. **Dashboard** shows: Team Rating, Best Move, Captain, Chip advice, Potential Picks, AI Verdict
6. **Explore** What-If scenarios (keep team, -4 hit, different captain, wildcard, specific transfer)
7. **Act** on recommendation before deadline

**Friction to eliminate:** Manual squad entry. Screenshot is the primary input. FPL team-ID sync is a future enhancement.

---

## 4. MVP Feature Scope (Design Must Cover)

### 4.1 Screenshot Squad Scanner
- Upload, drag-and-drop, camera/gallery
- Player + position detection with confidence scores
- Starting XI, bench, captain/vice, formation
- Manual correction UI (fast, forgiving)

### 4.2 Squad State
- Free transfers, bank balance, team value, available chips, current GW
- Confirmation step before recommendations run

### 4.3 Recommendation Dashboard (Hero Experience)
Primary output card:
```
YOUR BEST MOVE
Transfer: Player A → Player B
Captain: Player C | Vice: Player D
Formation: 3-4-3
Expected improvement: +6.4 points
Why: [1–2 sentences]
Risk: Medium — [specific reason]
Alternative strategy: [secondary option]
```

Dashboard also includes:
- **Team Rating** (0–100) with sub-ratings: Starting XI, Bench, Fixtures, Form, Expected Points, Balance, Rotation Risk
- **Biggest weakness** callout (e.g. "Midfield")
- **Projected GW points**
- **Chip recommendation** (use now vs save — never recommend chip just because available)
- **Potential Best Picks** (discovery, separate from personalized transfers)
- **AI Verdict** — one concise paragraph

### 4.4 Potential Best Picks (Discovery)
Ranked independently of user's squad. Categories:
- Must Have · Strong Pick · Differential · Budget Pick · Fixture Swing · Avoid

Each pick shows: rating, projected points (1/3/5 GW), ownership, price/value, reason. Already-owned players excluded from transfer opportunities.

### 4.5 What-If Scenarios (Pro-tier candidate)
Natural language or preset scenarios:
- Keep current team
- Take a -4
- Captain another player
- Wildcard
- Specific transfer

Compare expected outcomes over 1, 3, 5 gameweeks.

### 4.6 Supporting Views
- Squad (FPL-style pitch, player projections, fixture run)
- Analysis (player comparison, underlying stats, model confidence)
- Onboarding (first upload, explain value prop)

---

## 5. Information Architecture

```
/                     → Dashboard (Home)
/upload               → Screenshot upload & scan
/upload/confirm       → Squad confirmation & corrections  [TO DESIGN]
/squad                → Full squad view + pitch
/picks                → Potential Best Picks
/analysis             → Stats, fixtures, player comparison
/what-if              → Scenario comparison  [TO DESIGN]
/settings             → Account, notifications, risk profile  [FUTURE]
```

**Mobile-first.** Bottom tab navigation on mobile; top nav on desktop. Primary CTA: Upload/Scan squad.

Current implementation has: `/`, `/upload`, `/squad`, `/picks`, `/analysis`

---

## 6. UX Principles (From PRD — Treat as Requirements)

1. **Action-first, not dashboard-first** — Best Move above the fold
2. **Understandable in 10 seconds** — headline number + one clear action
3. **Reasoning without overwhelm** — progressive disclosure for detail
4. **Expose uncertainty/risk** — never hide rotation/injury risk behind confident copy
5. **Minimize manual data entry** — screenshot → confirm, not type 15 names
6. **FPL-native visual language** — pitch, positions, FDR, £ prices, chips — but **do not copy FPL proprietary branding**

---

## 7. Visual Direction & Reference Apps

### Aesthetic goal
**Premium sports app, not generic AI SaaS or "UI slop."**

Think editorial sports product: confident typography, dark surfaces, purposeful color, data as hero content.

### Reference apps (study these, don't clone)
| App | Borrow |
|---|---|
| **FotMob** | Match/fixture cards, bottom nav, live score density, dark mode polish |
| **Apple Sports** | Clean hierarchy, restrained color, large stat typography |
| **The Athletic** | Editorial headlines, premium dark reading experience |
| **ESPN** | Score strips, team badges, event timelines |
| **OneFootball** | Horizontal carousels, card-based discovery |
| **Sleeper / DraftKings** | Fantasy-native action cards, pick recommendations |

### Anti-patterns (explicitly avoid)
- Purple gradient "AI startup" aesthetic
- Generic shadcn/dashboard admin look
- Overwhelming stat tables as the primary view
- Chat-first UI (LLM is explanation layer, not the main interface)
- Copying FPL's exact green, logo, or layout
- Confidence without caveats ("Guaranteed captain!" etc.)
- Too many equal-weight cards competing for attention

---

## 8. Current Design Tokens (Implemented — Evolve, Don't Restart)

```css
/* Surfaces */
--bg-base: #080c10
--bg-surface: #0f1419
--bg-elevated: #161c24
--bg-glass: rgba(22, 28, 36, 0.72)

/* Accent */
--accent: #34d399        /* primary action, positive projection */
--accent-bright: #6ee7b7
--gold: #fbbf24          /* captain, premium highlights */

/* Text */
--text-primary: #f1f5f9
--text-secondary: #94a3b8
--text-muted: #64748b

/* Semantic */
--danger: #f87171        /* hard fixtures, high risk */
--warning: #fbbf24

/* Pitch */
--pitch gradient: #1e4d38 → #122a20
```

### Typography (currently Google Fonts)
- **Syne** — display headlines, section titles (weight 600–800)
- **DM Sans** — body, UI labels (400–700)
- **Barlow Condensed** — stats, scores, prices (tabular nums, 500–700)

### Effects in use
- Subtle film grain overlay
- Glass cards (blur + low-opacity borders)
- Gradient border on hero "Best Move" card
- Fade-up entrance animations (staggered)
- Circular progress ring for Team Rating

### Position colors
- GKP: amber
- DEF: blue
- MID: emerald
- FWD: rose/red

### FDR (Fixture Difficulty Rating)
- 1–2: green (easy)
- 3: amber (medium)
- 4–5: red (hard)

---

## 9. Key Components to Spec in Design Doc

| Component | Description |
|---|---|
| **AppShell** | Header + mobile bottom nav with elevated Scan button |
| **HeroStrip** | GW badge, deadline, projected points, team rating |
| **BestMoveCard** | Primary recommendation — transfer, captain, formation, chip, gain, reasoning, risk pill |
| **TeamRatingPanel** | 0–100 ring + sub-rating bars + weakness + AI verdict |
| **PitchView** | FPL pitch with player nodes, captain crown, vice badge, projected pts |
| **BenchRow** | Horizontal scroll bench players |
| **PotentialPicks** | Horizontal carousel cards with category badge + rating |
| **FixtureStrip** | GW fixtures with FDR badges per team |
| **UploadZone** | Drag-drop, preview, analyze CTA |
| **SquadConfirm** | Editable detected squad with confidence indicators [TO DESIGN] |
| **WhatIfPanel** | Scenario selector + side-by-side comparison [TO DESIGN] |
| **RiskBadge** | Low / Medium / High with color + detail text |
| **ChipBadge** | Wildcard, Free Hit, Bench Boost, Triple Captain states |
| **PlayerNode** | Pitch avatar with position ring, name, projection |
| **PickCard** | Discovery card with category, rating, ownership, reason |

---

## 10. Content & Copy Patterns

### Tone
- Confident but honest
- Sports analyst, not hype merchant
- Short sentences; numbers first

### Example AI Verdict
> "Your squad is strong overall, but midfield is the main lever. Palmer in over Saka adds +6.4 projected points this week."

### Example Risk copy
> "Medium risk — Palmer has some rotation uncertainty around midweek fixtures."

### Example Weakness
> "Weakness: Midfield"

### Labels to standardize
- "Your Best Move" (not "Recommendation" or "AI Suggestion")
- "Team Rating" (0–100)
- "Proj. Points" (projected GW points)
- "Potential Best Picks" (discovery, not "Transfers")
- "FDR" for fixture difficulty
- Chip names: Wildcard · Free Hit · Bench Boost · Triple Captain

---

## 11. States & Edge Cases to Design

| State | Requirement |
|---|---|
| Empty (no squad) | Strong upload CTA, explain value in one line |
| Scanning | Progress/skeleton with confidence building |
| Low OCR confidence | Highlight uncertain players for correction |
| API offline | Graceful demo/mock mode, no broken layouts |
| Deadline imminent | Urgency indicator (< 1 hour) without panic |
| No transfer recommended | "Hold" state with reasoning |
| Chip not worth using | "Save Wildcard" with future value estimate |
| Free vs Pro | Gate What-If, multi-GW, deep stats — keep basic rec free |
| Error | Inline, recoverable — never full-page dead ends |

---

## 12. Monetization (Affects UI)

| Tier | Includes |
|---|---|
| **Free** | Squad scan + basic weekly recommendation |
| **Pro** | Advanced projections, What-If, chip optimization, multi-GW planning, deeper stats |
| **Premium** | Weekly AI FPL briefing (future) |

Free tier is the acquisition loop. Design Pro upsells contextually (e.g. after viewing Best Move, tease What-If) — not aggressively blocking core value.

---

## 13. Technical Constraints for Design

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Icons:** Lucide React
- **Responsive:** Mobile-first; bottom nav < sm breakpoint; max content width ~1152px (max-w-6xl)
- **No custom illustration library yet** — use typography, color, and layout for premium feel
- **Performance:** Recommendations target < few seconds once data loaded; avoid heavy animation on low-end mobile
- **Accessibility:** WCAG AA contrast on dark backgrounds; touch targets ≥ 44px on mobile

---

## 14. What's Built vs What Needs Design

### Built (functional prototype — refine visually)
- Dashboard with mock recommendation data
- Pitch view with player nodes
- Team rating panel with ring + sub-bars
- Best Move card
- Potential picks carousel
- Fixture strip
- Upload page (preview only, no OCR yet)
- Mobile bottom navigation

### Needs full design spec
- Squad confirmation / correction flow (post-OCR)
- What-If comparison UI
- Onboarding (first-time user)
- Player detail drawer/modal
- Chip strategy explainer
- Pro paywall / upgrade moments
- Loading/skeleton states for all screens
- Empty states
- Error states
- Desktop layout refinements (currently mobile-leaning)
- Design system documentation (spacing scale, elevation, component variants)
- Light mode (optional — dark is primary)

---

## 15. Success Metrics (Design Should Support Measurement)

- Screenshot → recommendation completion rate
- Squad detection accuracy (correction rate per player)
- Weekly returning users
- Recommendations viewed per GW
- What-If engagement
- Time to understand primary recommendation (< 10 sec target)

---

## 16. Deliverables Requested from Design Doc

Please produce:

1. **Design principles** (refined from Section 6)
2. **Color system** — expand tokens, semantic mappings, dark (+ optional light)
3. **Typography scale** — mobile + desktop type ramp
4. **Spacing & layout grid**
5. **Component library spec** — all components in Section 9 with variants, states, anatomy
6. **Screen designs** — all routes in Section 5, mobile + desktop
7. **User flows** — annotated: upload → confirm → dashboard → what-if
8. **Motion guidelines** — when to animate, duration, easing
9. **Iconography & illustration direction**
10. **Accessibility checklist**
11. **FPL-specific patterns** — pitch, FDR, chips, price display, ownership %
12. **Pro/Free visual differentiation**

---

## 17. Sample Dashboard Layout (Wireframe Reference)

```
┌─────────────────────────────────────────────┐
│  [Logo]  FPL Manager          [Upload CTA]  │
├─────────────────────────────────────────────┤
│  GW1 · Deadline Fri 21 Aug · 67.4 proj pts  │
│  Team Rating 82/100                         │
│  "Your squad, decoded."                     │
├─────────────────────────────────────────────┤
│  ✦ YOUR BEST MOVE                           │
│  Saka → Palmer                    +6.4 pts  │
│  Captain: Haaland · Vice: Palmer · 3-4-3    │
│  Chip: Save Wildcard                        │
│  Why: [reasoning]                           │
│  [Medium risk — detail]                     │
├──────────────────┬──────────────────────────┤
│  PITCH VIEW      │  TEAM RATING RING        │
│  (Starting XI)   │  Weakness: Midfield      │
│                  │  Sub-rating bars         │
│  [bench row]     │  AI Verdict quote        │
│                  │  FIXTURES (FDR cards)    │
├──────────────────┴──────────────────────────┤
│  POTENTIAL BEST PICKS → [carousel cards]    │
└─────────────────────────────────────────────┘
│  [Home] [Squad] [SCAN] [Picks] [Stats]      │  ← mobile bottom nav
└─────────────────────────────────────────────┘
```

---

## 18. Open Design Questions (Designer Should Propose Answers)

1. Should the pitch be the hero on mobile, or Best Move card?
2. How do we show "Alternative strategy" without cluttering the primary recommendation?
3. What's the right density for Potential Picks vs personalized transfers?
4. How should confidence scores appear on OCR confirmation (per player)?
5. Desktop: single column editorial vs multi-column dashboard?
6. Should Team Rating use a ring, gauge, or score badge?
7. How to visualize multi-GW projections (sparkline? bar? table?)?
8. Chip recommendation: inline in Best Move card or separate module?

---

## 19. Brand Personality

| Is | Is not |
|---|---|
| Premium sports intelligence | Generic AI chatbot |
| Decisive | Wishy-washy |
| Data-backed | Hype-driven |
| Fast | Overwhelming |
| FPL-native | Generic fantasy |
| Trustworthy | Overconfident |

**Tagline options to explore:**
- "Your squad, decoded."
- "The highest-value move. Explained."
- "One screenshot. One answer."

---

*End of brief. Use this to produce a full design document with Figma-ready specifications.*
