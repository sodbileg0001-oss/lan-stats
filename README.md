# LAN League

A responsive CS2 analytics website built from your real Excel statistics, with a dark, high-contrast interface and blue and red accents. Open `index.html` directly or deploy it on Vercel.

## Included

- Dashboard player picker, searchable directory, player profiles, and avatar customization.
- Match history, mobile scorecards, map pages, rankings, and opposing-team match comparisons.
- A dedicated **Duels** page with direct kill-versus-death comparisons, a duel leaderboard, and an interactive matchup grid from the original **Duel sheet**.
- Aim and utility analytics, charts, records, achievements, and match JSON downloads.

The snapshot contains **16 players, 11 matches, 110 player-match records, and 5 maps**. Its duel sheet has **132 directional records across 66 pairings**, covering **1,734 direct encounters**. Missing dates, scores, round counts, MVP awards, and clutches remain unavailable.

The website has no dataset-upload screen. New published matches are combined with previously saved browser records, and the published version takes precedence when explicit match IDs conflict. Profile customizations remain local to that browser. Decorative nickname differences between sheets are resolved only when a single match-profile name corresponds; original sheet names are preserved.

## Run locally

```sh
npm start
```

Open http://127.0.0.1:3000, or double-click `index.html`.

## Deploy to Vercel

Select the GitHub repository `sodbileg0001-oss/lan-stats` in Vercel. Choose **Other** as the framework. `vercel.json` supplies `npm run build` and output directory `dist`. Future pushes to the connected production branch trigger a deployment.

The build recreates `dist/` using `index.html`, `assets/`, and `Profile pictures/`. Original workbooks, developer utilities, tests, and the Excel-reading library are excluded from the published website.

## Profile pictures

Place JPG, PNG, or WebP files in `Profile pictures/` with filenames matching the player's workbook name, such as `Juugii.jpg`. The build matches filenames to player IDs and generates `assets/avatars.js`. Pictures appear throughout the site; players without one keep their initials. Custom avatars saved in a browser take precedence over these shared defaults. Original image files are preserved without modification.

## Update the published data

The original workbook stays on your computer and is ignored by Git. Regenerate the shared snapshot after updating it:

```sh
npm run data
# Or: node scripts/export-data.cjs "path/to/workbook.xlsx"
```

The developer utility reads **Database** and **Duel sheet** and writes `assets/data.js`. Commit and push that file to update the statistics. Original match columns and duel score strings are retained. Match groups without explicit IDs follow sequential map changes or repeated players; check the resulting records against the workbook.

SheetJS is used only by this local developer utility, not by the website.

## Statistics

- Career K/D = total kills / deaths. KDA = (kills + assists) / deaths. Original Excel ratios remain in raw records.
- HLTV 2.1 values are preserved; career ratings are arithmetic match means.
- ADR, KAST, and aim percentages are **unweighted match means**. Weighted career percentages require source denominators that are not present.
- Match win rate uses appearances with known results. Match head-to-head excludes teammates.
- **Duel win rate** = direct kills / (direct kills + direct deaths). Reciprocal scores are validated. Each encounter is counted once in the community total. Blank cells remain unavailable. Duels are all-time because the sheet has no match or date breakdown.
- Rankings require complete metric coverage and a configurable minimum match count. They remain provisional below 10 appearances. Consistency requires 3 rating samples; improvement requires 6.

## Validation

```sh
npm ci
npm test
npm run build
node tests/browser.cjs
```

Browser checks use Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`; set `CHROME_PATH` for another location. They cover pages at 360, 390, 768, and 1440 px, player selection, every leaderboard category, duel scores, grid selection, profile persistence, and removal of upload controls. Screenshots go to ignored `test-results/`.

## Files

`index.html` is the entry point. `assets/core.js` owns calculations and source parsing; `assets/app.js` owns interactions; `assets/styles.css` owns layout; `assets/theme.css` defines the dark graphite palette, readable text, and interaction states; `assets/data.js` contains the workbook snapshot. The local-only SheetJS library and license remain in `vendor/`. Fonts use Google Fonts with system fallbacks.

## Icons and motion

Map badges are bundled locally from [MurkyYT/cs2-map-icons](https://github.com/MurkyYT/cs2-map-icons). Ownership and source revision are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The interface includes staggered page entrances, animated chart strokes and comparison bars, card hover and press feedback, and player-preview transitions. Chart points show match values on hover, tap, or keyboard focus. Motion respects the browser's reduced-motion setting.
