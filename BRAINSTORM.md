# Brainstorm: Making "You Are A Sheep" Fun

## Context

The game is a 10-round YouTube comment guessing game. Players watch Shorts and must avoid clicking the most popular comment. It has a strong Soviet propaganda aesthetic but the core gameplay has issues:

- **Repetitive** — same mechanic 10 times, no variety
- **Feels like guessing** — no real skill development or strategy
- **Instant death is punishing** — fail on round 2 and you see almost nothing
- **No progression** — nothing carries between sessions, no reason to come back
- **Silent** — zero audio feedback
- **No social element** — ironic for a game about conformity
- **Unused code** — `BlindRanker` drag-and-drop component is fully built but disconnected

---

## Idea 1: Scoring System (Replace Binary Pass/Fail)

**The single highest-impact change.** Instead of "pick wrong = instant death," every round awards points based on HOW unpopular your choice is.

- Pick the least-liked comment → 100 points (3-option round) or 150 points (2-option round)
- Pick the middle comment → 50 points
- Pick the top comment (sheep choice) → 0 points + a **-50 conformity penalty**
- Game always runs all 10 rounds — no early termination

**Why this matters:** Transforms every round from a coin flip into a spectrum. Players develop strategies ("niche humor comments tend to have fewer likes"). Eliminates the frustrating instant-death that discourages experimentation. The conformity penalty still stings without cutting the session short.

**Backend:** Modify `evaluate_guess` in `get_shorts.py:301` to rank options by likes and compute a score based on where the player's pick falls. All the like-count data is already stored in `ROUND_CACHE`.

**Frontend:** Remove the `gameover` state from `App.tsx`. Always advance to the next round. Track cumulative score.

---

## Idea 2: Round Result Interstitial

After each round, show a brief (2-3 second, click-to-dismiss) overlay:
- **"+ 100 DISSIDENCE POINTS"** with a satisfying scale-up animation
- **"CONFORMITY DETECTED"** with red flash if they picked the sheep choice, or **"DISSENT REGISTERED"** with green if safe
- Running total score

This creates a rhythm: video → pick → feedback → video → pick → feedback. The current game has no feedback loop between rounds — you just silently advance.

**New component:** `RoundResult.tsx` using Framer Motion (already installed).

---

## Idea 3: Narrative Escalation

Between rounds, 1-2 sentence messages that create escalating tension based on round number and performance:

- Early rounds (good): *"The Algorithm has taken notice of your defiance."*
- Mid rounds (good): *"The Algorithm is adapting. It's learning your patterns."*
- Late rounds (good): *"They didn't expect you to get this far."*
- After sheep choice: *"The Algorithm smiles. You are predictable."*

Delivered via typewriter animation in the `RoundResult` interstitial. Stored as a simple data file of message pools. Makes the Soviet narrative framing actually do something instead of being set dressing.

---

## Idea 4: Confidence Betting

Before each round's comments are revealed, players bet on their confidence:

| Bet | Score Multiplier | Penalty if Sheep |
|-----|-----------------|-----------------|
| No Bet | 1x | 0 |
| Small | 1.5x | -25 |
| Big | 2x | -50 |
| All In | 3x | -100 |

**Why this works:** The core problem is that choosing between comments feels like guessing. Betting adds a meta-layer where your *confidence in your own judgment* is a meaningful decision, independent of whether your judgment is correct. Even if you can't reliably identify the top comment, you can learn to calibrate confidence — which is a real skill.

**Implementation:** Purely frontend. Show a brief betting screen after the video loads but before comments appear. The bet multiplier/penalty is applied to the backend's `roundScore` on the client side.

---

## Idea 5: Mixed Round Types (Activate BlindRanker)

Instead of 10 identical "pick a comment" rounds, mix in different round types:

- **Standard Dissident (6 rounds)** — current "avoid the top comment" with scoring
- **Ranking Rounds (2 rounds)** — use the **already-built** `BlindRanker` component. See 5 comments, drag to rank most→least popular. Score based on how many pairs you get in the correct relative order. Max 200 points for perfect ranking.
- **Speed Rounds (2 rounds)** — timer is halved, but max points are doubled (200). Pulsing red border, "SPEED ROUND" banner.

**Why this matters:** Breaks the monotony. Ranking rounds use a completely different skill (relative judgment vs. absolute avoidance). Speed rounds create adrenaline spikes. The `BlindRanker` component at `components/BlindRanker.tsx` is already fully functional with drag-and-drop — it just needs a timer and to be wired into `App.tsx`.

**Backend:** Add `roundType` field to the round config in `get_daily_dissident_path`. Add `evaluate_ranking` endpoint (pair-comparison scoring). The `submitRank` API function already exists in `api.ts:64`.

---

## Idea 6: Rank Titles & Session Rating

After completing all 10 rounds, award a "Dissidence Rating":

| Score % | Title |
|---------|-------|
| 90-100% | REVOLUTIONARY |
| 75-89% | DISSIDENT |
| 60-74% | FREE THINKER |
| 40-59% | SKEPTIC |
| 20-39% | FOLLOWER |
| 0-19% | SHEEP |

Displayed with a dramatic reveal animation on the `AfterActionReport` screen. Simple but gives players a concrete goal ("I got SKEPTIC, I want to hit DISSIDENT tomorrow").

**Implementation:** Purely frontend math in `AfterActionReport.tsx`.

---

## Idea 7: Persistent Stats (localStorage)

Track across sessions:
- Total games played, lifetime cumulative score, best single session score
- Current daily streak & longest streak
- Total sheep choices, total perfect rounds (picked least popular)
- Last 10 session rank titles

Display on the `DailyBriefing` screen: streak counter, lifetime rank, games played. Show "NEW BEST!" and streak updates on `AfterActionReport`.

**Implementation:** Custom `usePlayerStats` React hook reading/writing localStorage. No backend changes needed. `lucide-react` is already installed for streak/trophy icons.

---

## Idea 8: Achievement System

Unlockable achievements for specific feats:

| Achievement | Condition |
|-------------|-----------|
| INDUCTED | Complete first mission |
| TRUE DISSIDENT | Pick the least popular comment in a round |
| UNSHAKEABLE | Complete a session with zero sheep choices |
| PERSISTENT | 3-day streak |
| DEVOTED | 7-day streak |
| FOUR DIGITS | Score 1000+ in a single session |
| VANGUARD | Earn REVOLUTIONARY rank |
| FEARLESS | Win an ALL IN confidence bet |
| BAAA | Pick the sheep choice 5 times total (lifetime) |
| VETERAN | Complete 10 missions |

Toast notification slides in when unlocked. Achievement gallery accessible from briefing screen with unlocked ones lit up and locked ones showing "CLASSIFIED." Stored in localStorage alongside player stats.

---

## Idea 9: Social Stats ("The Herd")

After each session, show how you compare to other players today:
- *"47 agents deployed today"*
- *"Your score is in the top 15%"*
- Per-round sheep rate: *"73% of players fell for Round 4's sheep choice"*

**Why this is powerful:** Social proof creates competitive drive. Seeing "most people did worse" feels great. Seeing "most people did better" makes you want to try again. And for a game about conformity, showing actual conformity data is thematically perfect.

**Backend:** New `session_results` SQLite table. Two new endpoints: `POST /submit-session` (save results, return stats) and `GET /daily-stats`. Frontend submits session data on game completion.

---

## Idea 10: Sound Design (Web Audio API)

All sounds synthesized via Web Audio API — no audio files, no CORS, tiny bundle:

| Trigger | Sound |
|---------|-------|
| Each timer second | Short click tick |
| Timer < 5 seconds | Faster, louder metronome |
| Correct pick | Rising two-tone (400→600Hz) |
| Sheep pick | Low rumble + static burst |
| Bet confirmed | Mechanical ka-chunk |
| Achievement unlocked | C-E-G arpeggio fanfare |
| Rank reveal | Drum roll + cymbal |

The Soviet aesthetic benefits from harsh, synthetic sounds. Mute toggle persisted in localStorage.

**Implementation:** Custom `useSound` hook. Initialize AudioContext on first user click (browser requirement). Wire into existing components.

---

## Idea 11: Visual Juice

Polish using Framer Motion (already installed) and CSS:

- **Screen shake** on sheep choice (CSS keyframe, 300ms)
- **Glitch effect** on "CONFORMITY DETECTED" text (RGB split + horizontal offset)
- **Score counter** that animates counting up from 0 (odometer effect)
- **Progress tracker** at top of screen: 10 dots, green=safe, red=sheep, gray=upcoming
- **Timer urgency**: vignette darkening + comment buttons subtly vibrating when < 20% time remains

---

## Recommended Priority

If implementing incrementally:

1. **Scoring system** (Idea 1) — foundational, everything else builds on this
2. **Round result interstitial** (Idea 2) — makes scoring visible and satisfying
3. **Rank titles** (Idea 6) — gives scoring a goal
4. **Mixed round types** (Idea 5) — biggest variety payoff, reuses existing code
5. **Narrative escalation** (Idea 3) — low effort, high atmosphere
6. **Confidence betting** (Idea 4) — adds strategic depth
7. **Persistent stats** (Idea 7) — retention
8. **Visual juice** (Idea 11) — feel
9. **Sound design** (Idea 10) — feel
10. **Achievements** (Idea 8) — retention
11. **Social stats** (Idea 9) — requires backend work, do last

Ideas 1-3 together form the minimum viable improvement. Ideas 1-6 make the game genuinely engaging. All 11 make it polished and sticky.

---

## Key Files That Would Change

| File | What Changes |
|------|-------------|
| `backend/services/get_shorts.py` | Scoring in `evaluate_guess`, new `evaluate_ranking`, round types in `get_daily_dissident_path` |
| `backend/app.py` | New endpoints: `submit-rank`, `submit-session`, `daily-stats` |
| `backend/db.py` | New `session_results` table for social stats |
| `frontend/src/App.tsx` | Remove instant death, add score tracking, bet phase, round result interstitial, round type routing |
| `frontend/src/api.ts` | Updated interfaces, new API functions |
| `frontend/src/components/GuessingGame.tsx` | Speed round styling, timer urgency effects |
| `frontend/src/components/BlindRanker.tsx` | Add timer, dynamic slot count, wire into game |
| `frontend/src/components/AfterActionReport.tsx` | Per-round breakdown, rank titles, social stats, achievements |
| `frontend/src/components/DailyBriefing.tsx` | Player stats display, achievement gallery button |
| `frontend/src/index.css` | Shake, glitch, progress tracker CSS |
| **New files** | `RoundResult.tsx`, `ConfidenceBet.tsx`, `ProgressTracker.tsx`, `AchievementToast.tsx`, `AchievementGallery.tsx`, `usePlayerStats.ts`, `useSound.ts`, `narrativeMessages.ts`, `achievements.ts` |
