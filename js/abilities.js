/* Essence & Ascension — Character Forge
 * abilities.js: Ability Power Budget (Ch3 §3.2), High-Grade modifiers and Grave templates (Ch1 §1.4),
 * evolutions (Ch3 §3.2.5), keywords (Ch5 §5.2). Turns an ability card into finished numbers and rules text.
 */
(function (EA) {
  'use strict';
  var R = EA.rules;
  var A = {};

  A.SLOTS = [];
  ['E1', 'E2', 'E3', 'C'].forEach(function (col) { for (var i = 1; i <= 5; i++) A.SLOTS.push(col + '-' + i); });

  // Ch3 Table A
  A.TABLE_A = { 1: { C: 1.50, k: 8 }, 2: { C: 2.25, k: 14 }, 3: { C: 2.75, k: 18 }, 4: { C: 3.10, k: 22 }, 5: { C: 3.40, k: 26 }, 6: { C: 3.60, k: 45 }, 8: { C: 3.90, k: 54 }, 10: { C: 4.20, k: 63 } };
  A.CDS = [1, 2, 3, 4, 5, 6, 8, 10];

  A.TYPES = {
    'Special Attack': { action: 'Major', res: 'SP', read: 'Strike', cd: true },
    Spell: { action: 'Major', res: 'MP', read: 'Spell', cd: true },
    Aura: { action: 'Minor to start', res: 'MP', read: 'Contested where noted', cd: false },
    Conjuration: { action: 'Major', res: 'MP', read: 'None', cd: true },
    Summon: { action: 'Major', res: 'MP', read: 'Summon attacks', cd: true },
    Familiar: { action: 'Major to call', res: 'MP', read: 'Familiar attacks', cd: false },
    Transformation: { action: 'Minor', res: 'choose', read: 'None', cd: true },
    Reaction: { action: 'Reaction', res: 'choose', read: 'As its effect', cd: true },
    Passive: { action: 'Always on', res: 'none', read: 'None', cd: false },
    Ritual: { action: 'Out of combat, 10+ minutes', res: 'MP', read: 'None', cd: true }
  };
  A.TYPE_NAMES = Object.keys(A.TYPES);

  A.GRADES = {
    Innate: { budget: 100, shift: 0, hg: 0, label: 'Innate (no stone)' },
    Common: { budget: 100, shift: 0, hg: 0, label: 'Common stone' },
    Uncommon: { budget: 100, shift: 1, hg: 0, label: 'Uncommon stone' },
    Rare: { budget: 100, shift: 2, hg: 1, label: 'Rare stone (+1 property)' },
    Epic: { budget: 100, shift: 3, hg: 2, label: 'Epic stone (+2 properties)' },
    Legendary: { budget: 100, shift: 3, hg: 0, template: true, label: 'Legendary stone (template)' },
    Divine: { budget: 125, shift: 0, hg: 0, label: 'Divine stone (fixed ability)' }
  };

  A.AFF = ['Bleed', 'Poison', 'Necrosis', 'Doom (status)'];
  A.PASSIVE_PICKS = {
    hpmax: '+6% maximum Health', mpmax: '+6% maximum Mana', spmax: '+6% maximum Stamina',
    hpreg: '+25% Health regeneration', mpreg: '+25% Mana regeneration', spreg: '+25% Stamina regeneration',
    rmit: '+0.10 Recovery Mitigation against one affliction', sit: '+1 edge to one roll under a condition',
    dmgcond: '+10% damage under a condition', utility: 'A sense or utility power (GM approves)'
  };
  A.AURA_EFFECTS = {
    damage: 'Enemies within 6 m take {aura} damage at each of your Upkeeps',
    regen: 'Allies within 6 m (you included) regain {aura} Health at each of your Upkeeps',
    defdebuff: 'Enemies within 6 m take −1 on one defense',
    atkbuff: 'Allies within 6 m gain +1 edge on one kind of attack'
  };

  // Ch3 Table B + Ch5 extensions. apb(item) returns the APB the item spends.
  A.ITEMS = {
    dmg: { label: 'Damage', apb: function (i) { return i.x || 0; }, group: 'Offense', def: { x: 100 } },
    rider: { label: 'Rider affliction', apb: function (i) { return 10 * (i.n || 1); }, group: 'Offense', def: { aff: 'Bleed', n: 2 } },
    area: { label: 'Area (3 m radius, 6 m cone or 10 m line)', apb: function () { return 40; }, group: 'Offense', def: {} },
    areaPlus: { label: 'Area size +2 m', apb: function (i) { return 10 * (i.n || 1); }, group: 'Offense', def: { n: 1 } },
    drain: { label: 'Drain (heal half the damage dealt)', apb: function () { return 30; }, group: 'Offense', def: {} },
    execute: { label: 'Execute (+50% at 25% Health or less)', apb: function () { return 20; }, group: 'Offense', def: {} },
    heal: { label: 'Healing', apb: function (i) { return i.x || 0; }, group: 'Support', def: { x: 100 } },
    shield: { label: 'Shield (temporary Health, 3 Rounds)', apb: function (i) { return i.x || 0; }, group: 'Support', def: { x: 100 } },
    buff: { label: 'Edge on a roll (one target, 3 Rounds)', apb: function (i) { return 20 * (i.pts || 1); }, group: 'Support', def: { pts: 1, what: 'Dodge' } },
    dmgBuff: { label: 'Damage +10% (one target, 3 Rounds)', apb: function (i) { return 20 * (i.n || 1); }, group: 'Support', def: { n: 1 } },
    drBuff: { label: 'Damage reduction +10% (one target, 3 Rounds)', apb: function () { return 20; }, group: 'Support', def: {} },
    cleanse3: { label: 'Cleanse 3 stacks', apb: function (i) { return 20 * (i.n || 1); }, group: 'Support', def: { n: 1 } },
    cleanseInst: { label: 'Cleanse a whole affliction', apb: function () { return 40; }, group: 'Support', def: {} },
    redirect: { label: 'Take 30% of an ally’s damage (5 Rounds)', apb: function () { return 100; }, group: 'Support', def: {} },
    debuff: { label: 'Penalty on a roll (on a Hit, 3 Rounds)', apb: function (i) { return 20 * (i.pts || 1); }, group: 'Control', def: { pts: 1, what: 'attack rolls' } },
    control: { label: 'Control: target loses its next Major action', apb: function () { return 80; }, group: 'Control', def: { vs: 'Power' } },
    controlMove: { label: 'Control add-on: also loses its next Move', apb: function () { return 20; }, group: 'Control', def: {} },
    move: { label: 'Movement 10 m', apb: function () { return 20; }, group: 'Utility', def: {} },
    dur: { label: 'Duration +1 Round', apb: function (i) { return 10 * (i.n || 1); }, group: 'Utility', def: { n: 1 } },
    react: { label: 'Usable as a Reaction', apb: function () { return 20; }, group: 'Utility', def: { trigger: 'When you or an ally next to you is attacked' } },
    passive: { label: 'Passive pick', apb: function () { return 50; }, group: 'Passive', def: { pick: 'hpmax' } },
    drPassive: { label: 'Damage reduction +5% (passive)', apb: function () { return 50; }, group: 'Passive', def: {} },
    weapon: { label: 'Conjured weapon (10 Rounds)', apb: function () { return 100; }, group: 'Signature', def: {} },
    transform: { label: 'Transformation (3 Rounds, two stats +1 Step)', apb: function () { return 100; }, group: 'Signature', def: { stats: ['Power', 'Recovery'] } },
    summon: { label: 'Summon (5 Rounds)', apb: function () { return 100; }, group: 'Signature', def: {} },
    familiar: { label: 'Familiar (persistent)', apb: function () { return 100; }, group: 'Signature', def: {} },
    aura: { label: 'Aura (6 m radius)', apb: function () { return 100; }, group: 'Signature', def: { effect: 'regen' } },
    amplify: { label: 'Amplify (+25%, one affliction type, 3 Rounds)', apb: function () { return 20; }, group: 'Keyword', def: { aff: 'Bleed' } },
    elongate: { label: 'Elongate (+1 Upkeep per step)', apb: function (i) { return 10 * (i.n || 1); }, group: 'Keyword', def: { aff: 'Poison', n: 1 } },
    detonate: { label: 'Detonate (one affliction type)', apb: function () { return 30; }, group: 'Keyword', def: { aff: 'Bleed' }, minCd: 3 },
    trigger: { label: 'Trigger (Doom)', apb: function () { return 20; }, group: 'Keyword', def: {}, minCd: 3 }
  };

  // Ch1 §1.4.2
  A.HG = [
    { k: 'Honed', d: [1, 2], text: 'Coefficient +10%', dbl: '+20%' },
    { k: 'Efficient', d: [3, 4], text: 'Cost −15%', dbl: '−30%' },
    { k: 'Quickened', d: [5, 6], text: 'Cooldown −15%', dbl: '−30%' },
    { k: 'Lingering', d: [7, 8], text: 'Duration +1 Round', dbl: '+2 Rounds', needs: 'timed' },
    { k: 'Piercing', d: [9, 10], text: '+1 edge on its attack roll or contest', dbl: '+2', needs: 'roll' },
    { k: 'Opportunist', d: [11, 12], text: '+20% against a target carrying your affliction', dbl: '+40%', needs: 'dmg' },
    { k: 'Last Stand', d: [13, 14], text: '+20% while you are at half Health or less', dbl: '+40%', needs: 'dmg' },
    { k: 'Rider', d: [15, 16], text: '1 stack of an affliction on a Hit', dbl: '2 stacks', needs: 'roll' },
    { k: 'Widened', d: [17, 18], text: 'Radius +25%, or 2 targets at 60%', dbl: 'Radius +50%, or 2 targets at 80%' },
    { k: 'Combo', d: [19, 20], text: 'After another ability of this essence this Round: hit tier +1', dbl: '+1 tier and +10%', needs: 'roll' }
  ];
  A.hgByRoll = function (d) { return A.HG.filter(function (h) { return d >= h.d[0] && d <= h.d[1]; })[0]; };

  // Ch1 §1.4.3
  A.TEMPLATES = [
    { k: 'Void', d: [1, 2], net: 140, power: 'Damage ignores half of the target’s damage reduction', cost: 'Hollow: after each use, your next Upkeep has no regeneration' },
    { k: 'Astral', d: [3, 4], net: 130, power: 'Affects incorporeal and astral beings; a natural 20 ignores the Rank Wall against targets one rank higher', cost: 'Costs an extra 10% of maximum Mana per use' },
    { k: 'Inexorable', d: [5, 6], net: 140, power: 'Its afflictions cannot be cleansed the Round they land, and their stack cap is +1', cost: 'Cooldown +50%' },
    { k: 'Annihilation', d: [7, 8], net: 140, power: 'Coefficient +40%; area radius +25%', cost: 'Its area hits allies too, and you take 5% of your maximum Health per use' },
    { k: 'Ascendant', d: [9, 10], net: 140, power: 'Transformation: two stats count as two Steps higher for 3 Rounds', cost: 'Spent: when it ends, all stats count as two Steps lower for 2 Rounds' },
    { k: 'Reaper', d: [11, 12], net: 140, power: '+50% against targets at 25% Health or less; on a Hit, Rigor: −2 Dodge for 1 Round', cost: 'Cooldown doubled' },
    { k: 'Undying', d: [13, 14], net: 140, power: 'Once per day, when you drop to 0 Health, return at 30% Health', cost: 'After it triggers, Mana and Stamina regeneration stop for 3 Upkeeps' },
    { k: 'Threshold', d: [15, 16], net: 140, power: 'Teleport up to 20 m as part of the ability, or open a 2-Round portal allies can use', cost: 'Unmoored: −2 on all defenses until your next turn' },
    { k: 'Ledger', d: [17, 18], net: 130, power: 'Good Karma on an ally (+10% healing per stack) or Bad Karma on an enemy (+10% damage taken per stack); 3 stacks, 3 Rounds', cost: 'Each use puts 1 Bad Karma stack on you' },
    { k: 'Primordial', d: [19, 20], net: 140, power: 'Two other templates at 60% of their values', cost: 'Both templates’ drawbacks in full; no High-Grade modifiers' }
  ];
  A.templateByRoll = function (d) { return A.TEMPLATES.filter(function (h) { return d >= h.d[0] && d <= h.d[1]; })[0]; };
  A.templateByName = function (k) { return A.TEMPLATES.filter(function (t) { return t.k === k; })[0]; };

  // Ch3 §3.2.5
  A.EVOLUTIONS = {
    Lingering: 'One timed effect lasts a Round longer',
    Efficient: 'Costs 15% less',
    Swift: 'Cooldown one Round shorter (6 Ticks at Bronze+)',
    Rider: 'One more stack of a rider it already applies, or a 1-stack rider that fits the essence',
    Reach: 'Area 2 m larger, or range 10 m longer',
    Reactive: 'Usable as a Reaction (only if its damage portion is 50 APB or less)',
    'Rank Feature': 'A new 10-APB effect you design with your GM'
  };

  A.blank = function (slot) {
    return { name: '', type: 'Spell', scaling: 'Spirit', cd: 3, resource: 'MP', grade: slot && slot.slice(-1) === '1' ? 'Innate' : 'Common', stone: '', keywords: '', items: [{ k: 'dmg', x: 100 }], hg: [], template: '', evo: [], text: '' };
  };

  A.list = function (c) {
    var out = [];
    A.SLOTS.forEach(function (s) { if (c.abilities && c.abilities[s]) out.push({ slot: s, ab: c.abilities[s] }); });
    return out;
  };

  function count(arr, key) { return (arr || []).filter(function (x) { return (x.k || x) === key; }).length; }
  function sumItems(items, k, field) { return items.filter(function (i) { return i.k === k; }).reduce(function (a, i) { return a + (i[field] || 0); }, 0); }
  function has(items, k) { return items.some(function (i) { return i.k === k; }); }

  /** Compute an ability's finished numbers against a computed sheet S. */
  A.compute = function (ab, S) {
    var items = ab.items || [];
    var T = A.TYPES[ab.type] || A.TYPES.Spell;
    var gr = A.GRADES[ab.grade] || A.GRADES.Common;
    var res = { issues: [], notes: [] };
    var scal = ab.scaling && S.stat[ab.scaling] ? ab.scaling : null;
    var E = scal ? S.stat[scal].E : 0;
    var cd = T.cd ? (ab.cd || 1) : null;
    var row = cd ? (A.TABLE_A[cd] || A.TABLE_A[3]) : null;
    var C = row ? row.C : 0;
    var evo = ab.evo || [], hg = ab.hg || [];
    var tpl = ab.grade === 'Legendary' ? A.templateByName(ab.template) : null;

    // ---- APB audit ----
    var base = items.reduce(function (a, i) { var d = A.ITEMS[i.k]; return a + (d ? d.apb(i) : 0); }, 0);
    res.apbBase = base;
    res.apbBudget = gr.budget;
    res.apbExtra = hg.length * 10 + (tpl ? tpl.net - 100 : 0) + evo.length * 10;
    res.apbTotal = base + res.apbExtra;
    if (base !== gr.budget) res.issues.push('Effects spend ' + base + ' APB; the budget is ' + gr.budget + '.');
    if (gr.hg && hg.length > gr.hg) res.issues.push('A ' + ab.grade + ' stone grants ' + gr.hg + ' High-Grade propert' + (gr.hg > 1 ? 'ies' : 'y') + '.');
    items.forEach(function (i) {
      var d = A.ITEMS[i.k];
      if (d && d.minCd && (!cd || cd < 3)) res.issues.push(d.label.split(' (')[0] + ' needs a cooldown of 3 Rounds or more.');
    });
    if (evo.length > S.evoSlots) res.issues.push('Only ' + S.evoSlots + ' evolution' + (S.evoSlots === 1 ? '' : 's') + ' at ' + R.RANKS[S.r] + '.');
    var dmgX = sumItems(items, 'dmg', 'x');
    if (count(evo, 'Reactive') && dmgX > 50) res.issues.push('Reactive only fits abilities with 50 APB of damage or less.');

    // ---- coefficient multipliers ----
    var honed = 0;
    hg.forEach(function (h) { if ((h.k || h) === 'Honed') honed += 0.10; });
    if (tpl && tpl.k === 'Annihilation') honed += 0.40;
    var coefMult = 1 + honed;
    res.coefMult = coefMult;
    res.scaling = scal; res.E = E; res.C = C;

    function amt(x, factor) { return Math.floor(C * (x / 100) * factor * coefMult * E); }
    res.coef = dmgX ? Math.round(C * dmgX / 100 * coefMult * 1000) / 1000 : 0;
    res.dmg = dmgX ? amt(dmgX, 1) : 0;
    var healX = sumItems(items, 'heal', 'x'), shieldX = sumItems(items, 'shield', 'x');
    res.heal = healX ? amt(healX, 0.8) : 0;
    res.shield = shieldX ? amt(shieldX, 1.0) : 0;
    res.area = has(items, 'area');
    res.areaM = 3 + 2 * sumItems(items, 'areaPlus', 'n') + 2 * count(evo, 'Reach') * (res.area ? 1 : 0);
    if (tpl && tpl.k === 'Annihilation' && res.area) res.areaM = Math.round(res.areaM * 1.25 * 10) / 10;
    res.drain = has(items, 'drain');
    res.execute = has(items, 'execute');
    res.dmgExec = res.execute ? Math.floor(C * dmgX / 100 * coefMult * E * 1.5) : 0;
    res.reaction = ab.type === 'Reaction' || has(items, 'react') || count(evo, 'Reactive') > 0;

    // conditional damage variants
    var cond = [];
    hg.forEach(function (h) {
      var k = h.k || h;
      if (k === 'Opportunist' || k === 'Last Stand') cond.push(k);
    });
    res.cond = {};
    ['Opportunist', 'Last Stand'].forEach(function (k) {
      var n = cond.filter(function (x) { return x === k; }).length;
      if (n && dmgX) res.cond[k] = Math.floor(C * dmgX / 100 * coefMult * E * (1 + 0.2 * n));
    });
    if (tpl && tpl.k === 'Reaper' && dmgX) res.cond.Reaper = Math.floor(C * dmgX / 100 * coefMult * E * 1.5);

    // ---- riders ----
    var riders = {};
    items.filter(function (i) { return i.k === 'rider'; }).forEach(function (i) { riders[i.aff] = (riders[i.aff] || 0) + (i.n || 1); });
    var hgRider = hg.filter(function (h) { return (h.k || h) === 'Rider'; });
    if (hgRider.length) {
      var aff = hgRider[0].aff || Object.keys(riders)[0] || 'Bleed';
      riders[aff] = (riders[aff] || 0) + (hgRider.length >= 2 ? 2 : 1);
    }
    evo.filter(function (e) { return (e.k || e) === 'Rider'; }).forEach(function (e) {
      var a2 = e.aff || Object.keys(riders)[0] || 'Bleed';
      riders[a2] = (riders[a2] || 0) + 1;
    });
    res.riders = riders;

    // ---- duration ----
    var durBonus = sumItems(items, 'dur', 'n') + count(evo, 'Lingering');
    hg.forEach(function (h) { if ((h.k || h) === 'Lingering') durBonus += 1; });
    res.durBonus = durBonus;

    // ---- cost ----
    var eff = 0.15 * count(evo, 'Efficient');
    hg.forEach(function (h) { if ((h.k || h) === 'Efficient') eff += 0.15; });
    var resource = T.res === 'choose' ? (ab.resource || 'SP') : T.res;
    res.resource = resource;
    if (ab.type === 'Passive') { res.cost = 0; res.costText = '—'; }
    else if (ab.type === 'Aura' || has(items, 'aura')) {
      res.upkeep = Math.max(1, Math.floor(4 * S.M * (1 - eff)));
      res.cost = 0; res.resource = 'MP';
      res.costText = S.disp(res.upkeep) + ' MP each Round';
    } else if (ab.type === 'Familiar') {
      res.cost = Math.max(1, Math.floor(30 * S.M * (1 - eff)));
      res.costText = S.disp(res.cost) + ' MP once';
    } else if (row) {
      res.cost = Math.max(1, Math.floor(row.k * S.M * (1 - eff)));
      if (tpl && tpl.k === 'Astral') res.cost += Math.floor(0.1 * S.pool.MP.max);
      res.costText = S.disp(res.cost) + ' ' + resource;
    } else { res.cost = 0; res.costText = '—'; }
    res.dCost = S.disp(res.cost);

    // ---- cooldown ----
    if (cd) {
      var mult = 1;
      if (tpl && tpl.k === 'Reaper') mult *= 2;
      if (tpl && tpl.k === 'Inexorable') mult *= 1.5;
      var quick = 0;
      hg.forEach(function (h) { if ((h.k || h) === 'Quickened') quick += 0.15; });
      var swift = count(evo, 'Swift');
      var rounds = cd * mult * (1 - quick);
      res.cdRounds = Math.max(1, Math.round(rounds) - swift);
      var ticks = Math.floor(6 * cd * mult * (1 - quick)) - 6 * swift;
      ticks = Math.max(6, ticks);
      res.cdTicks = Math.max(3, R.round05(ticks / S.tempo));
      res.cdText = S.tickEngine ? res.cdTicks + ' Ticks' : (res.cdRounds === 1 ? 'Every Round' : res.cdRounds + ' Rounds');
    } else { res.cdRounds = 0; res.cdTicks = 0; res.cdText = '—'; }
    res.castTime = S.castTime(ab.type);

    // ---- action ----
    res.action = res.reaction && ab.type !== 'Passive' ? 'Reaction' : T.action;
    res.attack = T.read === 'Strike' || T.read === 'Spell';
    res.attackKind = res.area ? 'Area' : T.read === 'Strike' ? 'Strike' : T.read === 'Spell' ? 'Spell' : null;
    if (res.dmg && !res.attackKind) res.attackKind = ab.type === 'Reaction' ? (scal === 'Spirit' ? 'Spell' : 'Strike') : 'Spell';
    res.rolls = !!(res.dmg || Object.keys(riders).length || has(items, 'debuff') || has(items, 'control') || has(items, 'amplify') || has(items, 'detonate'));
    res.sit = 0;
    hg.forEach(function (h) { if ((h.k || h) === 'Piercing') res.sit += 1; });

    // ---- summons, familiars, weapons, auras ----
    if (has(items, 'summon')) { res.summonHp = Math.floor(3 * E + 10 * S.M); res.summonAtk = Math.floor(0.6 * E); }
    if (has(items, 'familiar')) { res.famHp = Math.floor(4 * E + 20 * S.M); res.famAtk = Math.floor(0.5 * E); }
    if (has(items, 'weapon')) res.weaponDmg = Math.floor(1.6 * S.stat[S.basic.stat].E);
    var auraIt = items.filter(function (i) { return i.k === 'aura'; })[0];
    if (auraIt) {
      res.auraEffect = auraIt.effect || 'regen';
      res.auraVal = auraIt.effect === 'damage' ? Math.floor(0.4 * E) : Math.floor(0.15 * E);
    }
    var tr = items.filter(function (i) { return i.k === 'transform'; })[0];
    if (tr) res.transform = { stats: tr.stats || ['Power', 'Recovery'], steps: tpl && tpl.k === 'Ascendant' ? 2 : 1, rounds: 3 + durBonus };
    res.template = tpl;
    res.text = A.describe(ab, res, S);
    return res;
  };

  function d(S, v) { return R.fmt(S.disp(v)); }
  function rounds(n) { return n + ' Round' + (n === 1 ? '' : 's'); }

  /** Rules text generated from the items, with numbers at table scale. */
  A.describe = function (ab, res, S) {
    var items = ab.items || [], parts = [];
    var dur = res.durBonus || 0, timedUsed = false;
    function timed(base) { timedUsed = true; return rounds(base + dur); }
    var tgt = res.area ? 'every target in a ' + res.areaM + ' m area' : 'one target';
    var react = items.filter(function (i) { return i.k === 'react'; })[0];
    if (react) parts.push((react.trigger || 'As a Reaction') + ':');

    if (res.dmg) {
      var s = 'Deal ' + d(S, res.dmg) + ' damage to ' + tgt;
      if (res.area) s += ' (one roll, they Dodge)';
      parts.push(s + '.');
    }
    if (res.execute) parts.push('Against a target at a quarter of its Health or less: ' + d(S, res.dmgExec) + ' instead.');
    if (res.cond.Opportunist) parts.push('Against a target carrying your affliction: ' + d(S, res.cond.Opportunist) + '.');
    if (res.cond['Last Stand']) parts.push('While you are at half Health or less: ' + d(S, res.cond['Last Stand']) + '.');
    if (res.cond.Reaper) parts.push('Against a target at 25% Health or less: ' + d(S, res.cond.Reaper) + '.');
    if (res.drain) parts.push('You heal half the damage dealt.');

    var rk = Object.keys(res.riders);
    var hasOtherTimed = items.some(function (i) { return ['buff', 'debuff', 'shield', 'transform', 'dmgBuff', 'drBuff'].indexOf(i.k) >= 0; });
    if (rk.length) {
      var rtxt = rk.map(function (a) { return res.riders[a] + ' ' + (a === 'Doom (status)' ? 'Doom' : a); }).join(' and ');
      var extra = !hasOtherTimed && dur ? ' (lasting ' + dur + ' Upkeep' + (dur > 1 ? 's' : '') + ' longer)' : '';
      parts.push((res.dmg ? 'Applies ' : 'On a Graze or better, applies ') + rtxt + extra + '.');
      if (!hasOtherTimed && dur) timedUsed = true;
    }
    items.forEach(function (i) {
      switch (i.k) {
        case 'heal': parts.push('An ally within 10 m (or you) regains ' + d(S, res.heal) + ' Health.'); break;
        case 'shield': parts.push('A target gains ' + d(S, res.shield) + ' temporary Health for ' + timed(3) + '.'); break;
        case 'buff': parts.push('+' + (i.pts || 1) + ' edge on ' + (i.what || 'one roll') + ' for ' + timed(3) + '.'); break;
        case 'debuff': parts.push('On a Hit, the target takes −' + (i.pts || 1) + ' on ' + (i.what || 'one roll') + ' for ' + timed(3) + '.'); break;
        case 'dmgBuff': parts.push('One target deals +' + (10 * (i.n || 1)) + '% damage for ' + timed(3) + '.'); break;
        case 'drBuff': parts.push('One target gains 10% damage reduction for ' + timed(3) + '.'); break;
        case 'drPassive': parts.push('You have 5% damage reduction.'); break;
        case 'move': parts.push(/Dimension|Void/i.test(ab.keywords || '') ? 'Teleport up to 10 m.' : 'Move up to 10 m.'); break;
        case 'cleanse3': parts.push('Remove ' + (3 * (i.n || 1)) + ' affliction stacks from a target.'); break;
        case 'cleanseInst': parts.push('Remove one affliction from a target completely.'); break;
        case 'control': parts.push('Contest your ' + (res.scaling || 'Spirit') + ' against the target’s ' + (i.vs || 'Power') + '. If you win, it loses its next Major action' + (has(items, 'controlMove') ? ' and its next Move.' : '.')); break;
        case 'redirect': parts.push('For ' + timed(5) + ', 30% of the damage one ally takes comes to you instead.'); break;
        case 'passive': {
          var t = A.PASSIVE_PICKS[i.pick] || '';
          if (i.pick === 'rmit') t = '+0.10 Recovery Mitigation against ' + (i.aff || 'Bleed');
          if ((i.pick === 'sit' || i.pick === 'dmgcond' || i.pick === 'utility') && i.note) t = i.note;
          parts.push(t + (/(max|reg)$/.test(i.pick) ? ' (included on your sheet)' : '') + '.');
          break;
        }
        case 'weapon': parts.push('Conjure a weapon for ' + timed(10) + ': your Basic Attack deals ' + d(S, res.weaponDmg) + ' and reaches 4 m.'); break;
        case 'transform': parts.push('For ' + timed(3) + ', your ' + (i.stats || []).join(' and ') + ' count as ' + (res.transform.steps === 2 ? 'two Steps' : 'one Step') + ' higher: +' + res.transform.steps + ' to both bonuses and about ' + (res.transform.steps === 2 ? '32' : '15') + '% more from each.'); break;
        case 'summon': parts.push('Summon an ally for ' + timed(5) + ' with ' + d(S, res.summonHp) + ' Health; it attacks for ' + d(S, res.summonAtk) + ' when you spend your Minor action.'); break;
        case 'familiar': parts.push('Call a familiar with ' + d(S, res.famHp) + ' Health; it attacks for ' + d(S, res.famAtk) + ' when you spend your Minor action and returns an hour after being destroyed.'); break;
        case 'aura': parts.push((A.AURA_EFFECTS[i.effect || 'regen'] || '').replace('{aura}', d(S, res.auraVal)) + '.'); break;
        case 'amplify': parts.push('On a Graze or better, ' + (i.aff || 'Bleed') + ' on the target deals 25% more for 3 Rounds.'); break;
        case 'elongate': parts.push('On a Graze or better, ' + (i.aff || 'Poison') + ' on the target lasts ' + (i.n || 1) + ' Upkeep' + ((i.n || 1) > 1 ? 's' : '') + ' longer.'); break;
        case 'detonate': parts.push('On a Hit or better, ' + (i.aff || 'Bleed') + ' that has already hurt the target bursts for its remaining harm plus a quarter, and ends.'); break;
        case 'trigger': parts.push('On a Hit or better, every Doom on the target bursts now.'); break;
      }
    });
    if (dur && !timedUsed && !rk.length) parts.push('Its effects last ' + rounds(dur) + ' longer.');
    if (res.upkeep) parts.push('Costs ' + d(S, res.upkeep) + ' Mana each Round it stays on.');
    if (res.template) parts.push(res.template.k + ': ' + res.template.power + '. Drawback: ' + res.template.cost + '.');
    (ab.hg || []).forEach(function (h) {
      var k = h.k || h;
      if (k === 'Widened') parts.push('Widened: ' + (h.opt === 'targets' ? 'hits 2 targets at 60% each.' : 'area radius 25% larger.'));
      if (k === 'Combo') parts.push('Combo: if you used another ability of this essence earlier this Round, a Hit or better lands one tier higher.');
      if (k === 'Piercing') parts.push('Piercing: +1 edge on its roll.');
    });
    (ab.evo || []).forEach(function (e) {
      var k = e.k || e;
      if (k === 'Reach' && !res.area) parts.push('Reach: range 10 m longer.');
      if (k === 'Rank Feature' && e.note) parts.push(e.note);
      if (k === 'Reactive') parts.push('Can be used as a Reaction.');
    });
    if (parts.length > 1 && /:$/.test(parts[0])) parts[1] = parts[1].charAt(0).toLowerCase() + parts[1].slice(1);
    return parts.join(' ');
  };

  /** Rules text: custom text wins, with tokens replaced. */
  A.finalText = function (ab, res, S) {
    if (!ab.text) return res.text;
    var map = { dmg: res.dmg, heal: res.heal, shield: res.shield, aura: res.auraVal, exec: res.dmgExec, summonHp: res.summonHp, summonAtk: res.summonAtk, famHp: res.famHp, famAtk: res.famAtk, weapon: res.weaponDmg, cost: res.cost };
    return ab.text.replace(/\{(\w+)\}/g, function (m, k) { return map[k] != null ? R.fmt(S.disp(map[k])) : m; });
  };

  EA.abilities = A;
})(window.EA = window.EA || {});
