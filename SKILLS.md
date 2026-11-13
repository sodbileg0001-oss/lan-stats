SKILLS.md
CS2 LAN League — Player Analytics Platform
1. Project Overview

Build a premium, mobile-first Counter-Strike 2 (CS2) statistics and analytics website for a private LAN gaming community of 13 players.

The application transforms Excel match statistics into a comprehensive competitive analytics platform.

The platform should feel like a combination of:

HLTV
FACEIT
Leetify
Professional esports analytics software

But specifically designed for our private group of 13 friends.

This is not a generic gaming dashboard.

The main objective is to create a personalized competitive environment where every player can:

View their individual CS2 statistics.
Track their improvement.
Compare themselves with other players.
Analyze their strengths and weaknesses.
Track rivalries.
Review match performances.
Discover their player archetype.
Compete for rankings and achievements.

The application must be designed for mobile phones first, while also providing a beautiful desktop experience.

2. Project Data
Current Community
Game: Counter-Strike 2
Players: 13
Initial match history: Approximately 4–5 matches
Primary data source: Excel (.xlsx)
Data type: Historical match and player performance statistics

The application must support a small initial dataset and scale as more matches are imported.

Never generate fake statistics to fill empty areas.

If data is insufficient, display: "Not enough match data yet."

Available Excel Statistics

The existing data includes:

Basic Match Statistics
Result
Kills
Deaths
Assists
Score
MVP
Map
Team assignments
Rounds won
Combat Performance
Damage
ADR
K/D
KDA
Open Kills
Trade Kills
Clutches
Time to Kill (seconds)
AWP Damage Time (seconds)
Accuracy %
HS % (Rifle)
HS % (Pistol)
First Bullet Accuracy %
Utility Performance
Flash Assists
Impactful Flash Assists
Enemies Flashed
Total Flash Duration (seconds)
Grenade Damage
Smokes Used
Enemies Damaged with Fire
Enemies Damaged with HE
Advanced Rating
KAST %
HLTV 2.1 Rating

Preserve all imported columns, even if some are not immediately displayed.

Do not assume every match contains every statistic.

3. Main Navigation

Create these primary sections:

Home
Players
Matches
Leaderboard
Head-to-Head
Analytics
Records
Import Data

On desktop, use a sidebar.

On mobile, use a compact bottom navigation bar with the most important sections:

Home
Players
Matches
Rankings
More

The More section should contain secondary navigation.

4. Home Dashboard

Create an overview of the entire CS2 LAN community.

Main Statistics

Display:

Total players
Total matches
Total rounds
Total kills
Total damage
Average match ADR
Highest-rated player
Highest K/D player
Most MVP awards
Featured Sections
Top Performers

Show the current best performers based on:

HLTV 2.1 Rating
ADR
K/D
KAST
Headshot percentage
Recent Matches

Show:

Map
Date
Teams
Result
Top performer
Match MVP
Player Spotlight

Feature one player with:

Avatar
Current ranking
Rating
ADR
Recent performance
Community Records

Display:

Highest ADR
Highest kills in one match
Highest HLTV rating
Highest K/D in one match
Most kills overall
Most MVPs
Best clutch performance

All records must come from imported data.

5. Individual Player Profiles

THIS IS THE MOST IMPORTANT PART OF THE APPLICATION.

Every one of the 13 players must have a dedicated profile page.

Each profile should feel like a personal CS2 statistics page.

5.1 Player Header

Display:

Player avatar
Player name
Nickname
Overall rank
Player rating
Total matches
Total wins
Total losses
Win rate

Allow each player to have a custom avatar and profile color.

5.2 Main Statistics

Show:

HLTV 2.1 Rating
K/D
KDA
ADR
KAST %
HS %
Total kills
Total deaths
Total assists
Total damage
MVP count
Opening kills
Trade kills
Clutches

Use clearly defined formulas and aggregation methods.

5.3 Advanced Aim Statistics

Show:

Overall accuracy
Rifle headshot percentage
Pistol headshot percentage
First bullet accuracy
Time to kill
AWP damage time

Help players understand their mechanical strengths.

Do not assume a higher time-to-kill or AWP damage time is better.

5.4 Utility Statistics

Show:

Flash assists
Impactful flash assists
Enemies flashed
Flash duration
Grenade damage
Smoke usage
Enemies damaged with fire
Enemies damaged with HE

Create a dedicated utility performance section.

5.5 Personalized Player Intelligence

Every profile should automatically generate a player analysis based on actual historical data.

Player Archetypes

Possible classifications:

Entry Fragger
AWPer
Rifler
Support
Clutch Specialist
Aim Specialist
Utility Expert
Aggressive Player
Consistent Player
All-Rounder

Archetypes must be calculated using available statistical evidence.

Avoid assigning a definitive role from only 4–5 matches.

Personal Strengths

Identify:

Highest-performing statistical categories
Best map
Strongest weapon category, if weapon-level data becomes available
Best recent performances
Above-average performance compared with the group
Personal Weaknesses

Identify:

Below-average statistical categories
Poor recent performances
Low consistency
Weak map performance
Areas with room for improvement

Use constructive language.

Personalized Insights

Examples:

"You have the highest average ADR among the 13 players."

"Your opening kill performance is above the community average."

"Your rifle headshot percentage is one of your strongest statistics."

"You have performed better on Mirage than on your other maps."

"Your KAST has improved across your latest matches."

Only generate insights when supported by sufficient data.

5.6 Personal Progress

Each player should have:

Rating history
ADR history
K/D history
KAST history
HS% history
Match-by-match performance
Recent form
Personal bests

Provide filters:

Last 5 matches
Last 10 matches
Last 20 matches
All time

If fewer matches exist, adapt the available options.

6. Match History and Match Details

Create a complete historical match database.

Each match should contain:

Unique match ID
Date
Map
Participating players
Team assignments
Team result
Rounds won
Individual statistics
Match Detail Page

Show:

Match Overview
Map
Winning team
Final score
Round difference
Match date
Team Comparison
Team kills
Team deaths
Team damage
Average ADR
Average rating
Total MVPs
Individual Scoreboard

Columns:

Player
Result
Kills
Deaths
Assists
K/D
ADR
KAST
HS%
HLTV 2.1

Highlight:

Top fragger
Highest ADR
Highest rating
Best support performance
Most impactful player

On mobile, use compact player cards instead of forcing a wide desktop table.

7. Head-to-Head and Rivalries

Create a dedicated player-versus-player system.

Allow users to select any two of the 13 players.

Display:

Comparison
Total matches together as opponents
Individual wins and losses
Win percentage
Average K/D
Average ADR
Average HLTV rating
Average kills
Average deaths
Average KAST
Headshot percentage
Rivalry History
Match-by-match results
Maps played
Performance comparisons
Best individual performances
Most recent encounters
Rivalry Insights

Examples:

Player A has a better record against Player B.
Player B has higher average ADR.
Player A has more kills across their head-to-head matches.

IMPORTANT:

Only calculate head-to-head results when the players were on opposing teams.

Playing together on the same team must not count as a direct win against each other.

8. Leaderboard System

Create an interactive leaderboard with multiple categories.

Main Ranking

Provide configurable ranking based on:

HLTV 2.1 Rating
ADR
K/D
KAST
HS%
Total kills
MVPs
Specialized Rankings
Best Overall Player
Best Aim
Best Entry Fragger
Best Support
Best AWPer (only if weapon-specific data exists)
Best Clutcher
Highest ADR
Highest KAST
Highest HS%
Most MVPs
Most Consistent
Most Improved
Ranking Rules
Clearly show the sample size.
Use minimum match requirements for rate-based leaderboards.
Allow all-time and recent rankings.
Do not rank players using missing or incomparable data.
Make the ranking methodology visible.

With only 4–5 matches, mark rankings as provisional.

9. Map Analytics

Create dedicated map statistics.

Maps should have their own pages.

For each map, calculate:

Matches played
Team wins
Team losses
Win rate
Average kills
Average deaths
Average ADR
Average rating
Average KAST
Best performer

Also display:

Best player on the map
Worst statistical performance
Player rankings for the map
Recent results

For individual players, display their map-specific performance.

Never make strong map specialization claims from insufficient sample sizes.

10. Advanced Performance Analytics

Create visual statistical analysis for the entire community.

Combat Analytics
Kills versus deaths
ADR distribution
K/D distribution
Headshot percentage distribution
Opening kill performance
Trade kill performance
Clutch performance
Utility Analytics
Flash assists
Impactful flashes
Enemies flashed
Grenade damage
HE damage
Fire damage
Performance Analytics
Rating trends
ADR trends
KAST trends
Player consistency
Match-to-match changes
Performance by map
Community Comparisons

Show each player's performance compared with:

Community average
Community median
Highest performer

This is particularly important for personalized profiles.

11. Records and Achievements

Create a dedicated records page.

Possible records:

Most kills in a match
Highest ADR in a match
Highest HLTV 2.1 Rating
Highest K/D
Highest KAST
Highest HS%
Most opening kills
Most trade kills
Most flash assists
Most grenade damage
Most clutches
Most MVPs
Achievements

Examples:

Aim Demon
Headshot Machine
Entry King
Clutch God
Utility Master
Damage Dealer
MVP Machine
Consistency King
Map Specialist
Comeback Player

Achievements must have transparent unlock criteria.

Separate career achievements from single-match awards.

12. Excel Import System

Excel is the primary source of truth.

Build a reliable import system for .xlsx files.

Import Process
Upload Excel file.
Read workbook and available sheets.
Detect headers.
Preview data.
Map Excel columns to application fields.
Validate rows.
Detect duplicates.
Check player names.
Check map names.
Confirm import.
Save raw match records.
Recalculate statistics.
Import Features
Support multiple sheets.
Support adding new matches.
Support updating existing records.
Detect duplicate matches.
Preserve original values.
Report invalid rows.
Show import history.
Allow data export.
Important Data Rules
Never overwrite historical records silently.
Preserve the original Excel data.
Normalize player names to consistent player IDs.
Keep raw data separate from calculated statistics.
Do not assume every Excel file uses identical column ordering.
Support blank or unavailable values.
Handle percentages and decimals correctly.
13. Database Design

Use a relational database.

Recommended entities:

Players
id
name
nickname
avatar
profile_color
created_at
Matches
id
date
map
match_type
total_rounds
created_at
source_file
Match Teams
id
match_id
team_name
result
rounds_won
Player Match Statistics
id
match_id
player_id
team_id
kills
deaths
assists
score
mvp
damage
adr
kast
open_kills
trade_kills
time_to_kill
awp_damage_time
accuracy
rifle_hs
pistol_hs
first_bullet_accuracy
flash_assists
impactful_flash_assists
enemies_flashed
flash_duration
grenade_damage
smokes_used
fire_enemies_damaged
he_enemies_damaged
kd
kda
hltv_rating
Import History
id
filename
import_date
imported_rows
failed_rows
status

Allow nullable statistics for unavailable values.

Use a unique match-player relationship to prevent duplicate individual records.

Store raw imported values where necessary for auditability.

14. Statistical Calculation Engine

Build a dedicated calculation layer.

Do not scatter statistical formulas throughout UI components.

Core Metrics

K/D:

Total kills / Total deaths

Handle zero deaths without division errors.

KDA:

(Kills + Assists) / Deaths

ADR:

Use imported ADR where available.

If calculating it from damage, use:

Total damage / Total rounds played

KAST:

Use a correctly weighted calculation from round-level counts when available.

Do not simply average percentages without considering their denominators.

Headshot Percentage:

Prefer the original source definition and denominator.

Accuracy:

Use the original source definition.

Win Rate:

Wins / Matches played × 100

Important Rules
Preserve official HLTV 2.1 Rating values from Excel.
Do not attempt to reconstruct HLTV 2.1 from incomplete aggregate statistics.
Distinguish weighted averages from simple averages.
Keep single-match statistics separate from career statistics.
Handle zero and missing values.
Never calculate statistics using incompatible denominators.
Store derived statistics separately from raw values.
15. Mobile-First UI / UX

MOBILE EXPERIENCE IS A CORE REQUIREMENT.

The website must feel native and comfortable on phones.

Mobile Navigation

Use bottom navigation:

Home
Players
Matches
Rankings
More

Keep navigation accessible without excessive scrolling.

Mobile Player Profile

Optimize the profile layout:

Player identity header.
Main rating card.
Key statistics grid.
Performance charts.
Strengths and weaknesses.
Recent matches.
Personal achievements.

Use compact, readable cards.

Avoid placing too many statistics in one row.

Mobile Match Cards

Each match card should show:

Map
Result
Date
Team score
Player performance highlights

Tap to view detailed statistics.

Mobile Leaderboard

Use a compact ranking list.

Each row should display:

Rank
Avatar
Player name
Rating
Main performance metric

Allow users to switch between ranking categories.

Responsive Rules
Design for 360px-wide phones and above.
Support tablets.
Support desktop screens.
Avoid horizontal scrolling wherever possible.
Use scrollable charts when appropriate.
Use touch-friendly controls.
Keep text readable.
Use consistent spacing.
Make filters easy to access.
Avoid oversized dashboard cards.
Avoid desktop-only interactions.
Performance
Lazy-load heavy charts.
Paginate long match histories.
Optimize images.
Avoid recalculating all player statistics on every render.
Cache derived statistics where appropriate.
16. Visual Design
Design Direction

Premium competitive esports analytics.

The design should feel:

Modern
Competitive
Dark
Minimal
Professional
Data-focused
Color Palette
Background: #090B10
Secondary: #11151D
Card: #171D28
Primary: #8B5CF6
Accent: #06B6D4
Positive: #22C55E
Negative: #EF4444
Main text: #F8FAFC
Muted text: #94A3B8

Use consistent visual meaning for colors.

Typography

Use a modern sans-serif font.

Large numbers should be visually prominent.

Use tabular numerals for statistical comparisons.

Charts

Use charts that work well on mobile:

Line charts for performance trends
Bar charts for player comparisons
Radar charts for player archetypes
Heatmaps for map performance
Progress bars for rankings

Avoid charts that become unreadable on small screens.

17. Technical Recommendations

Recommended stack:

Next.js
React
TypeScript
Tailwind CSS
PostgreSQL / Supabase
Prisma
Recharts
SheetJS (xlsx) for Excel imports

Use the existing stack if the project already has one.

Build reusable components.

Suggested architecture:

src/ app/ components/ navigation/ dashboard/ players/ matches/ leaderboard/ rivalry/ analytics/ charts/ ui/ services/ player/ match/ statistics/ leaderboard/ imports/ lib/ calculations/ validation/ formatting/ types/ hooks/ styles/

18. Development Roadmap

Build in phases.

Phase 1 — Foundation
Inspect existing project.
Understand Excel structure.
Design database.
Import 4–5 historical matches.
Validate all 13 players.
Build calculation engine.
Phase 2 — Core Website
Mobile navigation.
Home dashboard.
Player directory.
Individual player profiles.
Match history.
Match detail pages.
Phase 3 — Competitive Analytics
Leaderboards.
Head-to-head comparisons.
Map analytics.
Records.
Achievements.
Phase 4 — Personalized Intelligence
Player archetypes.
Strength and weakness analysis.
Recent form.
Performance trends.
Personalized insights.
Phase 5 — Polish
Responsive testing.
Mobile performance.
Animations.
Data validation.
Accessibility.
Error handling.
19. AI Coding Agent Instructions

Before implementing:

Inspect the existing repository.
Understand the current framework.
Examine all Excel sheets and headers.
Identify how match results and teams are represented.
Identify whether the statistics are per-player per-match or aggregate.
Identify the denominator and definition for each percentage.
Build a proper data model.
Validate imported statistics against the original Excel files.

During development:

Never invent data.
Never hardcode the 13 players into components.
Use database-driven player profiles.
Do not assume all metrics are available for every match.
Do not confuse team results with individual results.
Preserve original HLTV ratings.
Do not invent player roles.
Show sample sizes alongside statistics.
Clearly distinguish preliminary insights from reliable trends.
Make every page mobile-friendly.

After development:

Test with the original Excel data.
Verify calculations.
Test duplicate imports.
Test missing values.
Test every profile.
Test every mobile screen size.
Ensure that adding a new match automatically updates relevant statistics.
20. Final Product Vision

Create the ultimate private CS2 LAN statistics platform for our 13-player community.

Every player should have their own competitive identity.

Every match should contribute to the historical record.

Every statistic should have a clear definition.

Every profile should reveal something interesting about its player.

The experience should make friends want to:

Check their rankings.
Compare their performance.
Challenge their rivals.
Improve their statistics.
Break community records.
Return after every LAN session to see how the rankings changed.

Core philosophy:

"13 Players. One Lobby. Endless Rivalries. Every Match Counts."

Build a platform that makes even a small private CS2 community feel like a professional esports league.