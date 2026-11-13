# LAN League

A responsive CS2 analytics website built from your real Excel statistics, with a bright white, blue, and red interface. Open `index.html` directly or deploy it on Vercel.

## Included

- Dashboard player picker, searchable directory, player profiles, and avatar customization.
- Match history, mobile scorecards, map pages, rankings, and opposing-team match comparisons.
- A dedicated **Duels** page with direct kill-versus-death comparisons, a duel leaderboard, and an interactive matchup grid from the original **Duel sheet**.
- Aim and utility analytics, charts, records, achievements, and match JSON downloads.

The snapshot contains **12 players, 5 matches, 50 player-match records, and 4 maps**. Its duel sheet has **76 directional records across 38 pairings**, covering **749 direct encounters**. Missing dates, scores, round counts, MVP awards, and clutches remain unavailable.

The website has no dataset-upload screen. Previously saved browser match records remain supported; profile customizations remain local to that browser.

## Run locally

```sh
npm start
```

Open http://127.0.0.1:3000, or double-click `index.html`.

## Deploy to Vercel

Select the GitHub repository `sodbileg0001-oss/lan-stats` in Vercel. Choose **Other** as the framework. `vercel.json` supplies `npm run build` and output directory `dist`. Future pushes to the connected production branch trigger a deployment.

The build recreates `dist/` using only `index.html` and `assets/`. Original workbooks, developer utilities, tests, and the Excel-reading library are excluded from the published website.

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

`index.html` is the entry point. `assets/core.js` owns calculations and source parsing; `assets/app.js` owns interactions; `assets/styles.css` owns layout; `assets/theme.css` defines the white, blue, and red palette; `assets/data.js` contains the workbook snapshot. The local-only SheetJS library and license remain in `vendor/`. Fonts use Google Fonts with system fallbacks.
