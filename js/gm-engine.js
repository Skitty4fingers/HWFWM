/* Essence & Ascension — GM desk
 * gm-engine.js: GM state (bestiary, party, encounter), initiative and turn order (RC-11, Ch4),
 * attack resolution read twice (RC-13, Ch4 §4.1.5 Rank Barrier, Ch5 §5.0 pipelines), keywords (Ch5 §5.2),
 * odds (RC-12), hazards, loot. No DOM access.
 */
(function (EA) {
  'use strict';
  var R = EA.rules, A = EA.abilities, St = EA.store, P = EA.play, D = EA.data;
  var KEY = 'ea-gm-v1';
  var G = {};

  G.ARCHETYPES = {
    'Heavy melee': { Power: 18, Speed: 12, Spirit: 8, Recovery: 14 },
    Caster: { Power: 8, Speed: 12, Spirit: 20, Recovery: 12 },
    Skirmisher: { Power: 12, Speed: 20, Spirit: 8, Recovery: 12 },
    Balanced: { Power: 13, Speed: 13, Spirit: 13, Recovery: 13 }
  };
  G.TIERS = { 0.5: 'Minion', 1: 'Standard', 2: 'Elite', 4: 'Solo (vs a party of four)' };
  G.TIER_ORDER = [0.5, 1, 2, 4];
  G.tierName = function (m) { return (G.TIERS[m || 1] || 'Standard').split(' (')[0]; };
  G.rankLabel = function (f) { return f.normal ? 'Normal (as Iron 0)' : EA.rules.rankName(f.rank, f.rs); };
  /** Any foe by id: the GM's own, or a canon creature. */
  G.foeById = function (id) { return G.state.foes[id] || (EA.bestiary && EA.bestiary.find(id)) || null; };
  G.HAZARD = { Easy: 2, Standard: 7, Hard: 12, Extreme: 15 };

  function uid(p) { return (p || 'g') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---------------- state ----------------
  G.state = { foes: {}, party: {}, enc: null };
  G.newEncounter = function () {
    return { name: 'Encounter', partyRank: 0, tableScale: true, combatants: [], started: false, round: 1, tick: 1, turn: 0, log: [] };
  };
  G.load = function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var d = JSON.parse(raw); G.state.foes = d.foes || {}; G.state.party = d.party || {}; G.state.enc = d.enc || null; }
    } catch (e) { G.storageBroken = true; }
    if (!G.state.enc) G.state.enc = G.newEncounter();
    if (!Object.keys(G.state.foes).length) G.seedFoes();
  };
  var t = null;
  function write() { t = null; try { localStorage.setItem(KEY, JSON.stringify(G.state)); } catch (e) { G.storageBroken = true; } }
  G.save = function () { clearTimeout(t); t = setTimeout(write, 250); };
  G.flush = function () { if (t) { clearTimeout(t); write(); } };
  window.addEventListener('pagehide', G.flush);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') G.flush(); });

  // ---------------- foes ----------------
  G.newFoe = function (name) {
    var f = St.newCharacter();
    f.id = uid('f'); f.kind = 'foe'; f.name = name || 'New foe'; f.archetype = 'Balanced'; f.hpMult = 1; f.desc = '';
    f.heritage = 'native'; f.stats = clone(G.ARCHETYPES.Balanced); f.essences = ['', '', ''];
    f.abilities = {}; f.confluence.revealed = true;
    return f;
  };
  G.kitSlots = function (f) { return A.SLOTS.filter(function (s) { return f.abilities[s]; }); };
  G.nextSlot = function (f) { return A.SLOTS.filter(function (s) { return !f.abilities[s]; })[0]; };
  /** A priced attack: kind Special Attack / Spell, area, rider stacks. Damage takes whatever APB is left. */
  G.quickAttack = function (o) {
    var items = [];
    if (o.area) items.push({ k: 'area' });
    if (o.aff && o.stacks) items.push({ k: 'rider', aff: o.aff, n: o.stacks });
    var left = 100 - (o.area ? 40 : 0) - (o.aff && o.stacks ? 10 * o.stacks : 0);
    if (left > 0) items.unshift({ k: 'dmg', x: left });
    return { name: o.name || 'Attack', type: o.type || 'Special Attack', scaling: o.scaling || 'Power', cd: o.cd || 3, resource: o.type === 'Spell' ? 'MP' : 'SP', grade: 'Common', stone: '', keywords: o.keywords || '', items: items, hg: [], template: '', evo: [], text: '' };
  };
  G.seedFoes = function () {
    var h = G.newFoe('Thornback Hound');
    h.archetype = 'Skirmisher'; h.stats = clone(G.ARCHETYPES.Skirmisher); h.basicStat = 'Speed';
    h.desc = 'Spined pack hunter of the thornbush roads. Lunges for the throat, flees when the pack breaks.';
    h.abilities['E1-1'] = G.quickAttack({ name: 'Throat Lunge', type: 'Special Attack', scaling: 'Speed', cd: 3, aff: 'Bleed', stacks: 2, keywords: 'melee, Bleed' });
    h.abilities['E1-2'] = G.quickAttack({ name: 'Spine Volley', type: 'Special Attack', scaling: 'Speed', cd: 5, area: true, keywords: 'Area' });
    var w = G.newFoe('Grave Weaver');
    w.archetype = 'Caster'; w.stats = clone(G.ARCHETYPES.Caster); w.rank = 0; w.rs = 3; w.hpMult = 4;
    w.desc = 'A swollen spider-thing nesting in old barrow tunnels. Builds curses, then cashes them in.';
    w.abilities['E1-1'] = G.quickAttack({ name: 'Withering Thread', type: 'Spell', scaling: 'Spirit', cd: 3, aff: 'Necrosis', stacks: 2, keywords: 'curse' });
    w.abilities['E1-2'] = G.quickAttack({ name: 'Venom Rain', type: 'Spell', scaling: 'Spirit', cd: 5, area: true, aff: 'Poison', stacks: 3, keywords: 'Area, Poison' });
    w.abilities['E1-3'] = G.quickAttack({ name: 'Fang', type: 'Special Attack', scaling: 'Spirit', cd: 2, keywords: 'melee' });
    [h, w].forEach(function (f) { G.state.foes[f.id] = f; });
  };

  // ---------------- party ----------------
  G.partyList = function () {
    var out = [];
    St.list().forEach(function (c) { out.push({ src: 'roster', c: c }); });
    Object.keys(G.state.party).forEach(function (k) { out.push({ src: 'imported', c: G.state.party[k] }); });
    return out;
  };
  G.importPC = function (text) {
    var c = JSON.parse(text);
    if (!c || !c.stats || !c.essences) throw new Error('That file is not a Character Forge character.');
    c.id = uid('p'); delete c.exported; delete c.app;
    G.state.party[c.id] = c; G.save(); return c;
  };

  // ---------------- encounter ----------------
  function combatant(c, side) {
    var x = clone(c);
    x.play = St.newPlay();
    if (c.play && c.play.init) { ['hp', 'mp', 'sp', 'deathMarks', 'scale', 'init', 'lastFull'].forEach(function (k) { x.play[k] = c.play[k]; }); }
    return { id: uid('c'), side: side, name: c.name || 'Unnamed', c: x, init: null, roll: null, group: null, anchor: 1, rd: 1, note: '' };
  }
  G.addPC = function (enc, c) { var cb = combatant(c, 'party'); enc.combatants.push(cb); G.prep(enc); return cb; };
  G.addFoe = function (enc, f, n, groupInit) {
    n = Math.max(1, n | 0);
    var same = enc.combatants.filter(function (x) { return x.srcId === f.id; }).length;
    for (var i = 0; i < n; i++) {
      var cb = combatant(f, 'foes');
      cb.srcId = f.id;
      cb.name = n > 1 || same ? f.name + ' ' + (same + i + 1) : f.name;
      cb.c.name = cb.name;
      if (groupInit) cb.group = f.id;
      enc.combatants.push(cb);
    }
    G.prep(enc);
  };
  G.remove = function (enc, id) { enc.combatants = enc.combatants.filter(function (x) { return x.id !== id; }); };
  G.find = function (enc, id) { return enc.combatants.filter(function (x) { return x.id === id; })[0]; };

  G.tickMode = function (enc) {
    var party = enc.combatants.filter(function (x) { return x.side === 'party'; });
    var pool = party.length ? party : enc.combatants;
    return pool.some(function (x) { return x.c.rank >= 1; });   // Ch4 §4.3.1
  };
  /** Keep every combatant on the encounter's table scale and engine. */
  G.prep = function (enc) {
    var tm = G.tickMode(enc);
    enc.combatants.forEach(function (x) {
      x.c.options = x.c.options || {};
      x.c.options.tableScale = enc.tableScale;
      x.c.options.partyRank = enc.partyRank;
      x.c.play.forceTick = tm;
      x.c.play.inCombat = enc.started;
      P.sync(x.c, G.sheet(x));
    });
  };
  G.sheet = function (x) { return P.sheet(x.c); };

  G.order = function (enc) {
    return enc.combatants.slice().sort(function (a, b) {
      var ai = a.init == null ? -999 : a.init, bi = b.init == null ? -999 : b.init;
      if (bi !== ai) return bi - ai;
      var sa = G.sheet(a), sb = G.sheet(b);
      if (sb.init !== sa.init) return sb.init - sa.init;                      // higher CM_Speed
      if (sb.stat.Speed.raw !== sa.stat.Speed.raw) return sb.stat.Speed.raw - sa.stat.Speed.raw;
      if (sb.stat.Recovery.raw !== sa.stat.Recovery.raw) return sb.stat.Recovery.raw - sa.stat.Recovery.raw;
      return (a.side === 'party' ? 0 : 1) - (b.side === 'party' ? 0 : 1);
    });
  };

  G.log = function (enc, text, kind) {
    enc.log.unshift({ at: enc.started ? (G.tickMode(enc) ? 'T' + enc.tick : 'R' + enc.round) : '—', text: text, kind: kind || '' });
    if (enc.log.length > 200) enc.log.length = 200;
  };

  G.rollInitiative = function (enc, d20, onlyMissing) {
    var groups = {};
    enc.combatants.forEach(function (x) {
      if (onlyMissing && x.init != null) return;
      var S = G.sheet(x), roll;
      if (x.group) { if (groups[x.group] == null) groups[x.group] = d20(); roll = groups[x.group]; }
      else roll = d20();
      x.roll = roll; x.init = roll + S.init;
    });
    G.anchors(enc);
    G.log(enc, 'Initiative: ' + G.order(enc).map(function (x) { return x.name + ' ' + x.init; }).join(', ') + '.', 'roll');
  };
  G.anchors = function (enc) {
    var withInit = enc.combatants.filter(function (x) { return x.init != null; });
    if (!withInit.length) return;
    var top = Math.max.apply(null, withInit.map(function (x) { return x.init; }));
    enc.combatants.forEach(function (x) {
      x.anchor = x.init == null ? 6 : Math.min(6, 1 + Math.floor((top - x.init) / 4));   // Ch4 §4.3.4
      if (!enc.started) x.rd = x.anchor;
    });
  };
  G.start = function (enc) {
    if (enc.combatants.some(function (x) { return x.init == null; })) G.rollInitiative(enc, EA.ui.d20, true);
    enc.started = true; enc.round = 1; enc.tick = 1; enc.turn = 0;
    G.anchors(enc);
    enc.combatants.forEach(function (x) { x.rd = x.anchor; x.c.play.cd = {}; x.c.play.readyAt = {}; x.c.play.inCombat = true; });
    G.prep(enc);
    G.log(enc, 'The fight begins' + (G.tickMode(enc) ? ' on the Tick track.' : ' in turns (Action Points).'), 'roll');
  };
  G.end = function (enc) {
    enc.started = false;
    enc.combatants.forEach(function (x) { x.c.play.inCombat = false; x.c.play.cd = {}; x.c.play.readyAt = {}; x.init = null; x.roll = null; });
    G.log(enc, 'The fight ends.', 'up');
  };
  G.current = function (enc) { var o = G.order(enc); return o[enc.turn % Math.max(1, o.length)]; };
  G.upkeep = function (enc, x) {
    var lines = P.upkeep(x.c);
    if (lines.length) G.log(enc, x.name + ' Upkeep: ' + lines.join(' '), 'up');
  };
  /** Iron: the current combatant's Upkeep, then the next in order. */
  G.nextTurn = function (enc) {
    var o = G.order(enc); if (!o.length) return;
    var cur = o[enc.turn % o.length];
    G.upkeep(enc, cur);
    enc.turn++;
    if (enc.turn >= o.length) { enc.turn = 0; enc.round++; G.log(enc, 'Round ' + enc.round + '.', 'roll'); }
  };
  /** Bronze+: advance the clock; Upkeeps fire on each Anchor from Round 2 (Ch4 §4.3.4, §4.3.6 order). */
  G.advance = function (enc, to) {
    to = Math.round(to * 2) / 2;
    var from = enc.tick;
    for (var t = Math.floor(from) + 1; t <= Math.floor(to); t++) {
      var rnd = Math.ceil(t / 6);
      if (rnd !== Math.ceil((t - 1) / 6)) G.log(enc, 'Round ' + rnd + ' (Tick ' + t + ').', 'roll');
      enc.tick = t; enc.round = rnd;
      if (rnd >= 2) G.order(enc).forEach(function (x) { if (x.anchor === ((t - 1) % 6) + 1) G.upkeep(enc, x); });
    }
    enc.tick = to; enc.round = Math.ceil(Math.ceil(to) / 6);
  };
  G.readyNow = function (enc) {
    return G.order(enc).filter(function (x) { return x.rd <= enc.tick && x.c.play.hp > 0; });
  };
  G.nextReadyTick = function (enc) {
    var alive = enc.combatants.filter(function (x) { return x.c.play.hp > 0; });
    var future = alive.map(function (x) { return x.rd; }).filter(function (r) { return r > enc.tick; });
    return future.length ? Math.min.apply(null, future) : enc.tick + 1;
  };

  // ---------------- defenses ----------------
  G.defenses = function (x) {
    var S = G.sheet(x), p = x.c.play;
    var defend = p.effects.some(function (e) { return e.name === 'Defend'; }) ? 2 : 0;
    var exh = p.sp <= 0 ? 2 : 0, nec = Math.min(2, Math.floor(P.necrosisRD(p) / 2));
    var dodge = S.stat.Speed.cm - exh + defend, brace = S.stat.Power.cm - nec + defend, ward = S.stat.Spirit.cm - nec + defend;
    return {
      dodge: dodge, brace: brace, ward: ward,
      Strike: { cm: Math.max(dodge, brace), name: dodge >= brace ? 'Dodge' : 'Brace' },
      Spell: { cm: Math.max(dodge, ward), name: dodge >= ward ? 'Dodge' : 'Ward' },
      Area: { cm: dodge, name: 'Dodge' },
      res: { Power: S.stat.Power.cm, Recovery: S.stat.Recovery.cm, Spirit: S.stat.Spirit.cm, Speed: S.stat.Speed.cm },
      dr: S.dr
    };
  };

  // ---------------- RC-9 / RC-13 reading ----------------
  /** Read 1: tier index into R.HIT_TIERS (0 Miss .. 5 Devastating). */
  G.readAttack = function (d, total, tn, rA, rD, area) {
    var mg = total - tn, deg = R.degree(mg), success = deg.success, dos = success ? deg.deg : 0, dof = success ? 0 : deg.deg, note = '';
    if (d === 20) {
      if (rA >= rD) { success = true; dos = Math.min(4, Math.max(dos, 1) + 1); note = 'Critical'; }
      else if (success) { dos = Math.min(4, dos + 1); note = 'Natural 20 (Rank Wall: no automatic success)'; }
      else note = 'Natural 20 blocked by the Rank Wall';
    }
    if (d === 1) {
      if (rA <= rD) { dof = Math.min(4, Math.max(mg >= 0 ? 1 : dof, 1) + 1); success = false; note = 'Fumble'; }
      else note = 'Natural 1 (Rank Wall: no automatic failure)';
    }
    var tier = success ? 1 + dos : (dof === 1 ? 1 : 0);
    if (area && rA >= rD && tier === 0) { tier = 1; note = (note ? note + '; ' : '') + 'area floor'; }
    return { margin: mg, tier: tier, note: note };
  };
  G.readRider = function (total, tnRes, stacks) {
    var mg = total - tnRes;
    if (mg >= 0) return { margin: mg, stacks: stacks, label: 'full' };
    if (mg >= -5) return { margin: mg, stacks: Math.ceil(stacks / 2), label: 'half' };
    return { margin: mg, stacks: 0, label: 'none' };
  };

  /** What an attacker can use: their ability cards plus Basic Attack and Mana Dart. */
  G.actions = function (x) {
    var S = G.sheet(x), out = [];
    A.list(x.c).forEach(function (a) { if (a.ab.type !== 'Passive') out.push({ key: a.slot, ab: a.ab, res: A.compute(a.ab, S) }); });
    var bstat = S.basic.stat;
    out.push({ key: 'basic', ab: { name: 'Basic Attack', type: 'Special Attack', scaling: bstat, items: [{ k: 'dmg', x: 100 }] }, res: { dmg: S.basic.dmg, attackKind: 'Strike', rolls: true, scaling: bstat, sit: 0, riders: {}, cond: {}, action: 'Major', resource: null, dCost: 0, cdRounds: 0, cdTicks: 0, castTime: 0, costText: 'No cost', cdText: '—' } });
    out.push({ key: 'dart', ab: { name: 'Mana Dart', type: 'Spell', scaling: 'Spirit', items: [{ k: 'dmg', x: 100 }] }, res: { dmg: S.basic.dart, attackKind: 'Spell', rolls: true, scaling: 'Spirit', sit: 0, riders: {}, cond: {}, action: 'Major', resource: 'MP', dCost: S.disp(S.basic.dartCost), cdRounds: 0, cdTicks: 0, castTime: S.castTime('Mana Dart'), costText: S.disp(S.basic.dartCost) + ' MP', cdText: '—' } });
    return out;
  };

  /** Resolve one action against targets with one d20 (RC-13: one roll, read twice). Returns a plan; G.apply carries it out. */
  G.resolve = function (enc, att, key, targetIds, d, edge) {
    var Sa = G.sheet(att), act = G.actions(att).filter(function (a) { return a.key === key; })[0];
    if (!act) return null;
    var ab = act.ab, res = act.res, items = ab.items || [];
    var sit = Math.max(-5, Math.min(5, (edge || 0) + (res.sit || 0)));
    var cmA = res.scaling ? Sa.stat[res.scaling].cm : 0;
    var total = d + cmA + sit, rA = att.c.rank;
    var kind = res.attackKind || (res.dmg ? 'Spell' : null);
    var plan = { att: att.id, key: key, name: ab.name, d: d, cmA: cmA, sit: sit, total: total, kind: kind, rows: [], res: res, ab: ab };
    var has = function (k) { return items.some(function (i) { return i.k === k; }); };
    targetIds.forEach(function (tid) {
      var tg = G.find(enc, tid); if (!tg) return;
      var St_ = G.sheet(tg), def = G.defenses(tg), rD = tg.c.rank, row = { id: tid, name: tg.name, lines: [] };
      var ally = tg.side === att.side;
      if (res.heal) { row.heal = St_.disp ? Math.max(1, Math.floor(res.heal * (rA < rD ? Math.pow(0.5, rD - rA) : 1) / Sa.B)) : 0; row.lines.push('Regains ' + row.heal + ' Health.'); }
      if (res.shield) { row.shield = Math.max(1, Math.floor(res.shield * (rA < rD ? Math.pow(0.5, rD - rA) : 1) / Sa.B)); row.lines.push('Gains ' + row.shield + ' temporary Health.'); }
      if (has('cleanseInst')) row.lines.push('Cleanse: remove one affliction on the card below.');
      if (kind && (res.dmg || Object.keys(res.riders).length || has('amplify') || has('elongate') || has('detonate') || has('trigger') || has('debuff'))) {
        var dv = def[kind] || def.Spell, tn = 11 + dv.cm;
        var r1 = G.readAttack(d, total, tn, rA, rD, kind === 'Area');
        row.tn = tn; row.defName = dv.name; row.tier = r1.tier; row.margin = r1.margin; row.note = r1.note;
        var tier = R.HIT_TIERS[r1.tier];
        if (res.dmg) {
          var base = res.dmg, p = tg.c.play;
          if (res.execute && p.hp <= St_.pool.HP.dMax * 0.25) { base = res.dmgExec; row.lines.push('Execute: the target is at a quarter of its Health or less.'); }
          if (res.cond && res.cond.Reaper && p.hp <= St_.pool.HP.dMax * 0.25) base = res.cond.Reaper;
          var v = base * tier.dm;
          var rb = rA < rD ? Math.pow(0.5, rD - rA) : 1;
          v = v * rb * (1 - (def.dr || 0));
          row.dmg = v > 0 ? Math.max(1, Math.floor(v / Sa.B)) : 0;
          if (rb < 1) row.lines.push('Rank Barrier ×' + rb + '.');
          if (def.dr) row.lines.push('Damage reduction ' + Math.round(def.dr * 100) + '%.');
          if (res.drain && row.dmg) row.drain = Math.floor(row.dmg * 0.5);
        }
        // Read 2: riders
        row.riders = [];
        if (r1.tier >= 1) {
          Object.keys(res.riders).forEach(function (aff) {
            var resStat = R.AFFLICTIONS[aff].resist, tnr = 11 + def.res[resStat];
            var r2 = G.readRider(total, tnr, res.riders[aff]);
            row.riders.push({ aff: aff, stacks: r2.stacks, of: res.riders[aff], label: r2.label, tn: tnr, margin: r2.margin });
          });
          items.forEach(function (i) {
            if (i.k === 'amplify') row.lines.push('Amplify ' + i.aff + ' +25% for 3 Rounds.');
            if (i.k === 'elongate') row.lines.push('Elongate ' + i.aff + ' +' + (i.n || 1) + '.');
          });
          if (r1.tier >= 2) items.forEach(function (i) {
            if (i.k === 'detonate') row.lines.push('Detonate ' + i.aff + '.');
            if (i.k === 'trigger') row.lines.push('Trigger: every Doom bursts.');
            if (i.k === 'debuff') row.lines.push('−' + (i.pts || 1) + ' on ' + (i.what || 'one roll') + ' for ' + (3 + (res.durBonus || 0)) + ' Rounds.');
          });
        }
      }
      if (has('control')) {
        var ci = items.filter(function (i) { return i.k === 'control'; })[0], vs = ci.vs || 'Power';
        var tnc = 11 + def.res[vs], ok = G.readAttack(d, total, tnc, rA, rD, false).tier >= 2;
        row.control = ok; row.lines.push('Control vs ' + vs + ' (needs ' + tnc + '): ' + (ok ? 'loses its next Major action' + (has('controlMove') ? ' and its next Move' : '') + '.' : 'resists.'));
      }
      if (ally && !res.heal && !res.shield && res.dmg) row.lines.push('Careful: this target is on the same side.');
      plan.rows.push(row);
    });
    return plan;
  };

  function detonate(enc, tg, aff, applierName) {
    var p = tg.c.play, total = { hp: 0, sp: 0 };
    p.afflictions.filter(function (a) { return a.type === aff && a.ticked >= 1; }).forEach(function (a) {
      var hp = 0, sp = 0;
      for (var k = 0; k < a.D; k++) {
        if (aff === 'Bleed') { hp += a.S * 0.13 * a.E; sp += a.S * 0.06 * a.E; }
        if (aff === 'Poison') hp += a.S * 0.073 * a.E * (1 + 0.5 * (a.n + k));
        if (aff === 'Necrosis') hp += a.S * 0.08 * a.E;
      }
      var m = 1.25 * (1 + (a.amp || 0)) * (1 - a.rmit) * a.rb;
      total.hp += Math.max(1, Math.floor(hp * m)); if (sp) total.sp += Math.max(1, Math.floor(sp * m));
      P.removeAff(p, a.id);
      p.afflictions.forEach(function (o) { if (o.type === 'Doom (status)') o.K = Math.min(12, o.K + 1); });
    });
    if (total.hp) {
      p.hp = Math.max(0, p.hp - total.hp); p.sp = Math.max(0, p.sp - total.sp);
      p.effects.push({ name: 'Cauterized (' + aff + ')', rounds: 1 });
      G.log(enc, tg.name + ': ' + aff + ' detonates for ' + total.hp + ' Health' + (total.sp ? ' and ' + total.sp + ' Stamina' : '') + '.', 'dmg');
    }
  }

  /** Carry out a resolved plan: costs, cooldowns, timing, damage, healing, afflictions, keywords. */
  G.apply = function (enc, plan) {
    var att = G.find(enc, plan.att); if (!att) return;
    var Sa = G.sheet(att), res = plan.res, ab = plan.ab, p = att.c.play, items = ab.items || [];
    if (res.resource && res.dCost) P.spend(att.c, res.resource, res.dCost);
    if (enc.started) {
      if (G.tickMode(enc)) {
        if (/^Major/.test(res.action)) att.rd = enc.tick + Sa.majorRecovery;
        if (res.cdTicks) p.readyAt[plan.key] = enc.tick + (res.castTime || 0) + res.cdTicks;
      } else if (res.cdRounds) p.cd[plan.key] = res.cdRounds;
    }
    var summary = [];
    plan.rows.forEach(function (row) {
      var tg = G.find(enc, row.id); if (!tg) return;
      var St_ = G.sheet(tg), tp = tg.c.play, bits = [];
      if (row.tier != null) bits.push(R.HIT_TIERS[row.tier].label);
      if (row.dmg) { P.damage(tg.c, St_, row.dmg, ab.name); bits.push(row.dmg + ' damage'); }
      if (row.drain) P.heal(att.c, Sa, row.drain, 'Drain');
      if (row.heal) { P.heal(tg.c, St_, row.heal, ab.name); bits.push('+' + row.heal + ' Health'); }
      if (row.shield) { P.shield(tg.c, row.shield, 3 + (res.durBonus || 0), ab.name); bits.push('+' + row.shield + ' shield'); }
      (row.riders || []).forEach(function (rd) {
        if (!rd.stacks) return;
        var raw = Sa.stat[res.scaling || 'Power'].raw;
        P.addAffliction(tg.c, St_, { type: rd.aff, stacks: rd.stacks, source: att.name, raw: raw, rank: att.c.rank, rs: att.c.rs, sit: 0 });
        bits.push(rd.stacks + ' ' + rd.aff.replace(' (status)', ''));
      });
      if (row.tier >= 1) items.forEach(function (i) {
        if (i.k === 'amplify') tp.afflictions.forEach(function (a) { if (a.type === i.aff) a.amp = Math.min(1, (a.amp || 0) + 0.25); });
        if (i.k === 'elongate') tp.afflictions.forEach(function (a) {
          if (a.type !== i.aff) return;
          var base = R.AFFLICTIONS[a.type].duration, cap = a.type === 'Doom (status)' ? base + 1 : 2 * base;
          a.D = Math.min(cap, a.D + (i.n || 1));
        });
      });
      if (row.tier >= 2) items.forEach(function (i) {
        if (i.k === 'detonate') detonate(enc, tg, i.aff, att.name);
        if (i.k === 'trigger') tp.afflictions.filter(function (a) { return a.type === 'Doom (status)'; }).forEach(function (a) {
          var er = P.eruption(a); tp.hp = Math.max(0, tp.hp - er); P.removeAff(tp, a.id);
          G.log(enc, tg.name + ': Doom bursts for ' + er + ' Health.', 'dmg');
        });
      });
      summary.push(tg.name + ' ' + (bits.join(', ') || (row.control != null ? (row.control ? 'controlled' : 'resists') : 'no effect')));
    });
    items.forEach(function (it) {
      if (it.k === 'transform') { var rs = {}; (it.stats || []).forEach(function (s) { rs[s] = (rs[s] || 0) + (res.transform ? res.transform.steps : 1); }); p.effects.push({ name: ab.name, slot: plan.key, rounds: res.transform ? res.transform.rounds : 3, rs: rs }); }
      if (it.k === 'weapon') p.effects.push({ name: ab.name, slot: plan.key, rounds: 10 + (res.durBonus || 0), weapon: true });
      if (it.k === 'aura') p.auras[plan.key] = true;
      if (it.k === 'summon') p.effects.push({ name: ab.name + ' (summon)', slot: plan.key, rounds: 5 + (res.durBonus || 0) });
    });
    G.log(enc, att.name + ' uses ' + ab.name + (plan.rows.length ? ' (' + plan.total + '): ' + summary.join('; ') : '') + '.', plan.rows.some(function (r) { return r.dmg; }) ? 'dmg' : 'roll');
  };

  // ---------------- odds (RC-12, RC-13) ----------------
  G.odds = function (cmA, cmD, rA, rD, area) {
    var counts = [0, 0, 0, 0, 0, 0], edm = 0;
    for (var d = 1; d <= 20; d++) {
      var r = G.readAttack(d, d + cmA, 11 + cmD, rA, rD, area);
      counts[r.tier]++; edm += R.HIT_TIERS[r.tier].dm;
    }
    var check = 0;
    for (var e = 1; e <= 20; e++) { if (G.readAttack(e, e + cmA, 11 + cmD, rA, rD, false).tier >= 2) check++; }
    return { counts: counts, edm: edm / 20, success: check / 20, needed: 11 + cmD - cmA };
  };
  G.hazard = function (rank, diff) { return 10 * rank + (G.HAZARD[diff] || 0); };

  // ---------------- loot ----------------
  G.lootRarity = function (d20) {
    var a = d20();
    if (a <= 10) return { roll: a, rarity: 'Common' };
    if (a <= 15) return { roll: a, rarity: 'Uncommon' };
    if (a <= 18) return { roll: a, rarity: 'Rare' };
    if (a === 19) return { roll: a, rarity: 'Epic' };
    var b = d20();
    return { roll: a, reroll: b, rarity: b <= 15 ? 'Epic' : 'Legendary' };
  };
  G.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  G.clone = clone;
  EA.gm = G;
})(window.EA = window.EA || {});
