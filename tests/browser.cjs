const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const context = { window: {} }; vm.runInNewContext(fs.readFileSync('assets/data.js', 'utf8'), context);
const seed = JSON.parse(JSON.stringify(context.window.LAN_DATA));
const C = require('../assets/core.js');
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
    const playerIds = [...new Set(seed.matches.flatMap(m => m.rows.map(r => r.playerId)))];
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const hash of ['home', 'players', 'matches', 'leaderboard', 'rivalries', 'analytics', 'records', 'duels', 'more', ...playerIds.map(id => 'player/' + id), ...seed.matches.map(m => 'match/' + m.id), ...['Mirage', 'Inferno', 'Ancient', 'Dust%202'].map(m => 'map/' + m)]) {
        await page.evaluate(h => location.hash = h, hash);
        await page.waitForTimeout(25);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        assert.equal(overflow, false, `Horizontal overflow: ${hash} at ${width}px`);
        assert.ok(await page.locator('main h1').count(), `Missing heading: ${hash}`);
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
      await page.waitForFunction(() => {
        const images = [...document.querySelectorAll('.match-row .map-badge img')];
        return images.length === 4 && images.every(img => img.complete && img.naturalWidth > 0);
      });
      assert.equal(await recent.locator('.map-badge img').count(), 4);
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
      }
    }
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
    assert.ok(await page.locator('.leaderboard .empty').isVisible(), 'High minimum must show its empty-state explanation');
    await page.locator('#ranking-minimum').selectOption('2');
    assert.equal(await page.locator('.leaderboard tbody tr').count(), 12);
    assert.ok(await page.locator('.leaderboard .table').isVisible());
    await page.screenshot({ path: 'test-results/leaderboard-fixed-mobile.png', fullPage: true, animations: 'disabled' });
    await page.evaluate(() => location.hash = 'players');
    await page.locator('#player-search').fill('Juugii'); assert.equal(await page.locator('.player-card').count(), 1);
    await page.locator('.player-card').click(); await page.getByRole('button', { name: 'Customize profile', exact: true }).last().click();
    await page.locator('#profile-nickname').fill('Local test nickname'); await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    assert.equal(await page.locator('.profile-name').textContent(), 'Local test nickname');
    await page.reload(); assert.equal(await page.locator('.profile-name').textContent(), 'Local test nickname');
    await page.evaluate(() => { localStorage.removeItem('lan-league-profiles-v1'); location.hash = 'duels'; }); await page.reload();
    assert.equal(await page.locator('.duel-standings tbody tr').count(), 12);
    assert.equal(await page.locator('.duel-cell').count(), seed.duels.length);
    const juugii = C.playerId('Juugii'), tushgee = C.playerId('Tushgee'), tuvshoko = C.playerId('Tuvshoko');
    await page.locator('#duel-a').selectOption(juugii); await page.locator('#duel-b').selectOption(tushgee);
    assert.deepEqual(await page.locator('.duel-contender strong').allTextContents(), ['25', '13']);
    await page.locator('#duel-b').selectOption(tuvshoko);
    assert.ok(await page.getByText('No recorded duels for this pair.', { exact: true }).isVisible());
    await page.locator('.duel-cell[data-player="' + tushgee + '"][data-opponent="' + juugii + '"]').click();
    assert.deepEqual(await page.locator('.duel-contender strong').allTextContents(), ['13', '25']);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(100);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.screenshot({ path: 'test-results/duels-1440.png', fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/duels-390.png', fullPage: true, animations: 'disabled' });
    assert.equal(await page.locator('a[href="#import"]').count(), 0);
    assert.equal(await page.locator('input[accept=".xlsx"]').count(), 0);
    await page.evaluate(() => location.hash = 'import');
    await page.waitForURL('**/#home');
    assert.ok(await page.locator('.player-picker').isVisible());
    // Previously saved match snapshots still work after the importer is removed.
    await page.evaluate(snapshot => localStorage.setItem('lan-league-data-v1', JSON.stringify({ version: 1, matches: snapshot.matches })), seed);
    await page.reload();
    assert.equal(await page.locator('.stat-value').nth(1).textContent(), '5');
    await page.evaluate(() => location.hash = 'duels');
    await page.waitForSelector('.duel-standings tbody tr');
    assert.equal(await page.locator('.duel-cell').count(), 76);
    assert.equal(fs.existsSync('dist/assets/import-worker.js'), false);
    assert.equal(fs.existsSync('dist/vendor'), false);
    await page.evaluate(() => location.hash = 'home');
    const point = page.locator('.chart-point').first();
    await point.hover();
    await page.getByRole('tooltip').waitFor({ state: 'visible' });
    assert.ok((await page.getByRole('tooltip').textContent()).includes('M1'));
    await point.focus();
    assert.ok(await page.getByRole('tooltip').isVisible());
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('tooltip').isVisible(), false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => location.hash = 'duels');
    await page.waitForSelector('.duel-matrix');
    assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);
    assert.deepEqual(errors, []);
    console.log(`Browser checks passed: 30 routes at 360, 390, 768, and 1440 px; player selection, all leaderboard categories, direct-duel scores, matchup grid, removed import links, saved data compatibility, search, and profile persistence; no JavaScript errors.`);
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
