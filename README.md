# LAN League

A responsive, static CS2 analytics website built from your real Excel match data. Open `index.html` directly or deploy it on Vercel. No backend credentials or framework setup required.

## Included

- Dashboard, searchable player directory, individual profiles and avatar customization.
- Match history, mobile scorecards, map pages, filtered rankings, opposing-team head-to-head comparisons.
- Aim and utility analytics, performance charts, single-match records and transparent achievements.
- Excel sheet selection, column mapping, percentage encoding selection, validation, duplicate checks, explicit replacement review, original-file preservation, and data exports.

The supplied workbook contains **12 named players, 5 matches, 50 player-match records, and 4 maps**. The project brief describes a 13-player community; no thirteenth player is invented. Dates, complete scores, round counts, MVP awards, and clutches are absent from the Database sheet and remain unavailable. The original `.xlsx` stays on your computer and is ignored by Git; the website contains the extracted match records, including original columns.

## Run locally

```sh
npm start
```

Open http://127.0.0.1:3000. Alternatively, double-click `index.html`. Excel parsing uses a worker when served over HTTP and a local fallback when opened as a file.

## Deploy to Vercel

1. Push this project to `https://github.com/sodbileg0001-oss/lan-stats`.
2. In Vercel, choose **Add New → Project** and import `lan-stats`.
3. Use **Other** as the framework. `vercel.json` supplies the build command (`npm run build`) and output directory (`dist`).
4. Click **Deploy**. Future commits to the connected production branch trigger another deployment.

The build copies only the website and its Excel reader to `dist/`. Source workbooks, tests, and documentation are not published as web assets. See [Vercel Git deployments](https://vercel.com/docs/git) and [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json).

## Update shared match data

Uploaded workbooks and profile customizations are **local to that browser**, saved with localStorage and IndexedDB. This static version has no shared database, accounts, or server-side import endpoint.

To update everyone's stats, import and review a workbook in **Import data**, then choose **Website data file**. Replace `assets/data.js` with that download, commit, and push. Vercel redeploys the shared snapshot. The JSON export includes raw columns and an audit log of replaced matches.

To regenerate the initial snapshot from your local workbook:

```sh
npm run data
# Or: node scripts/export-data.cjs "path/to/workbook.xlsx"
```

The command expects a `Database` sheet in the supplied format. Other formats can be mapped in the website import screen. Use a unique **Match ID** column for future matches. Without it, groups are inferred from sequential map changes or repeated players; review boundaries before confirming. Fingerprints prevent identical match data from being imported twice. Revised matches with an explicit matching ID require the replacement checkbox; previous records are retained in the audit log. Without explicit IDs, a revised record can appear as a new match, so review carefully.

## Statistics

- Career K/D = total kills / total deaths; KDA = (kills + assists) / deaths. Original Excel ratio values remain in raw records.
- HLTV 2.1 values are preserved; aggregate ratings are arithmetic match means.
- ADR, KAST, accuracy, and aim percentages are explicitly **unweighted match means**. Weighted career percentages cannot be computed without source denominators.
- Win rate uses matches with known results. Head-to-head excludes teammates.
- Ranking metrics require complete coverage and a configurable minimum match count. Rankings are provisional below 10 appearances. Missing MVP/clutch/weapon information does not become a ranking.
- Consistency is rating standard deviation (at least 3 samples); improvement compares last 3 with first 3 (at least 6).

## Validation

```sh
npm ci
npm test
npm run build
node tests/browser.cjs
```

Browser checks use an existing Chrome installation at `C:/Program Files/Google/Chrome/Application/chrome.exe`. Set `CHROME_PATH` for another location. They exercise all pages and player profiles at 360, 390, 768, and 1440 px, plus search, customization persistence, and duplicate imports. Screenshots are saved in ignored `test-results/`.

## Files

`index.html` is the entry point. `assets/core.js` owns parsing and calculations; `assets/app.js` owns rendering and interactions; `assets/styles.css` owns responsive styling; `assets/data.js` contains the bundled match snapshot. SheetJS CE 0.20.3 is vendored from its [official distribution](https://docs.sheetjs.com/docs/getting-started/installation/standalone/); its license is included in `vendor/`. Fonts load from Google Fonts with system fallbacks.
