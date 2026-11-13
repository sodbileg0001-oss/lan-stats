(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LAN = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const fields = {
    player: ['player', 'player name', 'nickname', 'name'], team: ['team', 'team name'], result: ['result'],
    kills: ['kills'], deaths: ['deaths'], assists: ['assists'], damage: ['damage', 'total damage'], adr: ['adr'],
    kast: ['kast', 'kast %'], opening: ['open kills', 'opening kills'], trades: ['trade kills'],
    ttk: ['time to kill (s)', 'time to kill', 'time to kill (seconds)'], awpTime: ['awp damage time (s)', 'awp damage time'],
    accuracy: ['accuracy', 'accuracy %'], rifleHs: ['hs % (rifle)', 'rifle hs', 'rifle hs %'],
    pistolHs: ['hs % (pistol)', 'pistol hs'], firstBullet: ['first bullet accuracy %', 'first bullet accuracy'],
    flashes: ['flash assists'], impactFlashes: ['impactful flash assists'], enemiesFlashed: ['enemies flashed'],
    flashDuration: ['total flash duration (s)', 'flash duration'], grenade: ['grenade damage'], smokes: ['smokes used'],
    fire: ['enemies damaged with fire'], he: ['enemies damaged with he'], sourceKd: ['k/d', 'kd'], sourceKda: ['kda'],
    map: ['map', 'map name'], rating: ['hltv 2.1 rating', 'hltv 2.1', 'rating'],
    mvp: ['mvp', 'mvps'], clutches: ['clutches'], score: ['score'], matchId: ['match id', 'match_id'],
    date: ['date', 'match date'], rounds: ['total rounds', 'rounds played'], roundsWon: ['rounds won']
  };
  const percentageFields = new Set(['kast', 'accuracy', 'rifleHs', 'pistolHs', 'firstBullet']);
  const sumFields = ['kills', 'deaths', 'assists', 'damage', 'opening', 'trades', 'flashes', 'impactFlashes', 'enemiesFlashed', 'flashDuration', 'grenade', 'smokes', 'fire', 'he', 'mvp', 'clutches'];
  const clean = s => String(s ?? '').trim().replace(/\s+/g, ' ');
  const key = s => clean(s).toLowerCase();
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const number = v => {
    if (v == null || clean(v) === '' || /^(n\/?a|#|—|-)$/i.test(clean(v))) return null;
    const n = Number(clean(v).replace(/[%x,]/g, ''));
    return finite(n) ? n : null;
  };
  const mean = values => { const v = values.filter(finite); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const sum = values => { const v = values.filter(finite); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
  const ratio = (a, b) => !finite(a) || !finite(b) ? null : b === 0 ? (a > 0 ? Infinity : null) : a / b;
  const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const playerId = name => 'p-' + hash(key(name));
  function mappings(headers) {
    return Object.fromEntries(Object.entries(fields).map(([field, aliases]) => [field, headers.findIndex(h => aliases.includes(key(h)))]));
  }
  function parseRows(rows, options = {}) {
    const headerIndex = rows.findIndex(r => r.some(c => fields.player.includes(key(c))) && r.some(c => key(c) === 'kills'));
    if (headerIndex < 0) throw new Error('No player-statistics header found. Select a sheet with Player and Kills columns.');
    const headers = rows[headerIndex].map((h, i) => clean(h) || 'Column ' + (i + 1));
    const map = { ...mappings(headers), ...options.mapping };
    for (const f of ['player', 'kills', 'deaths', 'team', 'map']) if (!(map[f] >= 0)) throw new Error('Map the ' + f + ' column before continuing.');
    const warnings = [], groups = [];
    let current = null, ignored = 0;
    rows.slice(headerIndex + 1).forEach((row, i) => {
      if (!row.some(c => c != null && clean(c) !== '')) return;
      const name = clean(row[map.player]);
      if (!name) { ignored++; return; }
      const raw = Object.fromEntries(headers.map((h, c) => [h, row[c] ?? null]));
      const r = { playerId: playerId(name), player: name, raw, sourceRow: headerIndex + i + 2 };
      for (const [f, c] of Object.entries(map)) {
        if (c < 0) { r[f] = null; continue; }
        if (['player', 'team', 'map', 'result', 'matchId', 'date'].includes(f)) r[f] = clean(row[c]) || null;
        else {
          r[f] = number(row[c]);
          if (percentageFields.has(f) && options.percentMode === 'fractions' && !String(row[c]).includes('%') && finite(r[f])) r[f] *= 100;
        }
      }
      r.player = name; r.result = r.result ? r.result.toUpperCase() : null;
      r.map = r.map ? r.map.replace(/^de_/i, '').replace(/^dust\s*2$/i, 'Dust 2').replace(/^mirage$/i, 'Mirage').replace(/^inferno$/i, 'Inferno').replace(/^ancient$/i, 'Ancient') : null;
      const invalid = !r.team || !r.map || !finite(r.kills) || !finite(r.deaths) || ['kills', 'deaths', 'assists', 'damage', 'opening', 'trades', 'rounds', 'mvp', 'clutches'].some(f => finite(r[f]) && (r[f] < 0 || !Number.isInteger(r[f]))) || [...percentageFields].some(f => finite(r[f]) && (r[f] < 0 || r[f] > 100));
      if (invalid) { warnings.push('Row ' + r.sourceRow + ' (' + name + ') has missing or invalid statistics and was excluded.'); return; }
      if (!['WIN', 'LOSS', 'DRAW', null].includes(r.result)) { warnings.push('Row ' + r.sourceRow + ': unknown result; treated as unavailable.'); r.result = null; }
      if (r.date && !/^\d{4}-\d{2}-\d{2}/.test(r.date)) { warnings.push('Row ' + r.sourceRow + ': use an ISO date (YYYY-MM-DD); date left unavailable.'); r.date = null; }
      if (!current || (r.matchId ? current.explicitId !== r.matchId : current.map !== r.map || current.rows.some(p => p.playerId === r.playerId))) {
        current = { map: r.map, explicitId: r.matchId, rows: [] }; groups.push(current);
      }
      current.rows.push(r);
    });
    const matches = groups.map((g, i) => {
      if (new Set(g.rows.map(r => r.playerId)).size !== g.rows.length) throw new Error('Duplicate player in match ' + (g.explicitId || i + 1) + '. Fix the source before importing.');
      const teams = [...new Set(g.rows.map(r => r.team))].map(name => {
        const rs = g.rows.filter(r => r.team === name), results = [...new Set(rs.map(r => r.result).filter(Boolean))];
        if (results.length > 1) throw new Error('Conflicting results in ' + name + ', match ' + (i + 1) + '.');
        const wins = [...new Set(rs.map(r => r.roundsWon).filter(finite))];
        if (wins.length > 1) throw new Error('Conflicting rounds won in ' + name + '.');
        return { name, result: results[0] || null, roundsWon: wins.length === 1 ? wins[0] : null };
      });
      if (g.rows.some(r => r.map !== g.map)) throw new Error('Conflicting maps in match ' + (g.explicitId || i + 1) + '.');
      if (teams.filter(t => t.result === 'WIN').length > 1) throw new Error('More than one winning team in match ' + (i + 1) + '.');
      if (teams.length < 2) warnings.push('Match ' + (i + 1) + ' contains only one team. Verify that all player rows are present.');
      const rounds = [...new Set(g.rows.map(r => r.rounds).filter(finite))];
      if (rounds.length > 1) throw new Error('Conflicting round counts in match ' + (i + 1) + '.');
      const fingerprint = hash(JSON.stringify([g.map, g.rows.map(r => [r.playerId, r.team, r.result, r.raw]).sort((a, b) => a[0].localeCompare(b[0]))]));
      return { id: g.explicitId || 'm-' + fingerprint, fingerprint, map: g.map, order: i + 1, date: g.rows[0]?.date || null, rounds: rounds[0] ?? null, teams, rows: g.rows, source: options.filename || 'Workbook', inferred: !g.explicitId };
    });
    if (ignored) warnings.push(ignored + ' row(s) without a player name ignored.');
    if (matches.some(m => m.inferred)) warnings.push('Match boundaries inferred from map changes or repeated players. Review the match preview before import.');
    return { matches, warnings, headers, mapping: map, count: matches.reduce((n, m) => n + m.rows.length, 0) };
  }
  function aggregate(rows) {
    const a = { matches: rows.length, wins: rows.filter(r => r.result === 'WIN').length, losses: rows.filter(r => r.result === 'LOSS').length, draws: rows.filter(r => r.result === 'DRAW').length };
    a.knownResults = rows.filter(r => ['WIN', 'LOSS', 'DRAW'].includes(r.result)).length;
    for (const f of sumFields) { a[f] = sum(rows.map(r => r[f])); a[f + 'Samples'] = rows.filter(r => finite(r[f])).length; }
    a.kd = ratio(a.kills, a.deaths); a.kda = ratio(a.kills == null || a.assists == null ? null : a.kills + a.assists, a.deaths);
    for (const f of ['rating', 'adr', 'kast', 'accuracy', 'rifleHs', 'pistolHs', 'firstBullet', 'ttk', 'awpTime']) {
      a[f] = mean(rows.map(r => r[f])); a[f + 'Samples'] = rows.filter(r => finite(r[f])).length;
    }
    // These are explicitly match means, never denominator-weighted career percentages.
    a.winRate = a.knownResults ? a.wins / a.knownResults * 100 : null;
    a.provisional = rows.length < 10;
    const ratings = rows.map(r => r.rating).filter(finite);
    a.consistency = ratings.length >= 3 ? Math.sqrt(mean(ratings.map(v => (v - a.rating) ** 2))) : null;
    a.improvement = ratings.length >= 6 ? mean(ratings.slice(-3)) - mean(ratings.slice(0, 3)) : null;
    return a;
  }
  function players(matches) {
    const roster = new Map();
    matches.forEach(m => m.rows.forEach(r => {
      if (!roster.has(r.playerId)) roster.set(r.playerId, { id: r.playerId, name: r.player, rows: [] });
      roster.get(r.playerId).rows.push({ ...r, matchId: m.id, match: m });
    }));
    return [...roster.values()].map(p => ({ ...p, stats: aggregate(p.rows) })).sort((a, b) => (b.stats.rating ?? -Infinity) - (a.stats.rating ?? -Infinity) || a.name.localeCompare(b.name));
  }
  function rank(roster, metric = 'rating', minimum = 2) {
    return roster.filter(p => p.stats.matches >= minimum && p.stats[metric] != null && (p.stats[metric + 'Samples'] == null || p.stats[metric + 'Samples'] === p.stats.matches))
      .sort((a, b) => (metric === 'consistency' ? 1 : -1) * (a.stats[metric] - b.stats[metric]) || a.name.localeCompare(b.name));
  }
  function headToHead(matches, a, b) {
    const games = matches.flatMap(m => { const ra = m.rows.find(r => r.playerId === a), rb = m.rows.find(r => r.playerId === b); return ra && rb && ra.team !== rb.team ? [{ match: m, a: ra, b: rb }] : []; });
    return { games, a: aggregate(games.map(g => g.a)), b: aggregate(games.map(g => g.b)) };
  }
  function parseDuelSheet(rows) {
    const headerIndex = rows.findIndex(r => key(r[0]) === 'a/b');
    if (headerIndex < 0) throw new Error('Duel sheet must have an A/B header and opponent names.');
    const headers = rows[headerIndex], entries = [];
    for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex], player = clean(row[0]);
      if (!player) continue;
      for (let col = 1; col < headers.length; col++) {
        const opponent = clean(headers[col]), value = row[col];
        if (!opponent || key(player) === key(opponent) || value == null || clean(value) === '') continue;
        const score = String(value).match(/^\s*(\d+)\s*:\s*(\d+)(?:\s|$)/);
        if (!score) throw new Error('Invalid duel score at row ' + (rowIndex + 1) + ', column ' + (col + 1) + '.');
        entries.push({ playerId: playerId(player), opponentId: playerId(opponent), player, opponent, kills: Number(score[1]), deaths: Number(score[2]), sourceValue: value, sourceRow: rowIndex + 1, sourceColumn: col + 1 });
      }
    }
    const seen = new Set();
    for (const entry of entries) {
      const id = entry.playerId + '/' + entry.opponentId;
      if (seen.has(id)) throw new Error('Duplicate duel record for ' + entry.player + ' against ' + entry.opponent + '.');
      seen.add(id);
      const reverse = entries.find(r => r.playerId === entry.opponentId && r.opponentId === entry.playerId);
      if (reverse && (reverse.kills !== entry.deaths || reverse.deaths !== entry.kills)) throw new Error('Duel scores disagree for ' + entry.player + ' and ' + entry.opponent + '.');
    }
    return entries;
  }
  function duelStandings(entries) {
    const grouped = new Map();
    for (const r of entries) {
      if (!grouped.has(r.playerId)) grouped.set(r.playerId, { id: r.playerId, name: r.player, kills: 0, deaths: 0, opponents: 0 });
      const p = grouped.get(r.playerId); p.kills += r.kills; p.deaths += r.deaths; p.opponents++;
    }
    return [...grouped.values()].map(p => ({ ...p, encounters: p.kills + p.deaths, winRate: p.kills + p.deaths ? p.kills / (p.kills + p.deaths) * 100 : null, kd: ratio(p.kills, p.deaths) })).sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1) || b.kills - a.kills || a.name.localeCompare(b.name));
  }
  function merge(existing, incoming, replace = false) {
    const matches = [...existing], duplicates = [], conflicts = [];
    for (const m of incoming) {
      if (matches.some(v => v.fingerprint === m.fingerprint)) { duplicates.push(m); continue; }
      const i = matches.findIndex(v => v.id === m.id);
      if (i >= 0) { if (replace) matches[i] = m; else conflicts.push(m); }
      else matches.push(m);
    }
    return { matches, duplicates, conflicts };
  }
  return { fields, percentageFields, finite, number, mean, sum, ratio, hash, key, playerId, mappings, parseRows, aggregate, players, rank, headToHead, parseDuelSheet, duelStandings, merge };
});
