/* Essence & Ascension — Character Forge
 * rules.js: the deterministic rules engine (Chapters 0, 2, 3, 4, 5).
 * Pure functions only: no DOM access.
 */
(function (EA) {
  'use strict';

  var R = {};
  R.RANKS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Diamond'];
  R.STATS = ['Power', 'Speed', 'Spirit', 'Recovery'];
  R.STAT_HINT = {
    Power: 'Health, strikes, Brace, resists Bleed',
    Speed: 'Stamina, Initiative, Dodge, movement',
    Spirit: 'Mana, spells, Ward, auras, resists Necrosis and Doom',
    Recovery: 'Regeneration, shaking off afflictions, resists Poison'
  };
  R.CREATION = { min: 6, max: 20, absMax: 30, budget: { native: 54, outworlder: 52 } };
  R.AFFLICTIONS = {
    Bleed: { resist: 'Power', duration: 3, cap: 10 },
    Poison: { resist: 'Recovery', duration: 4, cap: 10 },
    Necrosis: { resist: 'Spirit', duration: 3, cap: 5 },
    'Doom (status)': { resist: 'Spirit', duration: 3, cap: 5 }
  };

  // ---------- core constants ----------
  R.round3 = function (x) { return Math.round(x * 1000) / 1000; };
  /** RC-4 rank multiplier, used to 3 decimal places. */
  R.M = function (r, rs) { return R.round3(Math.pow(4, r + rs / 10)); };
  /** RC-9 Stat Modifier from a Raw Stat. */
  R.statMod = function (raw) { return Math.floor(5 * Math.log2(raw / 10) + 0.5); };
  /** RC-3 progress index = RankMod. */
  R.P = function (r, rs) { return 10 * r + rs; };
  R.STEP = Math.pow(4, 0.1); // 1.148698: one Rank Step
  R.round05 = function (x) { return Math.round(x * 2) / 2; };
  R.sign = function (n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; };
  R.fmt = function (n) { return Number(n).toLocaleString('en-US'); };
  R.rankName = function (r, rs) { return R.RANKS[r] + ' ' + rs; };

  // ---------- RC-9 contested check helpers ----------
  R.degree = function (margin) {
    if (margin >= 0) return { success: true, deg: Math.min(4, 1 + Math.floor(margin / 5)) };
    return { success: false, deg: Math.min(4, 1 + Math.floor((-margin - 1) / 5)) };
  };
  R.HIT_TIERS = [
    { key: 'miss', label: 'Miss', dm: 0 },
    { key: 'graze', label: 'Graze', dm: 0.5 },
    { key: 'hit', label: 'Hit', dm: 1.0 },
    { key: 'solid', label: 'Solid Hit', dm: 1.25 },
    { key: 'strong', label: 'Strong Hit', dm: 1.5 },
    { key: 'dev', label: 'Devastating Hit', dm: 2.0 }
  ];
  /** Damage after the Degree Multiplier, floor with Minimum-1 (RC-8, RC-13). */
  R.applyDM = function (base, dm) {
    if (dm <= 0) return 0;
    var v = base * dm;
    return v > 0 ? Math.max(1, Math.floor(v)) : 0;
  };

  // ---------- Ch4 Tick Engine ----------
  R.tempo = function (statModSpeed, sitSpeed) {
    var t = 1 + 0.025 * (statModSpeed + (sitSpeed || 0) - 2);
    return Math.min(1.5, Math.max(0.75, t));
  };
  R.CT_BASE = { 'Special Attack': 0, Spell: 1, Conjuration: 2, Summon: 2, Familiar: 3, 'Basic Attack': 0, 'Mana Dart': 1 };

  // ---------- slot rows open (Ch3 §3.1.3) ----------
  R.rowsOpen = function (r, rs, canonPace) {
    if (canonPace || r > 0) return 5;
    if (rs >= 9) return 5;
    if (rs >= 6) return 4;
    if (rs >= 3) return 3;
    return 2;
  };
  R.ROW_GATE = ['Innate', 'Iron 0', 'Iron 3', 'Iron 6', 'Iron 9'];

  // ---------- Recovery Mitigation (Ch2 §2.3.2) ----------
  R.rmit = function (cmRec, pAff, bonus) {
    var v = 0.25 + 0.025 * (cmRec - pAff) + (bonus || 0);
    return Math.min(0.6, Math.max(0, v));
  };

  // ---------- confluence (Ch1 §1.3.0 / §1.3.4, Ch3 §3.3.6) ----------
  R.derivedConfluence = function (trio) {
    var D = EA.data, fams = trio.map(function (n) { return D.essenceByName[n].family; });
    var counts = {};
    fams.forEach(function (f) { counts[f] = (counts[f] || 0) + 1; });
    var shared = Object.keys(counts).filter(function (f) { return counts[f] >= 2; })[0];
    var family, step;
    if (shared) { family = shared; step = 'Two or more essences share the ' + shared + ' family.'; }
    else {
      var ranks = trio.map(function (n) { return D.rarityRank[D.essenceByName[n].rarity]; });
      var top = Math.max.apply(null, ranks);
      var tops = ranks.filter(function (x) { return x === top; }).length;
      if (tops === 1) {
        var who = trio[ranks.indexOf(top)];
        family = D.essenceByName[who].family;
        step = 'All families differ; ' + who + ' is the single rarest essence (' + family + ').';
      } else { family = 'MIXED'; step = 'All families differ and the rarest essences tie.'; }
    }
    var d = D.derived[family];
    return { name: d[0], theme: d[1], tag: 'derived', family: family, source: 'Uncovered Trio Procedure', step: step };
  };

  R.resolveConfluence = function (c) {
    var D = EA.data, trio = (c.essences || []).filter(Boolean);
    if (trio.length < 3) return null;
    var key = D.trioKey(trio);
    var usual, canon = D.confluenceMap[key];
    if (canon) {
      usual = { name: canon.name, theme: canon.theme, tag: canon.tag, restricted: canon.restricted, source: 'Known confluence', key: key };
      if (D.conflictAlt[key]) usual.alt = D.conflictAlt[key];
    } else usual = R.derivedConfluence(trio);
    usual.key = key;

    var conf = c.confluence || {};
    var result = usual, note = '';
    var shifting = c.heritage === 'outworlder' || (c.options && c.options.shifting);
    if (shifting && conf.shiftRoll) {
      var roll = conf.shiftRoll;
      if (roll >= 16 && roll <= 19) {
        result = R.derivedConfluence(trio);
        note = 'Shifting Confluence roll ' + roll + ': the derived family confluence forms instead.';
      } else if (roll === 20) {
        note = 'Shifting Confluence roll 20: choose any known confluence that lists one of your essences.';
        if (conf.choice && D.confluenceNames[conf.choice]) {
          var cn = D.confluenceNames[conf.choice];
          result = { name: conf.choice, theme: cn.theme, tag: 'unverified', source: 'Shifting Confluence choice' };
        }
      } else note = 'Shifting Confluence roll ' + roll + ': the usual confluence forms.';
    }
    if (conf.override) result = { name: conf.override, theme: 'Set by your GM', tag: 'house', source: 'Set by your GM' };
    result = Object.assign({}, result, { usual: usual, note: note, shifting: shifting, key: key });
    if (result.restricted === undefined) {
      var cn2 = D.confluenceNames[result.name];
      result.restricted = cn2 ? cn2.restrictedAll : false;
    }
    return result;
  };

  R.shiftChoices = function (trio) {
    var D = EA.data, out = [];
    Object.keys(D.confluenceNames).forEach(function (name) {
      var hit = D.confluenceNames[name].trios.some(function (k) {
        var parts = k.split(', ');
        return trio.some(function (t) { return parts.indexOf(t) >= 0; });
      });
      if (hit) out.push(name);
    });
    return out.sort();
  };

  // ---------- the derived sheet ----------
  /** fx = active effects in play: [{rs:{Power:1}, weapon:true, sit:{dodge:2}}] */
  R.computeSheet = function (c, fx) {
    fx = fx || [];
    var r = c.rank, rs = c.rs, M = R.M(r, rs), P = R.P(r, rs);
    var opts = c.options || {};
    var tableRank = opts.tableScale === false ? 0 : (opts.partyRank == null ? r : opts.partyRank);
    var B = Math.pow(4, tableRank);
    var S = { c: c, r: r, rs: rs, M: M, P: P, B: B, tableRank: tableRank, rankName: R.rankName(r, rs) };
    S.disp = function (v) { return Math.floor(v / B); };

    // stat steps from active effects
    var rsBonus = { Power: 0, Speed: 0, Spirit: 0, Recovery: 0 }, weapon = false, sit = {};
    fx.forEach(function (f) {
      if (f.rs) Object.keys(f.rs).forEach(function (k) { rsBonus[k] += f.rs[k]; });
      if (f.weapon) weapon = true;
      if (f.sit) Object.keys(f.sit).forEach(function (k) { sit[k] = (sit[k] || 0) + f.sit[k]; });
    });

    S.stat = {};
    R.STATS.forEach(function (k) {
      var raw = Math.min(R.CREATION.absMax, (c.stats[k] || 0) + ((c.rawBonus && c.rawBonus[k]) || 0));
      var sm = R.statMod(raw), n = rsBonus[k];
      var E = Math.floor(raw * M * Math.pow(R.STEP, n));
      S.stat[k] = { raw: raw, sm: sm, rankMod: P + n, cm: sm + P + n, E: E, boosted: n };
    });

    // passive bonuses from awakened abilities
    var pas = { hpmax: 0, mpmax: 0, spmax: 0, hpreg: 0, mpreg: 0, spreg: 0, dr: 0, rmit: {} };
    S.abilityList = EA.abilities ? EA.abilities.list(c) : [];
    S.abilityList.forEach(function (a) {
      (a.ab.items || []).forEach(function (it) {
        if (it.k === 'passive') {
          if (pas[it.pick] !== undefined && it.pick !== 'rmit') pas[it.pick] += it.pick.slice(-3) === 'max' ? 0.06 : 0.25;
          if (it.pick === 'rmit') pas.rmit[it.aff || 'Bleed'] = (pas.rmit[it.aff || 'Bleed'] || 0) + 0.10;
        }
        if (it.k === 'drPassive') pas.dr += 0.05;
      });
    });
    S.passives = pas;

    var F = 1 + 0.1 * r;
    var hpMax = Math.floor((5 * S.stat.Power.E + 20 * M) * F * (1 + pas.hpmax));
    var mpMax = Math.floor((6 * S.stat.Spirit.E + 10 * M) * (1 + pas.mpmax));
    var spMax = Math.floor((5 * S.stat.Speed.E + 10 * M) * (1 + pas.spmax));
    var eRec = S.stat.Recovery.E;
    function reg(coef, cap, max, bonus) {
      var v = Math.max(1, Math.min(Math.floor(coef * eRec), Math.floor(cap * max)));
      return Math.floor(v * (1 + bonus));
    }
    S.pool = {
      HP: { max: hpMax, reg: reg(0.25, 0.06, hpMax, pas.hpreg), cap: Math.floor(0.06 * hpMax), label: 'Health', stat: 'Power' },
      MP: { max: mpMax, reg: reg(0.5, 0.08, mpMax, pas.mpreg), cap: Math.floor(0.08 * mpMax), label: 'Mana', stat: 'Spirit' },
      SP: { max: spMax, reg: reg(0.5, 0.10, spMax, pas.spreg), cap: Math.floor(0.10 * spMax), label: 'Stamina', stat: 'Speed' }
    };
    ['HP', 'MP', 'SP'].forEach(function (k) {
      var p = S.pool[k];
      p.dMax = S.disp(p.max);
      p.dReg = Math.max(1, S.disp(p.reg));
    });
    S.dr = Math.min(0.5, pas.dr);

    // defenses (RC-13)
    var cm = function (k) { return S.stat[k].cm; };
    S.def = {
      strike: Math.max(cm('Speed'), cm('Power')), strikeName: cm('Speed') >= cm('Power') ? 'Dodge' : 'Brace',
      spell: Math.max(cm('Speed'), cm('Spirit')), spellName: cm('Speed') >= cm('Spirit') ? 'Dodge' : 'Ward',
      area: cm('Speed')
    };
    S.init = cm('Speed');
    S.move = (6 + Math.max(0, S.stat.Speed.sm)) * Math.pow(2, r);
    S.exert = Math.floor(8 * M);
    S.dExert = S.disp(S.exert);

    // basic actions (Ch3 §3.2.1)
    var bstat = c.basicStat || 'Power';
    S.basic = {
      stat: bstat, coef: weapon ? 1.6 : 1.25, reach: weapon ? 4 : null,
      dmg: Math.floor((weapon ? 1.6 : 1.25) * S.stat[bstat].E),
      dart: Math.floor(1.0 * S.stat.Spirit.E), dartCost: Math.floor(2 * M)
    };

    // tick engine (Bronze+)
    S.tickEngine = r >= 1;
    S.tempo = R.tempo(S.stat.Speed.sm, sit.speed || 0);
    S.majorRecovery = R.round05(6 / S.tempo);
    S.castTime = function (type) {
      var b = R.CT_BASE[type]; if (b == null) b = 0;
      return R.round05(b / S.tempo);
    };

    // aura (Silver+)
    var smRec = S.stat.Recovery.sm;
    S.aura = {
      available: r >= 2,
      AO: cm('Spirit'), AD: cm('Spirit') + Math.floor(smRec / 2),
      strainMax: r >= 4 ? 15 : 10,
      radius: (5 + Math.max(0, S.stat.Spirit.sm)) * Math.pow(2, r - 2),
      strainRecovery: Math.max(1, 1 + Math.floor(smRec / 2)),
      pressure: r >= 4 ? 'Enemies one rank lower: Press 1; two or more ranks lower: Press 2' : r >= 2 ? 'Enemies two or more ranks lower are pressed at strength 1' : ''
    };

    S.rowsOpen = R.rowsOpen(r, rs, opts.canonPace);
    S.budget = R.CREATION.budget[c.heritage] || 54;
    S.spent = R.STATS.reduce(function (a, k) { return a + (c.stats[k] || 0); }, 0);
    S.confluence = R.resolveConfluence(c);
    S.outworlder = c.heritage === 'outworlder';
    S.evoSlots = r; // one Evolution per rank reached above Iron
    return S;
  };

  // ---------- stat-budget validation ----------
  R.validateStats = function (c) {
    var out = [];
    var budget = R.CREATION.budget[c.heritage] || 54;
    var spent = R.STATS.reduce(function (a, k) { return a + (c.stats[k] || 0); }, 0);
    if (spent > budget) out.push('You have spent ' + (spent - budget) + ' more points than your budget of ' + budget + '.');
    if (spent < budget) out.push((budget - spent) + ' stat points left to spend.');
    R.STATS.forEach(function (k) {
      var v = c.stats[k];
      if (v < R.CREATION.min || v > R.CREATION.max) out.push(k + ' must be between 6 and 20 at creation.');
    });
    return out;
  };

  EA.rules = R;
})(window.EA = window.EA || {});
