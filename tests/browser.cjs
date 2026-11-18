const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const context = { window: {} }; vm.runInNewContext(fs.readFileSync('assets/data.js', 'utf8'), context);
vm.runInNewContext(fs.readFileSync('assets/avatars.js', 'utf8'), context);
const seed = JSON.parse(JSON.stringify(context.window.LAN_DATA));
const sharedAvatars = JSON.parse(JSON.stringify(context.window.LAN_AVATARS));
const C = require('../assets/core.js');
const W = require('../assets/workbook.js');
const X = require('../vendor/xlsx.full.min.js');
function expectedPlayerMaps(id, matches = seed.matches) {
  const rows = matches.flatMap(m => m.rows.filter(r => r.playerId === id));
  const sum = (rows, key) => { const values = rows.map(r => r[key]).filter(Number.isFinite); return values.length ? values.reduce((a, b) => a + b, 0) : null; };
  const mean = (rows, key) => { const values = rows.map(r => r[key]).filter(Number.isFinite); return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; };
  const format = (n, digits = 0) => n === Infinity ? '∞' : n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const ratio = (a, b) => a == null || b == null || (!a && !b) ? null : b ? a / b : Infinity;
  const percent = n => n == null ? '—' : format(n, 1) + '%';
  return [...new Set(rows.map(r => r.map))].sort().map(map => {
    const group = rows.filter(r => r.map === map), wins = group.filter(r => r.result === 'WIN').length;
    const known = group.filter(r => ['WIN', 'LOSS', 'DRAW'].includes(r.result)).length;
    const kills = sum(group, 'kills'), deaths = sum(group, 'deaths'), assists = sum(group, 'assists');
    return { map, metrics: {
      matches: String(group.length), wins: String(wins), losses: String(group.filter(r => r.result === 'LOSS').length), draws: String(group.filter(r => r.result === 'DRAW').length),
      winRate: percent(known ? wins / known * 100 : null), kd: format(ratio(kills, deaths), 2), kda: format(ratio(kills == null || assists == null ? null : kills + assists, deaths), 2),
      adr: format(mean(group, 'adr'), 1), rating: format(mean(group, 'rating'), 2), kast: percent(mean(group, 'kast')), rifleHs: percent(mean(group, 'rifleHs')),
      kills: format(kills), deaths: format(deaths), assists: format(assists)
    } };
  });
}
async function checkPlayerMaps(page, id, matches = seed.matches) {
  const actual = await page.locator('.profile-map-card').evaluateAll(cards => cards.map(card => ({ map: card.dataset.map, metrics: Object.fromEntries([...card.querySelectorAll('[data-map-stat]')].map(el => [el.dataset.mapStat, el.textContent.trim()])) })).sort((a, b) => a.map < b.map ? -1 : a.map > b.map ? 1 : 0));
  assert.deepEqual(actual, expectedPlayerMaps(id, matches), 'Player map totals or percentages disagree with source rows');
  assert.equal(await page.locator('main .match-row').count(), 0, 'Profile statistics should be grouped by map');
}
const server = spawn(process.execPath, ['scripts/serve.cjs'], { stdio: 'pipe' });
const ready = new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => { if (code) reject(new Error('Preview server exited: ' + code)); }); });
let browser;
(async () => {
  try {
    await ready;
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**', r => r.abort());
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'dark');
    const contrast = await page.evaluate(() => {
      const vars = getComputedStyle(document.documentElement);
      const luminance = hex => {
        const rgb = hex.trim().replace('#', '').match(/.{2}/g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
      };
      const a = luminance(vars.getPropertyValue('--muted')), b = luminance(vars.getPropertyValue('--panel'));
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    });
    assert.ok(contrast >= 4.5, 'Secondary text must have readable contrast on cards');
    fs.mkdirSync('test-results', { recursive: true });
    for (const [id, src] of Object.entries(sharedAvatars)) {
      const picture = page.locator('.player-choice[data-id="' + id + '"] .avatar img');
      assert.equal(await picture.getAttribute('src'), src);
      await picture.scrollIntoViewIfNeeded();
      await picture.evaluate(img => img.decode());
      assert.ok(await picture.evaluate(img => img.naturalWidth > 0), 'Shared player picture failed to load');
    }
    const playerIds = [...new Set(seed.matches.flatMap(m => m.rows.map(r => r.playerId)))];
    const rankedPlayers = C.rank(C.players(seed.matches), 'rating', 2).length;
    const duelPlayers = C.duelStandings(seed.duels).length;
    const recentMatches = seed.matches.slice(-4);
    const recentIconCount = recentMatches.filter(m => fs.existsSync('assets/map-icons/de_' + C.key(m.map).replace(/^de_/, '').replace(/\s+/g, '') + '.png')).length;
    const routes = ['home', 'players', 'matches', 'leaderboard', 'rivalries', 'analytics', 'records', 'duels', 'import', 'more', ...playerIds.map(id => 'player/' + id), ...seed.matches.map(m => 'match/' + m.id), ...[...new Set(seed.matches.map(m => m.map))].map(m => 'map/' + encodeURIComponent(m))];
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const hash of routes) {
        await page.evaluate(h => location.hash = h, hash);
        await page.waitForTimeout(25);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        assert.equal(overflow, false, `Horizontal overflow: ${hash} at ${width}px`);
        assert.ok(await page.locator('main h1').count(), `Missing heading: ${hash}`);
        if (hash.startsWith('player/')) await checkPlayerMaps(page, hash.slice(7));
        if (hash.startsWith('player/') && sharedAvatars[hash.slice(7)]) {
          const picture = page.locator('.profile-hero .avatar img');
          assert.equal(await picture.getAttribute('src'), sharedAvatars[hash.slice(7)]);
          await picture.scrollIntoViewIfNeeded();
          await picture.evaluate(img => img.decode());
        }
        if (hash === 'leaderboard') {
          assert.ok(await page.locator('.leaderboard .table').isVisible(), `Leaderboard is hidden at ${width}px`);
          assert.equal(await page.locator('.leaderboard tbody tr').count(), C.rank(C.players(seed.matches), 'rating', 2).length);
          assert.equal(await page.locator('.leaderboard').evaluate(el => Boolean(el.closest('select'))), false, 'Rankings must not be nested inside a filter dropdown');
          assert.ok(await page.getByRole('button', { name: 'Methodology', exact: true }).isVisible());
        }
      }
      await page.evaluate(() => location.hash = 'home'); await page.waitForTimeout(50);
      const recent = page.locator('.panel').filter({ has: page.getByRole('heading', { name: 'Recent matches', exact: true }) });
      await recent.scrollIntoViewIfNeeded();
      await page.waitForFunction(count => {
        const images = [...document.querySelectorAll('.match-row .map-badge img')];
        return images.length === count && images.every(img => img.complete && img.naturalWidth > 0);
      }, recentIconCount);
      assert.equal(await recent.locator('.map-badge img').count(), recentIconCount);
      assert.equal(await recent.locator('.map-thumb:not(.map-badge)').count(), recentMatches.length - recentIconCount);
      for (const src of await recent.locator('.map-badge img').evaluateAll(images => images.map(img => img.getAttribute('src')))) assert.ok(src.startsWith('assets/map-icons/de_'));
      assert.equal(await page.getByRole('group', { name: 'Choose a player', exact: true }).getByRole('button').count(), playerIds.length);
      for (const id of playerIds) {
        const choice = page.locator('.player-choice[data-id="' + id + '"]');
        await choice.click();
        assert.equal(await choice.getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('.player-choice[aria-pressed="true"]').count(), 1);
        assert.equal(await page.locator('.hero-profile-link').getAttribute('href'), '#player/' + id);
        const name = seed.matches.flatMap(m => m.rows).find(r => r.playerId === id).player;
        assert.equal(await page.locator('.hero-player-name').textContent(), name);
      }
      const keyboardChoice = page.locator('.player-choice').first();
      await keyboardChoice.focus(); await keyboardChoice.press('Enter');
      const selectedId = await keyboardChoice.getAttribute('data-id');
      await page.locator('.hero-profile-link').click();
      await page.waitForURL('**/#player/' + selectedId);
      assert.equal(await page.locator('.profile-name').textContent(), seed.matches.flatMap(m => m.rows).find(r => r.playerId === selectedId).player);
      await page.evaluate(() => location.hash = 'home');
      await page.waitForSelector('.player-choice[data-id="' + selectedId + '"][aria-pressed="true"]');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, 'Player picker overflows at ' + width + 'px');
      if (width === 360 || width === 1440) {
        await page.screenshot({ path: `test-results/dashboard-${width}.png`, fullPage: true, animations: 'disabled' });
        await page.locator('.player-picker').screenshot({ path: `test-results/player-picker-${width}.png`, animations: 'disabled' });
        await page.evaluate(id => location.hash = 'player/' + id, playerIds[0]);
        await page.waitForSelector('.profile-map-card');
        await page.locator('.profile-map-panel').screenshot({ path: `test-results/profile-maps-${width}.png`, animations: 'disabled' });
      }
    }
    const recentPlayer = seed.matches.at(-1).rows[0].playerId;
    await page.evaluate(id => location.hash = 'player/' + id, recentPlayer);
    await page.waitForSelector('.profile-map-card');
    await page.locator('#window-filter').selectOption('5');
    await checkPlayerMaps(page, recentPlayer, seed.matches.slice(-5));
    await page.getByRole('button', { name: 'Win percentage', exact: true }).click();
    const comparison = page.locator('.profile-map-comparison');
    const expectedPercentages = expectedPlayerMaps(recentPlayer, seed.matches.slice(-5));
    for (const item of expectedPercentages.filter(item => item.metrics.winRate !== '—')) {
      const bar = comparison.locator('.bars>div').filter({ has: page.getByText(item.map, { exact: true }) });
      assert.equal(await bar.locator('.bar-label b').textContent(), item.metrics.winRate);
      assert.ok(Math.abs(await bar.locator('.bar-fill').evaluate(el => Number.parseFloat(el.style.width)) - Number.parseFloat(item.metrics.winRate)) < .1, 'Win percentage bars must use a 0–100 scale');
    }
    await page.locator('#window-filter').selectOption('0');
    await checkPlayerMaps(page, recentPlayer);
    const mapEdgeData = structuredClone(seed), edgePlayer = seed.matches[0].rows[0].playerId;
    mapEdgeData.matches = [0, 1, 2].map(index => {
      const match = structuredClone(seed.matches[0]);
      match.id = 'map-edge-case-' + index; match.map = 'Nuke'; match.order = index + 1;
      const team = match.rows.find(r => r.playerId === edgePlayer).team;
      match.teams.forEach(t => { t.result = index === 2 ? null : index === 1 ? 'DRAW' : t.name === team ? 'WIN' : 'LOSS'; });
      match.rows.forEach(row => {
        row.map = 'Nuke'; row.raw.Map = 'Nuke'; row.result = match.teams.find(t => t.name === row.team).result;
        if (row.playerId === edgePlayer) { row.deaths = 0; row.adr = null; row.raw.Deaths = 0; row.raw.ADR = null; }
      });
      return match;
    });
    mapEdgeData.duels = [];
    const mapEdgePage = await browser.newPage();
    await mapEdgePage.route('https://fonts.googleapis.com/**', r => r.abort());
    await mapEdgePage.route('**/assets/data.js*', r => r.fulfill({ contentType: 'text/javascript', body: W.serialize(mapEdgeData) }));
    await mapEdgePage.goto('http://127.0.0.1:3000/#player/' + edgePlayer);
    await mapEdgePage.waitForSelector('.profile-map-card');
    await checkPlayerMaps(mapEdgePage, edgePlayer, mapEdgeData.matches);
    assert.equal(await mapEdgePage.locator('[data-map-stat="winRate"]').textContent(), '50.0%');
    assert.equal(await mapEdgePage.locator('[data-map-stat="kd"]').textContent(), '∞');
    assert.equal(await mapEdgePage.locator('[data-map-stat="adr"]').textContent(), '—');
    assert.ok((await mapEdgePage.locator('.profile-map-result-note').textContent()).includes('1 unavailable'));
    await mapEdgePage.close();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => location.hash = 'leaderboard');
    const categories = await page.locator('#ranking-metric option').evaluateAll(options => options.map(o => o.value));
    for (const category of categories) {
      await page.locator('#ranking-metric').selectOption(category);
      const count = C.rank(C.players(seed.matches), category, 2).length;
      assert.ok(await page.locator('.leaderboard').isVisible(), `Category ${category} is hidden`);
      if (count) {
        assert.ok(await page.locator('.leaderboard .table').isVisible(), `Table is hidden for ${category}`);
        assert.equal(await page.locator('.leaderboard tbody tr').count(), count);
      } else {
        assert.ok(await page.locator('.leaderboard .empty').isVisible(), `Missing-data explanation is hidden for ${category}`);
      }
    }
    await page.locator('#ranking-metric').selectOption('rating');
    await page.locator('#ranking-minimum').selectOption('10');
    if (C.rank(C.players(seed.matches), 'rating', 10).length) assert.ok(await page.locator('.leaderboard .table').isVisible());
    else assert.ok(await page.locator('.leaderboard .empty').isVisible(), 'High minimum must show its empty-state explanation');
    await page.locator('#ranking-minimum').selectOption('2');
    assert.equal(await page.locator('.leaderboard tbody tr').count(), rankedPlayers);
    assert.ok(await page.locator('.leaderboard .table').isVisible());
    await page.screenshot({ path: 'test-results/leaderboard-fixed-mobile.png', fullPage: true, animations: 'disabled' });
    await page.evaluate(() => location.hash = 'players');
    await page.locator('#player-search').fill('Juugii'); assert.equal(await page.locator('.player-card').count(), 1);
    await page.locator('.player-card').click(); await page.getByRole('button', { name: 'Customize profile', exact: true }).last().click();
    await page.locator('#profile-nickname').fill('Local test nickname'); await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    assert.equal(await page.locator('.profile-name').textContent(), 'Local test nickname');
    await page.reload(); assert.equal(await page.locator('.profile-name').textContent(), 'Local test nickname');
    if (sharedAvatars[C.playerId('Juugii')]) assert.equal(await page.locator('.profile-hero .avatar img').getAttribute('src'), sharedAvatars[C.playerId('Juugii')]);
    await page.evaluate(() => { localStorage.removeItem('lan-league-profiles-v1'); location.hash = 'duels'; }); await page.reload();
    assert.equal(await page.locator('.duel-standings tbody tr').count(), duelPlayers);
    assert.equal(await page.locator('.duel-cell').count(), seed.duels.length);
    const juugii = C.playerId('Juugii'), tushgee = C.playerId('Tushgee');
    const pair = seed.duels.find(r => r.playerId === juugii && r.opponentId === tushgee);
    await page.locator('#duel-a').selectOption(juugii); await page.locator('#duel-b').selectOption(tushgee);
    assert.deepEqual(await page.locator('.duel-contender strong').allTextContents(), [String(pair.kills), String(pair.deaths)]);
    const missingOpponent = playerIds.find(id => id !== juugii && !seed.duels.some(r => r.playerId === juugii && r.opponentId === id));
    assert.ok(missingOpponent, 'The workbook has an unrecorded pairing for the empty-state check');
    await page.locator('#duel-b').selectOption(missingOpponent);
    assert.ok(await page.getByText('No recorded duels for this pair.', { exact: true }).isVisible());
    await page.locator('.duel-cell[data-player="' + tushgee + '"][data-opponent="' + juugii + '"]').click();
    assert.deepEqual(await page.locator('.duel-contender strong').allTextContents(), [String(pair.deaths), String(pair.kills)]);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(100);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.screenshot({ path: 'test-results/duels-1440.png', fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/duels-390.png', fullPage: true, animations: 'disabled' });
    assert.ok(await page.locator('a[href="#import"]').count());
    await page.evaluate(() => location.hash = 'import');
    await page.waitForSelector('#excel-file');
    assert.ok(await page.getByRole('heading', { name: 'Import Excel', exact: true }).isVisible());
    await page.evaluate(() => location.hash = 'home');
    // An older browser snapshot must not hide newly published workbook matches.
    await page.evaluate(snapshot => localStorage.setItem('lan-league-data-v1', JSON.stringify({ version: 1, matches: snapshot.matches.slice(0, -1) })), seed);
    await page.reload();
    assert.equal(await page.locator('.stat-value').nth(1).textContent(), String(seed.matches.length));
    // Older copies of renamed maps must not be appended as extra matches.
    await page.evaluate(snapshot => {
      const legacy = structuredClone(snapshot.matches);
      legacy.slice(-3).forEach((match, i) => {
        match.id = 'outdated-map-' + i; match.fingerprint = match.id; match.map = 'Old map label ' + i;
        for (const row of match.rows) { row.map = match.map; row.raw.Map = match.map; }
      });
      localStorage.setItem('lan-league-data-v1', JSON.stringify({ version: 1, matches: legacy }));
    }, seed);
    await page.reload();
    assert.equal(await page.locator('.stat-value').nth(1).textContent(), String(seed.matches.length));
    await page.evaluate(() => location.hash = 'duels');
    await page.waitForSelector('.duel-standings tbody tr');
    assert.equal(await page.locator('.duel-cell').count(), seed.duels.length);
    assert.equal(fs.existsSync('dist/assets/import-worker.js'), true);
    assert.equal(fs.existsSync('dist/vendor/xlsx.full.min.js'), true);
    await page.evaluate(() => location.hash = 'home');
    const point = page.locator('.chart-point').first();
    await page.locator('.chart').first().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await point.hover();
    await page.getByRole('tooltip').waitFor({ state: 'visible' });
    assert.ok((await page.getByRole('tooltip').textContent()).includes('M1'));
    await point.focus();
    assert.ok(await page.getByRole('tooltip').isVisible());
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('tooltip').isVisible(), false);
    await page.locator('.chart-point').nth(1).hover();
    assert.ok((await page.getByRole('tooltip').textContent()).includes('M2'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => location.hash = 'duels');
    await page.waitForSelector('.duel-matrix');
    assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);

    // Import a real snapshot copy; all GitHub writes stay inside these mocks.
    const wb = X.utils.book_new();
    const sourceHeaders = [...new Set(seed.matches.flatMap(m => m.rows.flatMap(r => Object.keys(r.raw))))];
    const importedRows = seed.matches.flatMap(m => m.rows.map(r => [m.id, ...sourceHeaders.map(h => r.raw[h] ?? null)]));
    const killsColumn = sourceHeaders.indexOf('Kills') + 1;
    importedRows[0][killsColumn]++;
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([['Match ID', ...sourceHeaders], ...importedRows]), 'Database');
    const duelNames = C.players(seed.matches).map(p => p.name);
    const duelRows = [['A/B', ...duelNames], ...duelNames.map(name => [name, ...duelNames.map(opponent => seed.duels.find(d => d.playerId === C.playerId(name) && d.opponentId === C.playerId(opponent))?.sourceValue || null)])];
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(duelRows), 'Duel sheet');
    const upload = { name: 'LAN two sheets.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(X.write(wb, { type: 'buffer', bookType: 'xlsx' })) };
    let allowPublish = false, pendingData = null, deployed = false;
    await page.route('https://api.github.com/**', async intercepted => {
      const request = intercepted.request();
      if (!allowPublish) { await intercepted.fulfill({ status: 401, json: {} }); return; }
      if (request.method() === 'GET') {
        await intercepted.fulfill({ json: { sha: 'a'.repeat(40), encoding: 'base64', content: Buffer.from(W.serialize(seed)).toString('base64') } });
      } else if (request.method() === 'PUT') {
        const payload = request.postDataJSON();
        assert.equal(payload.sha, 'a'.repeat(40)); assert.equal(payload.branch, 'main');
        pendingData = W.deserialize(Buffer.from(payload.content, 'base64').toString('utf8'));
        assert.equal(pendingData.matches.length, seed.matches.length);
        await intercepted.fulfill({ json: { commit: { sha: 'b'.repeat(40) } } });
      } else throw new Error('Unexpected publishing request');
    });
    await page.route('**/assets/data.js?update=*', async intercepted => intercepted.fulfill({ contentType: 'text/javascript', body: W.serialize(deployed ? pendingData : seed) }));
    await page.evaluate(() => location.hash = 'import');
    await page.waitForSelector('#excel-file');
    await page.locator('#excel-file').setInputFiles({ name: 'bad.xlsx', mimeType: upload.mimeType, buffer: Buffer.from('not an Excel workbook') });
    await page.getByRole('alert').waitFor();
    assert.ok((await page.getByRole('alert').textContent()).includes('Database'));
    await page.locator('#excel-file').setInputFiles(upload);
    await page.waitForSelector('#publish-form');
    assert.equal(await page.locator('.import-preview .stat-value').nth(0).textContent(), String(seed.matches.length));
    assert.equal(await page.locator('.import-preview .stat-value').nth(1).textContent(), String(playerIds.length));
    assert.equal(await page.locator('.import-preview .stat-value').nth(3).textContent(), String(seed.duels.length));
    assert.equal(await page.evaluate(() => window.LAN_DATA.matches[0].rows[0].kills), seed.matches[0].rows[0].kills, 'Preview must not replace shared stats');
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Import preview overflow at ' + width);
    }
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.screenshot({ path: 'test-results/import-preview-390.png', fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.screenshot({ path: 'test-results/import-preview-1440.png', fullPage: true, animations: 'disabled' });
    await page.locator('#publishing-token').fill('test-token-not-a-real-credential');
    await page.getByRole('button', { name: 'Publish for everyone', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.ok((await page.getByRole('alert').textContent()).includes('did not allow'));
    assert.equal(await page.locator('#publishing-token').inputValue(), '');
    assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes('test-token-not-a-real-credential')), false);
    allowPublish = true;
    await page.locator('#publishing-token').fill('test-token-not-a-real-credential');
    await page.getByRole('button', { name: 'Publish for everyone', exact: true }).click();
    await page.getByRole('heading', { name: 'Saved. Waiting for the site to update.', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.LAN_DATA.matches[0].rows[0].kills), seed.matches[0].rows[0].kills, 'Saved must not claim the deployment is live');
    deployed = true;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.getByRole('heading', { name: 'The lobby is up to date.', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.LAN_DATA.matches[0].rows[0].kills), seed.matches[0].rows[0].kills + 1);
    await page.evaluate(() => location.hash = 'home');
    await page.waitForSelector('.player-picker');
    const totalKills = seed.matches.flatMap(m => m.rows).reduce((n, r) => n + r.kills, 0);
    assert.equal(await page.locator('.stat-value').nth(2).textContent(), (totalKills + 1).toLocaleString('en-US'));
    await page.evaluate(() => location.hash = 'duels');
    await page.waitForSelector('.duel-cell');
    assert.equal(await page.locator('.duel-cell').count(), pendingData.duels.length);
    const anotherVisitor = await browser.newPage();
    await anotherVisitor.route('https://fonts.googleapis.com/**', r => r.abort());
    await anotherVisitor.route('**/assets/data.js?update=*', r => r.fulfill({ contentType: 'text/javascript', body: W.serialize(pendingData) }));
    await anotherVisitor.goto('http://127.0.0.1:3000');
    await anotherVisitor.waitForFunction(count => window.LAN_DATA.matches[0].rows[0].kills === count, seed.matches[0].rows[0].kills + 1);
    assert.equal(await anotherVisitor.locator('.stat-value').nth(2).textContent(), (totalKills + 1).toLocaleString('en-US'));
    await anotherVisitor.close();
    await page.evaluate(() => location.hash = 'import');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download template', exact: true }).click();
    const template = await downloadEvent;
    await template.saveAs('test-results/LAN Website Template.xlsx');
    const downloaded = X.read(fs.readFileSync('test-results/LAN Website Template.xlsx'), { type: 'buffer' });
    assert.deepEqual(downloaded.SheetNames, ['Database', 'Duel sheet']);
    assert.equal(X.utils.sheet_to_json(downloaded.Sheets.Database, { header: 1, blankrows: false })[0].length, 33);
    assert.deepEqual(errors, []);
    console.log(`Browser checks passed: ${routes.length} routes at four widths; map aggregates for every player, period filters, win-percentage charts, unknown results and missing stats, rankings, duels, Excel publishing, shared refresh, and profile persistence; no JavaScript errors. GitHub writes mocked.`);
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
