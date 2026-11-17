/* Essence & Ascension — Character Forge
 * play-engine.js: live play state. Pools, damage and healing, the Upkeep (Ch2 §2.3.3),
 * afflictions on you (Ch5), Action Points (Ch4 §4.2), the Tick Engine (Ch4 §4.3), aura Strain (Ch4 §4.4).
 * All play values are stored at table scale (p.scale = the divisor they were stored at).
 */
(function (EA) {
  'use strict';
  var R = EA.rules, A = EA.abilities;
  var P = {};

  P.fx = function (c) {
    return (c.play.effects || []).filter(function (e) { return e.rs || e.weapon || e.sit; });
  };
  P.sheet = function (c) { return R.computeSheet(c, P.fx(c)); };

  P.log = function (p, text, kind) {
    p.log.unshift({ at: P.stamp(p), text: text, kind: kind || '' });
    if (p.log.length > 120) p.log.length = 120;
  };
  P.stamp = function (p) { return p.inCombat ? (p.tickMode ? 'T' + p.tick : 'R' + p.round) : '—'; };

  /** Keep the stored pools in step with the sheet: first use, table-scale changes, and maximum changes. */
  P.sync = function (c, S) {
    var p = c.play;
    var max = { hp: S.pool.HP.dMax, mp: S.pool.MP.dMax, sp: S.pool.SP.dMax };
    var full = { hp: S.pool.HP.max, mp: S.pool.MP.max, sp: S.pool.SP.max };
    if (!p.init) {
      p.hp = max.hp; p.mp = max.mp; p.sp = max.sp; p.init = true; p.scale = S.B; p.lastFull = full;
      p.ap = 3; p.tickMode = S.tickEngine; return;
    }
    var lf = p.lastFull || full, changed = p.scale !== S.B;
    ['hp', 'mp', 'sp'].forEach(function (k) { if (full[k] !== lf[k]) changed = true; });
    if (changed) {
      // work in full units: a maximum increase raises current by the same amount (Ch2 §2.2.2)
      ['hp', 'mp', 'sp'].forEach(function (k) {
        var cur = p[k] * p.scale + Math.max(0, full[k] - lf[k]);
        p[k] = Math.max(0, Math.min(max[k], Math.floor(cur / S.B)));
      });
      if (p.scale !== S.B) {
        var f = p.scale / S.B;
        p.temp = Math.floor(p.temp * f);
        p.afflictions.forEach(function (a) { a.E = Math.floor(a.E * f); });
      }
      p.scale = S.B; p.lastFull = full;
    }
    p.tickMode = S.tickEngine;
  };

  P.downed = function (c) { return c.play.init && c.play.hp <= 0; };
  P.necrosisRD = function (p) {
    return Math.min(5, p.afflictions.filter(function (a) { return a.type === 'Necrosis'; }).reduce(function (s, a) { return s + a.S; }, 0));
  };

  /** Direct damage already worked out by the GM (at table scale). Shields absorb first. */
  P.damage = function (c, S, n, note) {
    var p = c.play; n = Math.max(0, Math.floor(n));
    if (!n) return;
    var absorbed = Math.min(p.temp, n);
    p.temp -= absorbed; if (!p.temp) p.tempLeft = 0;
    var rest = n - absorbed, was = p.hp;
    p.hp = Math.max(0, p.hp - rest);
    P.log(p, 'Took ' + n + ' damage' + (note ? ' (' + note + ')' : '') + (absorbed ? ': ' + absorbed + ' absorbed by the shield' : '') + '. Health ' + was + ' → ' + p.hp + '.', 'dmg');
    if (was > 0 && p.hp === 0) P.log(p, 'Downed. You cannot act and do not regain Health. Any healing brings you back.', 'dmg');
  };

  P.heal = function (c, S, n, note) {
    var p = c.play; n = Math.max(0, Math.floor(n)); if (!n) return;
    var wasDown = p.hp <= 0, was = p.hp;
    p.hp = Math.min(S.pool.HP.dMax, p.hp + n);
    var extra = '';
    if (wasDown) { p.deathMarks = 0; extra += ' You are back on your feet; Death Marks cleared.'; }
    if (n >= Math.ceil(0.1 * S.pool.HP.dMax)) {
      var bl = p.afflictions.filter(function (a) { return a.type === 'Bleed'; }).sort(function (a, b) { return b.S - a.S; })[0];
      if (bl) { bl.S -= 2; extra += ' Clotting removed 2 Bleed stacks.'; if (bl.S <= 0) P.removeAff(p, bl.id); }
    }
    P.log(p, 'Healed ' + n + (note ? ' (' + note + ')' : '') + '. Health ' + was + ' → ' + p.hp + '.' + extra, 'up');
  };

  P.shield = function (c, n, rounds, note) {
    var p = c.play;
    if (n >= p.temp) { p.temp = n; p.tempLeft = rounds || 3; }
    P.log(p, 'Gained ' + n + ' temporary Health for ' + (rounds || 3) + ' Rounds' + (note ? ' (' + note + ')' : '') + '.', 'up');
  };

  P.spend = function (c, res, n) {
    var p = c.play, k = res === 'MP' ? 'mp' : res === 'SP' ? 'sp' : res === 'HP' ? 'hp' : null;
    if (!k || !n) return true;
    if (p[k] < n) return false;
    p[k] -= n; return true;
  };

  // ---------------- afflictions ----------------
  P.removeAff = function (p, id) { p.afflictions = p.afflictions.filter(function (a) { return a.id !== id; }); };

  /** form: {type, stacks, source, raw, rank, rs, sit} -> applier E and CM from raw stat and rank */
  P.addAffliction = function (c, S, f) {
    var p = c.play, info = R.AFFLICTIONS[f.type];
    var M = R.M(f.rank, f.rs), pAff = R.statMod(f.raw) + R.P(f.rank, f.rs) + (f.sit || 0);
    var E = Math.floor(Math.floor(f.raw * M) / S.B);
    var rb = f.rank < c.rank ? Math.pow(0.5, c.rank - f.rank) : 1;
    var rd = P.necrosisRD(p), ps = p.pressedPS || 0;
    var cmRec = S.stat.Recovery.cm;
    var bonus = (S.passives.rmit[f.type] || 0);
    var undeg = R.rmit(cmRec - ps, pAff, bonus);
    var rmit = R.rmit(cmRec - ps - rd, pAff, bonus);
    if (rd > 0) rmit = Math.max(rmit, Math.min(undeg, 0.05));
    var src = (f.source || 'Enemy').trim();
    var same = p.afflictions.filter(function (a) { return a.type === f.type && a.source === src; })[0];
    var n = Math.max(1, f.stacks | 0);
    if (same) {
      same.S = Math.min(info.cap, same.S + n);
      if (f.type !== 'Doom (status)') same.D = Math.max(same.D, info.duration);
      same.E = Math.max(same.E, E);
      P.log(p, f.type + ' from ' + src + ' grows to ' + same.S + ' stacks.', 'dmg');
      return same;
    }
    var inst = { id: 'a' + (++p.affOrder), order: p.affOrder, type: f.type, source: src, S: Math.min(info.cap, n), D: info.duration, n: 0, K: 0, E: E, pAff: pAff, rmit: Math.round(rmit * 1000) / 1000, rb: rb, ticked: 0, amp: 0 };
    p.afflictions.push(inst);
    P.log(p, inst.S + ' ' + f.type + ' from ' + src + ' (your Recovery mitigates ' + Math.round(inst.rmit * 100) + '%).', 'dmg');
    return inst;
  };

  P.tickValue = function (a) {
    var m = (1 + (a.amp || 0)) * (1 - a.rmit) * a.rb;
    if (a.type === 'Bleed') return { hp: Math.max(1, Math.floor(a.S * 0.13 * a.E * m)), sp: Math.max(1, Math.floor(a.S * 0.06 * a.E * m)) };
    if (a.type === 'Poison') return { hp: Math.max(1, Math.floor(a.S * 0.073 * a.E * (1 + 0.5 * a.n) * m)) };
    if (a.type === 'Necrosis') return { hp: Math.max(1, Math.floor(a.S * 0.08 * a.E * m)) };
    return { hp: 0 };
  };
  P.eruption = function (a) {
    return Math.max(1, Math.floor(a.S * a.E * (0.15 + 0.05 * a.K) * (1 + (a.amp || 0)) * (1 - a.rmit) * a.rb));
  };
  P.cleanse = function (c, id, how) {
    var p = c.play, a = p.afflictions.filter(function (x) { return x.id === id; })[0]; if (!a) return;
    if (how === 'all') { P.removeAff(p, id); P.log(p, a.type + ' from ' + a.source + ' cleansed.', 'up'); return; }
    var n = how === 'bind' ? 2 : how === 'three-strong' ? 3 : (a.type === 'Necrosis' ? 1 : 3);
    if (a.type === 'Doom (status)') { P.log(p, 'Ordinary cleanses do not touch Doom.', ''); return; }
    a.S -= n;
    P.log(p, (how === 'bind' ? 'Bind Wounds' : 'Cleanse') + ' removed ' + Math.min(n, a.S + n) + ' ' + a.type + ' stack' + (n > 1 ? 's' : '') + '.', 'up');
    if (a.S <= 0) P.removeAff(p, id);
  };

  // ---------------- the Upkeep ----------------
  P.upkeep = function (c) {
    var p = c.play, S = P.sheet(c), lines = [];
    var downed = p.hp <= 0;
    // 1. start of Upkeep: aura upkeep costs
    var A_ = EA.abilities;
    Object.keys(p.auras).forEach(function (slot) {
      if (!p.auras[slot]) return;
      var ab = c.abilities[slot]; if (!ab) { delete p.auras[slot]; return; }
      var res = A_.compute(ab, S), cost = S.disp(res.upkeep || 0);
      if (p.mp >= cost) { p.mp -= cost; lines.push(ab.name + ' upkeep −' + cost + ' MP.'); }
      else { p.auras[slot] = false; lines.push(ab.name + ' drops: not enough Mana.'); }
    });
    // 2. affliction ticks (Bleed, Poison, Necrosis by application order)
    var tickCount = 0, hpLoss = 0, spLoss = 0, wouldHurt = false;
    p.afflictions.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (a) {
      if (a.type === 'Doom (status)') return;
      var t = P.tickValue(a);
      tickCount++; a.ticked++;
      if (t.hp) { wouldHurt = true; hpLoss += t.hp; }
      if (t.sp) spLoss += t.sp;
      lines.push(a.type + ' (' + a.S + ') deals ' + t.hp + ' Health' + (t.sp ? ' and ' + t.sp + ' Stamina' : '') + '.');
      if (a.type === 'Poison') a.n++;
    });
    if (downed) { if (wouldHurt) { p.deathMarks = Math.min(3, p.deathMarks + 1); lines.push('Downed: a Death Mark instead of losing Health (' + p.deathMarks + ' of 3).'); } }
    else p.hp = Math.max(0, p.hp - hpLoss);
    p.sp = Math.max(0, p.sp - spLoss);
    // 3. Downed check
    if (!downed && p.hp <= 0) { downed = true; lines.push('Downed.'); }
    // 4. regeneration
    var nec = p.afflictions.some(function (a) { return a.type === 'Necrosis'; });
    var auraHeal = 0;
    Object.keys(p.auras).forEach(function (slot) {
      if (!p.auras[slot] || !c.abilities[slot]) return;
      var res = A_.compute(c.abilities[slot], S);
      if (res.auraEffect === 'regen') auraHeal += S.disp(res.auraVal);
    });
    if (p.hollow) { lines.push('Hollow: no regeneration this Upkeep.'); p.hollow = false; }
    else {
      var hr = downed || nec ? 0 : S.pool.HP.dReg + auraHeal;
      var mr = S.pool.MP.dReg, sr = S.pool.SP.dReg;
      var h0 = p.hp, m0 = p.mp, s0 = p.sp;
      p.hp = Math.min(S.pool.HP.dMax, p.hp + hr);
      p.mp = Math.min(S.pool.MP.dMax, p.mp + mr);
      p.sp = Math.min(S.pool.SP.dMax, p.sp + sr);
      var got = [[p.hp - h0, 'Health'], [p.mp - m0, 'Mana'], [p.sp - s0, 'Stamina']].filter(function (g) { return g[0] > 0; }).map(function (g) { return g[0] + ' ' + g[1]; });
      if (got.length) lines.push('Regained ' + got.join(', ') + '.');
      if (nec && !downed) lines.push('Necrosis stops Health regeneration.');
    }
    // aura strain (Silver+), after regeneration
    if (S.aura.available) {
      if (p.collapse > 0) { p.collapse--; if (!p.collapse) { p.strain = 5; lines.push('Aura Collapse ends; Strain resets to 5.'); } }
      else {
        var add = (p.press ? 1 : 0) + (p.suppress ? 2 : 0) + (p.domain ? 2 : 0);
        if (add) p.strain += add; else p.strain = Math.max(0, p.strain - S.aura.strainRecovery);
        if (p.strain >= S.aura.strainMax) { p.strain = S.aura.strainMax; p.collapse = 2; p.press = p.suppress = p.domain = false; lines.push('Aura Collapse: everything drops and your aura is down for 2 Rounds.'); }
      }
    }
    // 5. stack shed (never the last stack; Doom exempt); Doom counts other ticks
    p.afflictions.forEach(function (a) {
      if (a.type === 'Doom (status)') { a.K = Math.min(12, a.K + tickCount); return; }
      var shed = Math.min(a.S - 1, Math.floor(a.S * a.rmit));
      if (shed > 0) { a.S -= shed; lines.push('Shook off ' + shed + ' ' + a.type + ' stack' + (shed > 1 ? 's' : '') + '.'); }
    });
    // 6. cooldowns (Iron)
    if (!(p.forceTick != null ? p.forceTick : S.tickEngine)) Object.keys(p.cd).forEach(function (k) { p.cd[k] = Math.max(0, p.cd[k] - 1); if (!p.cd[k]) delete p.cd[k]; });
    // 7. durations
    p.afflictions.forEach(function (a) { a.D--; });
    p.effects.forEach(function (e) { if (e.rounds != null) e.rounds--; });
    if (p.tempLeft) { p.tempLeft--; if (!p.tempLeft) { if (p.temp) lines.push('Your shield fades.'); p.temp = 0; } }
    // 8. expiry
    p.afflictions.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (a) {
      if (a.D > 0 && a.S > 0) return;
      if (a.type === 'Doom (status)') {
        var er = P.eruption(a);
        if (p.hp > 0) p.hp = Math.max(0, p.hp - er); else p.deathMarks = Math.min(3, p.deathMarks + 1);
        lines.push('Doom bursts for ' + er + ' Health (it counted ' + a.K + ' other ticks).');
      } else lines.push(a.type + ' from ' + a.source + ' runs out.');
      P.removeAff(p, a.id);
    });
    var ended = p.effects.filter(function (e) { return e.rounds != null && e.rounds <= 0; });
    ended.forEach(function (e) { lines.push(e.name + ' ends.'); });
    p.effects = p.effects.filter(function (e) { return e.rounds == null || e.rounds > 0; });
    if (p.hp <= 0 && p.deathMarks >= 3) lines.push('Three Death Marks. Your adventurer has died.');
    p.reactionUsed = false;
    P.log(p, 'Upkeep: ' + lines.join(' '), 'up');
    return lines;
  };

  // ---------------- turns: Iron AP ----------------
  P.startTurn = function (c) {
    var p = c.play;
    p.ap = p.sp <= 0 ? 2 : Math.min(4, 3 + (p.carry || 0));
    p.carry = 0; p.majorUsed = false; p.exerted = false; p.turnOver = false;
    p.effects = p.effects.filter(function (e) { return e.name !== 'Defend'; });
  };
  P.endTurn = function (c) {
    var p = c.play;
    p.carry = Math.min(1, p.ap);
    P.upkeep(c);
    p.round++;
    p.turnOver = true;
  };
  P.ensureTurn = function (c) { if (c.play.turnOver) P.startTurn(c); };

  // ---------------- tick engine (Bronze+) ----------------
  P.roundOf = function (tick) { return Math.ceil(tick / 6); };
  P.advance = function (c, to) {
    var p = c.play, from = p.tick;
    to = Math.round(to * 2) / 2;
    if (to <= from) return;
    for (var t = Math.floor(from) + 1; t <= Math.floor(to); t++) {
      var rnd = P.roundOf(t);
      if (rnd !== P.roundOf(t - 1)) { p.freeMove = false; p.freeMinor = false; p.surged = false; p.round = rnd; }
      if (rnd >= 2 && ((t - 1) % 6) + 1 === p.anchor) { p.tick = t; P.upkeep(c); }
    }
    p.tick = to;
    p.round = P.roundOf(Math.ceil(to));
  };

  // ---------------- combat bookends ----------------
  P.startCombat = function (c) {
    var p = c.play;
    p.inCombat = true; p.round = 1; p.tick = 1; p.rd = 1; p.cd = {}; p.readyAt = {}; p.turnOver = false;
    p.ap = p.sp <= 0 ? 2 : 3; p.carry = 0; p.majorUsed = false; p.reactionUsed = false; p.exerted = false;
    p.freeMove = p.freeMinor = p.surged = false;
    P.log(p, 'Combat begins.', 'roll');
  };
  P.endCombat = function (c) {
    var p = c.play;
    p.inCombat = false; p.cd = {}; p.readyAt = {}; p.press = p.suppress = p.domain = false;
    p.effects = p.effects.filter(function (e) { return e.rounds == null; });
    P.log(p, 'Combat ends. Out-of-combat recovery is five times faster.', 'up');
  };
  P.restRound = function (c) {
    var p = c.play, S = P.sheet(c), E = S.stat.Recovery.E;
    function amt(coef, cap, pool, bonus) {
      var v = Math.min(5 * Math.floor(coef * E), Math.floor(5 * cap * pool.max));
      return Math.max(1, S.disp(Math.floor(v * (1 + bonus))));
    }
    var nec = p.afflictions.some(function (a) { return a.type === 'Necrosis'; });
    var h = p.hp <= 0 || nec ? 0 : amt(0.25, 0.06, S.pool.HP, S.passives.hpreg);
    var m = amt(0.5, 0.08, S.pool.MP, S.passives.mpreg), s = amt(0.5, 0.10, S.pool.SP, S.passives.spreg);
    var h0 = p.hp, m0 = p.mp, s0 = p.sp;
    p.hp = Math.min(S.pool.HP.dMax, p.hp + h); p.mp = Math.min(S.pool.MP.dMax, p.mp + m); p.sp = Math.min(S.pool.SP.dMax, p.sp + s);
    P.log(p, 'Rested a Round: +' + (p.hp - h0) + ' Health, +' + (p.mp - m0) + ' Mana, +' + (p.sp - s0) + ' Stamina.', 'up');
  };
  P.restHour = function (c) {
    var p = c.play, S = P.sheet(c);
    p.hp = S.pool.HP.dMax; p.mp = S.pool.MP.dMax; p.sp = S.pool.SP.dMax; p.deathMarks = 0; p.temp = 0; p.tempLeft = 0; p.strain = 0; p.collapse = 0;
    P.log(p, 'An hour of rest: every pool is full and Death Marks are gone.', 'up');
  };

  EA.play = P;
})(window.EA = window.EA || {});
