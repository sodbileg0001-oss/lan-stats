const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const X = require('../vendor/xlsx.full.min.js');
const vm = require('node:vm');
const context = { window: {} }; vm.runInNewContext(fs.readFileSync('assets/data.js', 'utf8'), context);
const seed = JSON.parse(JSON.stringify(context.window.LAN_DATA));
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
    fs.mkdirSync('test-results', { recursive: true });
    const playerIds = [...new Set(seed.matches.flatMap(m => m.rows.map(r => r.playerId)))];
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const hash of ['home', 'players', 'matches', 'leaderboard', 'rivalries', 'analytics', 'records', 'import', 'more', ...playerIds.map(id => 'player/' + id), ...seed.matches.map(m => 'match/' + m.id), ...['Mirage', 'Inferno', 'Ancient', 'Dust%202'].map(m => 'map/' + m)]) {
        await page.evaluate(h => location.hash = h, hash);
        await page.waitForTimeout(25);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        assert.equal(overflow, false, `Horizontal overflow: ${hash} at ${width}px`);
        assert.ok(await page.locator('main h1').count(), `Missing heading: ${hash}`);
      }
      await page.evaluate(() => location.hash = 'home'); await page.waitForTimeout(50);
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
        await page.screenshot({ path: `test-results/dashboard-${width}.png`, fullPage: true });
        await page.locator('.player-picker').screenshot({ path: `test-results/player-picker-${width}.png` });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => location.hash = 'players');
    await page.locator('#player-search').fill('Juugii'); assert.equal(await page.locator('.player-card').count(), 1);
    await page.locator('.player-card').click(); await page.getByRole('button', { name: 'Customize profile', exact: true }).last().click();
    await page.locator('#profile-nickname').fill('Local test nickname'); await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    assert.equal(await page.locator('.profile-name').textContent(), 'Local test nickname');
    await page.reload(); assert.equal(await page.locator('.profile-name').textContent(), 'Local test nickname');
    await page.evaluate(() => { localStorage.removeItem('lan-league-profiles-v1'); location.hash = 'import'; }); await page.reload();
    await page.locator('#workbook-input').setInputFiles('lan data.xlsx');
    await page.waitForSelector('#confirm-import', { timeout: 90000 });
    assert.ok((await page.locator('#import-detail').textContent()).includes('Duplicates skipped'));
    await page.locator('#review-import').check(); await page.locator('#confirm-import').click();
    await page.waitForTimeout(100); assert.ok((await page.locator('#toast').textContent()).includes('already imported'));
    // A small workbook containing genuine source rows exercises confirmation, persistence, and recalculation.
    const match = seed.matches[0], headers = [...Object.keys(match.rows[0].raw), 'Match ID'];
    const rows = [headers, ...match.rows.map(r => [...headers.slice(0, -1).map(h => r.raw[h]), 'qa-import-match'])];
    const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(rows), 'Database');
    fs.writeFileSync('test-results/import-fixture.xlsx', X.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    await page.locator('#workbook-input').setInputFiles('test-results/import-fixture.xlsx');
    await page.getByRole('heading', { name: 'Review import-fixture.xlsx', exact: true }).waitFor({ timeout: 30000 });
    await page.waitForSelector('#confirm-import');
    // Explicit new match IDs distinguish new matches. Import is isolated in this browser test context.
    await page.locator('#review-import').check(); await page.locator('#confirm-import').click(); await page.waitForTimeout(100);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('lan-league-data-v1') || '{}').matches?.length === 6);
    await page.reload();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lan-league-data-v1')));
    assert.equal(saved.matches.length, 6); assert.ok(saved.history.at(-1).blobKey);
    await page.evaluate(() => location.hash = 'home'); await page.waitForTimeout(50);
    assert.equal(await page.locator('.stat-value').nth(1).textContent(), '6');
    await page.evaluate(() => location.hash = 'import'); await page.waitForTimeout(50);
    await page.getByRole('button', { name: 'Restore bundled workbook', exact: true }).click();
    await page.getByRole('button', { name: 'Restore workbook', exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('lan-league-data-v1')), null);
    assert.deepEqual(errors, []);
    console.log(`Browser checks passed: 30 routes at 360, 390, 768, and 1440 px; all player-picker choices, keyboard selection, profile navigation, search, profile persistence, duplicate XLSX imports, confirmed new import, recalculation, reload, and restore; no JavaScript errors.`);
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
