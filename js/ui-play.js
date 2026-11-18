/* Essence & Ascension — Character Forge
 * ui-play.js: the live sheet you play from.
 */
(function (EA) {
  'use strict';
  var U = EA.ui, R = EA.rules, A = EA.abilities, St = EA.store, P = EA.play;
  var esc = U.esc;
  U.state.edge = 0;

  function ctx() {
    var c = St.char(); if (!c) return null;
    var S = P.sheet(c); P.sync(c, S);
    return { c: c, p: c.play, S: S };
  }
  function commit() { St.touch(); U.render(); }

  // ======================= view =======================
  U.views.play = function () {
    var x = ctx(); if (!x) return U.views.home();
    var c = x.c, p = x.p, S = x.S;
    return U.topbar() + '<main class="wrap"><div class="play-grid"><div>' + head(c, p, S) + actions(c, p, S) + effectsPanel(c, p, S) + '</div>' +
      '<div>' + diceTray(c, p, S) + defensesPanel(c, p, S) + afflictionsPanel(c, p, S) + logPanel(p) + '</div></div></main>';
  };

  function head(c, p, S) {
    var turn;
    if (!p.inCombat) {
      turn = '<div class="turnbox"><div class="rnd">Out of combat</div><div class="row" style="justify-content:flex-end;margin-top:6px">' +
        '<button class="btn primary" data-act="pCombat">Start combat</button></div></div>';
    } else if (!S.tickEngine) {
      var pips = ''; for (var i = 0; i < Math.max(4, p.ap); i++) pips += '<i class="' + (i < p.ap ? 'on' : '') + '"></i>';
      turn = '<div class="turnbox"><div class="rnd">Round ' + p.round + (p.turnOver ? ' • waiting for your turn' : ' • your turn') + '</div>' +
        '<div class="ap" aria-label="' + p.ap + ' Action Points" style="margin:6px 0">' + pips + '</div><div class="row" style="justify-content:flex-end">' +
        (p.turnOver ? '<button class="btn primary sm" data-act="pStartTurn">Start my turn</button>' :
          '<button class="btn sm" data-act="pExert"' + (p.exerted || p.sp < S.dExert ? ' disabled' : '') + ' title="Pay ' + S.dExert + ' Stamina for 1 more AP">Exert (' + S.dExert + ' SP)</button>' +
          '<button class="btn primary sm" data-act="pEndTurn">End turn and Upkeep</button>') +
        '<button class="btn sm" data-act="pEndCombat">End combat</button></div></div>';
    } else {
      var ready = p.tick >= p.rd;
      turn = '<div class="turnbox"><div class="rnd">Tick ' + p.tick + ' • Round ' + p.round + ' • Anchor ' + p.anchor + '</div>' +
        '<div style="margin:4px 0" class="small">' + (ready ? '<span style="color:var(--ok)">Ready for a Major</span>' : 'Next Major at Tick ' + p.rd) + ' • Move ' + (p.freeMove ? 'used' : 'free') + ' • Minor ' + (p.freeMinor ? 'used' : 'free') + '</div>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn sm" data-act="pTick" data-d="0.5">+½ Tick</button><button class="btn sm" data-act="pTick" data-d="1">+1 Tick</button>' +
        (!ready ? '<button class="btn sm primary" data-act="pTickReady">To my ready Tick</button>' : '') +
        '<button class="btn sm" data-act="pSurge"' + (p.surged || ready || p.sp < S.dExert ? ' disabled' : '') + '>Surge (' + S.dExert + ' SP)</button>' +
        '<button class="btn sm" data-act="pUpkeep">Upkeep now</button><button class="btn sm" data-act="pEndCombat">End combat</button></div></div>';
    }
    function big(k, key, cls) {
      var pool = S.pool[k], cur = p[key], pct = pool.dMax ? Math.max(0, Math.min(100, cur / pool.dMax * 100)) : 0;
      var temp = k === 'HP' && p.temp ? Math.min(100, p.temp / pool.dMax * 100) : 0;
      return '<div class="bigpool"><div class="spread"><span class="quiet">' + pool.label + '</span><span class="small quiet">+' + pool.dReg + ' each Upkeep</span></div>' +
        '<div class="num">' + R.fmt(cur) + ' <small>/ ' + R.fmt(pool.dMax) + (k === 'HP' && p.temp ? ' • +' + p.temp + ' shield' : '') + '</small></div>' +
        '<div class="bar big ' + cls + '"><i class="v" style="width:' + pct + '%"></i>' + (temp ? '<i class="t" style="left:' + pct + '%;width:' + Math.min(temp, 100 - pct) + '%"></i>' : '') + '</div>' +
        '<div class="ctl"><input type="number" min="0" data-key="amt-' + k + '" data-input="pAmt" data-k="' + k + '" value="' + esc(U.state['amt' + k] || '') + '" placeholder="Amount" aria-label="' + pool.label + ' amount">' +
        (k === 'HP' ? '<button class="btn sm danger" data-act="pDmg">Damage</button><button class="btn sm" data-act="pHeal">Heal</button>' :
          '<button class="btn sm" data-act="pSpend" data-k="' + k + '">Spend</button><button class="btn sm" data-act="pGain" data-k="' + k + '">Regain</button>') + '</div></div>';
    }
    var downed = p.hp <= 0 ? '<div class="downed"><b style="font-family:var(--display)">Downed</b><span class="marks" aria-label="' + p.deathMarks + ' of 3 Death Marks">' +
      [0, 1, 2].map(function (i) { return '<i class="' + (i < p.deathMarks ? 'on' : '') + '"></i>'; }).join('') + '</span><span class="small">Each Upkeep an affliction would hurt you, you gain a Death Mark. Three and you die. Any healing brings you back.</span>' +
      '<button class="btn sm" data-act="pMark" data-d="1">+ Mark</button><button class="btn sm" data-act="pMark" data-d="-1">− Mark</button></div>' : '';
    return '<section class="panel"><div class="playhead"><span class="badge m-' + R.RANKS[c.rank] + '" aria-hidden="true">' + R.RANKS[c.rank][0] + '</span>' +
      '<div style="min-width:0"><p class="name">' + esc(c.name || 'Unnamed adventurer') + '</p><div class="quiet small">' + esc(S.rankName) + ' • ' + c.essences.filter(Boolean).join(', ') +
      (S.confluence && (c.confluence.revealed || c.options.gmView) ? ' • ' + esc(S.confluence.name) : '') + '</div></div>' + turn + '</div>' +
      '<div class="bigpools">' + big('HP', 'hp', 'HP') + big('MP', 'mp', 'MP') + big('SP', 'sp', 'SP') + '</div>' + downed +
      '<div class="row" style="margin-top:12px"><label class="small quiet">Shield <input type="number" min="0" data-key="shieldamt" data-input="pAmt" data-k="shield" value="' + esc(U.state.amtshield || '') + '" style="width:90px;display:inline-block"></label>' +
      '<button class="btn sm" data-act="pShield">Add temporary Health</button>' +
      (!p.inCombat ? '<button class="btn sm" data-act="pRestRound">Rest a Round</button><button class="btn sm" data-act="pRestHour">Rest an hour</button>' : '') +
      '<button class="btn sm" data-act="pReset" title="Refill everything and clear the fight">Reset play</button></div></section>';
  }

  function actionBtn(c, p, S, slot, ab) {
    var res = A.compute(ab, S), col = slot.split('-')[0];
    var colr = col === 'C' ? 'var(--gold)' : U.essColor(c.essences[+col.slice(1) - 1]);
    var cdLeft = S.tickEngine ? (p.readyAt[slot] && p.readyAt[slot] > p.tick ? 'ready at Tick ' + p.readyAt[slot] : '') : (p.cd[slot] ? p.cd[slot] + ' Round' + (p.cd[slot] > 1 ? 's' : '') + ' left' : '');
    var on = p.auras[slot] || p.effects.some(function (e) { return e.slot === slot; });
    if (ab.type === 'Passive') return '';
    return '<button class="act' + (cdLeft ? ' cool' : '') + (on ? ' on' : '') + '" style="--c:' + colr + '" data-act="pUse" data-slot="' + slot + '">' +
      '<b>' + esc(ab.name) + '</b><span class="meta"><span>' + esc(res.action) + '</span><span>' + esc(res.costText) + '</span>' +
      (res.dmg ? '<span>' + R.fmt(S.disp(res.dmg)) + ' dmg</span>' : res.heal ? '<span>heals ' + R.fmt(S.disp(res.heal)) + '</span>' : res.shield ? '<span>' + R.fmt(S.disp(res.shield)) + ' shield</span>' : '') +
      (cdLeft ? '<span class="cdtag">' + cdLeft + '</span>' : '') + (on ? '<span style="color:var(--glow)">active</span>' : '') + '</span></button>';
  }

  function actions(c, p, S) {
    var list = A.list(c).map(function (x) { return actionBtn(c, p, S, x.slot, x.ab); }).join('');
    var passives = A.list(c).filter(function (x) { return x.ab.type === 'Passive'; });
    var basics = '<button class="act" data-act="pUse" data-slot="basic" style="--c:var(--muted)"><b>Basic Attack</b><span class="meta"><span>Major</span><span>' + S.basic.stat + '</span><span>' + R.fmt(S.disp(S.basic.dmg)) + ' dmg' + (S.basic.reach ? ', 4 m reach' : '') + '</span></span></button>' +
      '<button class="act" data-act="pUse" data-slot="dart" style="--c:var(--muted)"><b>Mana Dart</b><span class="meta"><span>Major</span><span>' + S.disp(S.basic.dartCost) + ' MP</span><span>' + R.fmt(S.disp(S.basic.dart)) + ' dmg</span></span></button>' +
      (!S.tickEngine ? '<button class="act" data-act="pDefend" style="--c:var(--muted)"><b>Defend</b><span class="meta"><span>1 AP</span><span>+2 to all defenses until your next turn</span></span></button>' :
        '<button class="act" data-act="pDefend" style="--c:var(--muted)"><b>Defend</b><span class="meta"><span>Free Minor</span><span>+2 to all defenses until your next Anchor</span></span></button>') +
      '<button class="act" data-act="pMove" style="--c:var(--muted)"><b>Move</b><span class="meta"><span>' + (S.tickEngine ? 'Free once per Round' : '1 AP') + '</span><span>' + S.move + ' m</span></span></button>';
    return '<section class="panel"><div class="spread"><h3 style="margin:0">Actions</h3><span class="small quiet">Tap an ability to use it. The forge pays the cost, starts the cooldown and rolls.</span></div>' +
      '<div class="actions" style="margin-top:12px">' + (list || '<p class="quiet">No abilities yet. Build them in the Forge.</p>') + '</div>' +
      '<h3 style="margin-top:18px">Always available</h3><div class="actions">' + basics + '</div>' +
      (passives.length ? '<p class="small quiet" style="margin:12px 0 0">Always on: ' + passives.map(function (x) { return '<b>' + U.xref('cab:' + c.id + ':' + x.slot, x.ab.name, 'title') + '</b>'; }).join(', ') + '. Their bonuses are already in your numbers.</p>' : '') + '</section>';
  }

  function effectsPanel(c, p, S) {
    var fx = p.effects.map(function (e, i) {
      return '<span class="chip on">' + esc(e.name) + (e.rounds != null ? ' • ' + e.rounds + ' Round' + (e.rounds === 1 ? '' : 's') : '') +
        ' <button class="btn sm" style="padding:0 6px" data-act="pFxEnd" data-i="' + i + '" aria-label="End ' + esc(e.name) + '">×</button></span>';
    }).join(' ');
    var auras = Object.keys(p.auras).filter(function (k) { return p.auras[k] && c.abilities[k]; }).map(function (k) {
      return '<span class="chip on">' + esc(c.abilities[k].name) + ' (aura) <button class="btn sm" style="padding:0 6px" data-act="pAuraOff" data-slot="' + k + '">×</button></span>';
    }).join(' ');
    var press = '';
    if (S.aura.available) {
      var bars = ''; for (var i = 0; i < S.aura.strainMax; i++) bars += '<i class="' + (i < p.strain ? 'on' + (p.strain >= S.aura.strainMax - 2 ? ' hot' : '') : '') + '"></i>';
      press = '<hr class="rule"><div class="spread"><h3 style="margin:0">Aura</h3><span class="small quiet">Output ' + R.sign(S.aura.AO) + ' • Defense ' + R.sign(S.aura.AD) + ' • Radius ' + S.aura.radius + ' m</span></div>' +
        '<div class="spread small" style="margin:8px 0 4px"><span>Strain ' + p.strain + ' / ' + S.aura.strainMax + (p.collapse ? ' • Collapsed for ' + p.collapse + ' Round' + (p.collapse > 1 ? 's' : '') : '') + '</span><span class="quiet">Recover ' + S.aura.strainRecovery + ' per quiet Upkeep</span></div>' +
        '<div class="strain">' + bars + '</div><div class="row" style="margin-top:10px">' +
        '<label class="small"><input type="checkbox" data-act="pAuraMode" data-k="press"' + (p.press ? ' checked' : '') + (p.collapse ? ' disabled' : '') + '> Press (+1 Strain a Round)</label>' +
        '<label class="small"><input type="checkbox" data-act="pAuraMode" data-k="suppress"' + (p.suppress ? ' checked' : '') + (p.collapse ? ' disabled' : '') + '> Suppression field (+2)</label>' +
        (c.rank >= 4 ? '<label class="small"><input type="checkbox" data-act="pAuraMode" data-k="domain"' + (p.domain ? ' checked' : '') + (p.collapse ? ' disabled' : '') + '> Domain (+2)</label>' : '') +
        '<button class="btn sm" data-act="pClash">' + U.icon('d20') + ' Aura Clash</button></div>' +
        (S.aura.pressure ? '<p class="small quiet" style="margin:8px 0 0">Rank pressure: ' + S.aura.pressure + '.</p>' : '');
    }
    if (!fx && !auras && !press) return '';
    return '<section class="panel"><h3>Active effects</h3>' + (fx || auras ? '<div class="row">' + fx + auras + '</div>' : '<p class="quiet small" style="margin:0">Nothing active.</p>') + press + '</section>';
  }

  function diceTray(c, p, S) {
    var r = U.state.lastRoll;
    var die = '<div class="die' + (U.state.dieAnim ? ' rolling' : '') + (r && r.d === 20 ? ' nat20' : r && r.d === 1 ? ' nat1' : '') + '">' + U.dieSVG() + '<b>' + (r ? r.d : '20') + '</b></div>';
    var out = r ? '<div class="rollout"><div class="quiet small">' + esc(r.label) + '</div><div class="total">' + r.total + '</div><div class="small quiet">d20 ' + r.d + ' ' + R.sign(r.bonus) + (r.edge ? ' (edge ' + R.sign(r.edge) + ')' : '') + '</div>' +
      (r.d === 20 ? '<div class="small" style="color:var(--gold-soft)">Natural 20: one step better, and it succeeds unless the foe outranks you.</div>' : '') +
      (r.d === 1 ? '<div class="small" style="color:var(--bad)">Natural 1: one step worse, and it fails unless you outrank the foe.</div>' : '') + '</div>' : '<p class="quiet small" style="text-align:center">Only the side taking the action rolls. Tell the GM your total.</p>';
    var checks = R.STATS.map(function (k) { return '<button class="btn sm" data-act="pCheck" data-k="' + k + '">' + k + ' ' + R.sign(S.stat[k].cm) + '</button>'; }).join('');
    return '<section class="panel">' + die + out + '<hr class="rule"><div class="spread"><span class="small quiet">Edge or penalty from the situation</span>' +
      '<div class="stepper" style="grid-template-columns:32px 46px 32px"><button data-act="pEdge" data-d="-1" style="height:32px" aria-label="Lower edge">−</button><output style="font-size:22px">' + R.sign(U.state.edge) + '</output><button data-act="pEdge" data-d="1" style="height:32px" aria-label="Raise edge">+</button></div></div>' +
      '<div class="row" style="margin-top:10px">' + checks + '</div><div class="row" style="margin-top:8px"><button class="btn primary sm" data-act="pInit">' + U.icon('d20') + ' Initiative ' + R.sign(S.init) + '</button>' +
      (S.tickEngine && p.initRoll ? '<label class="small quiet">Highest Initiative in the fight <input type="number" data-type="intnull" data-bind="play.topInit" value="' + (p.topInit == null ? '' : p.topInit) + '" style="width:80px;display:inline-block"></label>' : '') + '</div></section>';
  }

  function defensesPanel(c, p, S) {
    var defend = p.effects.some(function (e) { return e.name === 'Defend'; }) ? 2 : 0;
    var exh = p.sp <= 0 ? 2 : 0, rd = P.necrosisRD(p), nec = Math.min(2, Math.floor(rd / 2));
    var st = S.stat;
    var dodge = st.Speed.cm - exh + defend, brace = st.Power.cm - nec + defend, ward = st.Spirit.cm - nec + defend;
    var notes = [];
    if (defend) notes.push('Defend +2');
    if (exh) notes.push('Exhausted: −2 Dodge');
    if (nec) notes.push('Necrosis: −' + nec + ' Brace and Ward');
    function res(stat) { return R.sign(st[stat].cm); }
    return '<section class="panel"><h3>Defenses</h3><dl class="kv"><dt>Against strikes</dt><dd><b>' + R.sign(Math.max(dodge, brace)) + '</b> <span class="quiet">' + (dodge >= brace ? 'Dodge' : 'Brace') + '</span></dd>' +
      '<dt>Against spells</dt><dd><b>' + R.sign(Math.max(dodge, ward)) + '</b> <span class="quiet">' + (dodge >= ward ? 'Dodge' : 'Ward') + '</span></dd>' +
      '<dt>Against areas</dt><dd><b>' + R.sign(dodge) + '</b> <span class="quiet">Dodge</span></dd>' +
      '<dt>Resist Bleed / Poison</dt><dd>' + res('Power') + ' / ' + res('Recovery') + '</dd><dt>Resist Necrosis and Doom</dt><dd>' + res('Spirit') + '</dd>' +
      (S.dr ? '<dt>Damage reduction</dt><dd>' + Math.round(S.dr * 100) + '%</dd>' : '') +
      (S.outworlder ? '<dt>Mind magic</dt><dd>+2 edge</dd>' : '') + '</dl>' +
      (notes.length ? '<p class="small" style="color:var(--warn);margin:8px 0 0">' + notes.join(' • ') + '</p>' : '') + '</section>';
  }

  function afflictionsPanel(c, p, S) {
    var f = U.state.affForm || (U.state.affForm = { type: 'Bleed', stacks: 2, source: 'Enemy', raw: 14, rank: c.rank, rs: c.rs });
    var list = p.afflictions.map(function (a) {
      var t = P.tickValue(a), cls = a.type.split(' ')[0];
      var next = a.type === 'Doom (status)' ? 'bursts for about ' + P.eruption(a) + ' when it ends' : 'next tick ' + t.hp + ' Health' + (t.sp ? ', ' + t.sp + ' Stamina' : '');
      return '<div class="aff ' + cls + '"><b>' + U.xref('aff:' + a.type, a.type === 'Doom (status)' ? 'Doom' : a.type, 'title') + ' ×' + a.S + '</b><span class="small quiet">' + a.D + ' Upkeep' + (a.D === 1 ? '' : 's') + ' left</span>' +
        '<div class="meta">From ' + esc(a.source) + ' • ' + next + ' • mitigated ' + Math.round(a.rmit * 100) + '%' + (a.type === 'Doom (status)' ? ' • counted ' + a.K + ' ticks' : '') + (a.type === 'Poison' ? ' • worsening' : '') + '</div>' +
        '<div class="btns">' + (a.type !== 'Doom (status)' ? '<button class="btn sm" data-act="pCleanse" data-id="' + a.id + '" data-how="three">Cleanse ' + (a.type === 'Necrosis' ? '1' : '3') + '</button>' : '') +
        (a.type === 'Necrosis' ? '<button class="btn sm" data-act="pCleanse" data-id="' + a.id + '" data-how="three-strong" title="Pure, Life, Renewal, Light or Sun cleanse">Strong cleanse 3</button>' : '') +
        (a.type === 'Bleed' ? '<button class="btn sm" data-act="pCleanse" data-id="' + a.id + '" data-how="bind">Bind Wounds −2</button>' : '') +
        '<button class="btn sm" data-act="pCleanse" data-id="' + a.id + '" data-how="all">' + (a.type === 'Poison' ? 'Antidote / remove' : 'Remove') + '</button></div></div>';
    }).join('');
    var b = function (k) { return 'data-root="aff" data-bind="' + k + '"'; };
    var form = '<details class="hood"' + (p.afflictions.length ? '' : ' open') + '><summary>Something afflicted you</summary><div class="grid2" style="margin-top:6px">' +
      '<label class="f"><span>Affliction</span><select ' + b('type') + '>' + Object.keys(R.AFFLICTIONS).map(function (t) { return '<option' + (f.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span>Stacks that landed</span><input type="number" min="1" max="10" data-type="int" ' + b('stacks') + ' value="' + f.stacks + '"></label>' +
      '<label class="f"><span>From</span><input type="text" ' + b('source') + ' value="' + esc(f.source) + '"></label>' +
      '<label class="f"><span>Their stat (raw)</span><input type="number" min="1" max="30" data-type="int" ' + b('raw') + ' value="' + f.raw + '"></label>' +
      '<label class="f"><span>Their rank</span><select data-type="int" ' + b('rank') + '>' + R.RANKS.map(function (n, i) { return '<option value="' + i + '"' + (f.rank === i ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span>Their Step</span><input type="number" min="0" max="9" data-type="int" ' + b('rs') + ' value="' + f.rs + '"></label></div>' +
      '<p class="small quiet" style="margin:0 0 8px">Ask your GM for the attacker’s stat and rank. The forge works out the per-Upkeep harm and how much your Recovery shrugs off.</p>' +
      '<button class="btn sm primary" data-act="pAffAdd">Add affliction</button></details>';
    return '<section class="panel"><h3>Afflictions on you</h3>' + (list || '<p class="quiet small" style="margin:0">None. They tick at your Upkeep.</p>') + form + '</section>';
  }
  U.roots.aff = function () { return U.state.affForm; };

  function logPanel(p) {
    return '<section class="panel"><div class="spread"><h3 style="margin:0">Log</h3><button class="btn sm" data-act="pClearLog">Clear</button></div><div class="log" data-scroll="log" style="margin-top:10px">' +
      p.log.map(function (l) { return '<div class="' + l.kind + '"><time>' + esc(l.at) + '</time>' + esc(l.text) + '</div>'; }).join('') + '</div></section>';
  }

  // ======================= rolling =======================
  U.rollD20 = function (label, bonus, opts) {
    var x = ctx(), d = U.d20(), edge = Math.max(-5, Math.min(5, (opts && opts.sit || 0) + U.state.edge));
    var total = d + bonus + edge;
    U.state.lastRoll = { label: label, d: d, bonus: bonus, edge: edge, total: total };
    U.state.dieAnim = true; setTimeout(function () { U.state.dieAnim = false; }, 650);
    P.log(x.p, label + ': ' + total + ' (d20 ' + d + ' ' + R.sign(bonus) + (edge ? ', edge ' + R.sign(edge) : '') + ')' + (d === 20 ? ' natural 20!' : d === 1 ? ' natural 1.' : ''), 'roll');
    St.touch();
    return U.state.lastRoll;
  };

  // ======================= use an ability =======================
  function useModal() {
    var x = ctx(), u = U.state.use, c = x.c, p = x.p, S = x.S;
    var ab, res, name;
    if (u.slot === 'basic' || u.slot === 'dart') {
      var isDart = u.slot === 'dart';
      ab = { name: isDart ? 'Mana Dart' : 'Basic Attack', type: isDart ? 'Spell' : 'Special Attack', scaling: isDart ? 'Spirit' : S.basic.stat, cd: null, items: [], hg: [], evo: [] };
      res = { dmg: isDart ? S.basic.dart : S.basic.dmg, cost: isDart ? S.basic.dartCost : 0, dCost: isDart ? S.disp(S.basic.dartCost) : 0, resource: isDart ? 'MP' : null, costText: isDart ? S.disp(S.basic.dartCost) + ' MP' : 'No cost', cdText: '—', action: 'Major', rolls: true, scaling: ab.scaling, sit: 0, riders: {}, cond: {}, text: '', attackKind: isDart ? 'Spell' : 'Strike', castTime: S.castTime(isDart ? 'Mana Dart' : 'Basic Attack') };
      res.text = isDart ? 'A bolt of raw mana for ' + R.fmt(S.disp(res.dmg)) + ' damage.' : 'A weapon strike for ' + R.fmt(S.disp(res.dmg)) + ' damage' + (S.basic.reach ? ' with 4 m reach' : '') + '.';
    } else { ab = c.abilities[u.slot]; res = A.compute(ab, S); }
    name = ab.name;
    var blockers = whyNot(x, u.slot, ab, res);
    var body = '';
    if (!u.used) {
      body = (u.slot === 'basic' || u.slot === 'dart' ? '<div class="card"><p class="ttl">' + esc(name) + '</p><div class="body">' + esc(res.text) + '</div></div>' : U.cardHTML(ab, res, S, u.slot, 'cab:' + c.id + ':' + u.slot)) +
        (blockers.length ? '<ul class="issues">' + blockers.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '') +
        '<div class="row" style="margin-top:14px"><button class="btn primary" data-act="pDoUse"' + (blockers.length && !u.force ? ' disabled' : '') + '>' + (res.rolls ? U.icon('d20') + ' Use and roll' : 'Use it') + '</button>' +
        (blockers.length ? '<label class="small"><input type="checkbox" data-act="pForce"' + (u.force ? ' checked' : '') + '> Use anyway (GM allows)</label>' : '') +
        '<button class="btn" data-act="closeModal">Cancel</button></div>';
    } else {
      var r = u.roll;
      body = '<div class="grid2"><div>' + (r ? '<div class="die' + (r.d === 20 ? ' nat20' : r.d === 1 ? ' nat1' : '') + '">' + U.dieSVG() + '<b>' + r.d + '</b></div><div class="rollout"><div class="total">' + r.total + '</div><div class="small quiet">d20 ' + r.d + ' ' + R.sign(r.bonus) + (r.edge ? ', edge ' + R.sign(r.edge) : '') + '</div>' +
        '<p class="small">Tell your GM <b>' + r.total + '</b>' + (res.attackKind ? ' against their ' + (res.attackKind === 'Strike' ? 'Dodge or Brace' : res.attackKind === 'Spell' ? 'Dodge or Ward' : 'Dodge (area)') : '') + '.' +
        (res.area ? ' Against foes of your rank or lower an area attack is at least a Graze.' : '') + (Object.keys(res.riders).length ? ' The same total is checked against their resistance for the afflictions.' : '') + '</p></div>' : '<p>Done. ' + esc(name) + ' is spent.</p>') + '</div><div>';
      if (res.dmg) {
        body += '<p class="small quiet" style="margin-top:0">When the GM calls the result, tap it:</p><div style="display:grid;gap:6px">' + R.HIT_TIERS.map(function (t, i) {
          var v = t.dm ? S.disp(R.applyDM(res.dmg, t.dm)) : 0;
          return '<button class="btn' + (u.tier === i ? ' primary' : '') + '" data-act="pTier" data-i="' + i + '" style="justify-content:space-between"><span>' + t.label + '</span><b>' + R.fmt(v) + '</b></button>';
        }).join('') + '</div>';
        if (res.execute || res.cond.Reaper) body += '<p class="small quiet">Against a badly wounded target use the higher figure on the card.</p>';
      }
      if (res.heal) body += '<div class="row" style="margin-top:10px"><button class="btn" data-act="pSelfHeal" data-n="' + S.disp(res.heal) + '">Heal myself ' + S.disp(res.heal) + '</button><span class="small quiet">or tell the ally they regain ' + S.disp(res.heal) + '.</span></div>';
      if (res.shield) body += '<div class="row" style="margin-top:10px"><button class="btn" data-act="pSelfShield" data-n="' + S.disp(res.shield) + '" data-r="' + (3 + (res.durBonus || 0)) + '">Shield myself ' + S.disp(res.shield) + '</button><span class="small quiet">or give it to an ally.</span></div>';
      body += '</div></div><div class="row" style="margin-top:16px"><button class="btn primary" data-act="closeModal">Done</button></div>';
    }
    return '<div class="modal" style="width:min(760px,100%)" role="dialog" aria-modal="true" aria-label="Use ' + esc(name) + '"><div class="panel"><button class="iconbtn x" data-act="closeModal" aria-label="Close">' + U.icon('close') + '</button><h2>' + esc(name) + '</h2>' + body + '</div></div>';
  }

  function whyNot(x, slot, ab, res) {
    var c = x.c, p = x.p, S = x.S, out = [];
    if (p.hp <= 0) out.push('You are Downed and cannot act.');
    var isMajor = res.action === 'Major' || res.action === 'Major to call';
    var isMinor = /^Minor/.test(res.action);
    var isReaction = res.action === 'Reaction';
    if (p.inCombat) {
      if (!S.tickEngine) {
        var ap = p.turnOver && !isReaction ? Math.min(4, 3 + (p.carry || 0)) : p.ap;
        var majorUsed = p.turnOver ? false : p.majorUsed;
        if (isMajor && majorUsed) out.push('You have already taken a Major action this turn.');
        if (isMajor && ap < 2) out.push('A Major action needs 2 AP.');
        if (isMinor && ap < 1) out.push('A Minor action needs 1 AP.');
      } else {
        if (isMajor && p.tick < p.rd) out.push('Your next Major is ready at Tick ' + p.rd + '.');
        if (isMinor && p.freeMinor) out.push('You have used this Round’s free Minor.');
      }
      if (isReaction && p.reactionUsed) out.push('You have used this Round’s Reaction.');
      if (S.tickEngine ? (p.readyAt[slot] > p.tick) : p.cd[slot]) out.push('Still cooling down.');
    }
    var pay = res.dCost;
    if (res.resource && pay && p[res.resource.toLowerCase()] < pay) out.push('Not enough ' + (res.resource === 'MP' ? 'Mana' : 'Stamina') + ' (' + pay + ' needed).');
    if (ab.type === 'Aura' && p.auras[slot]) out.push('Already active. Turn it off from Active effects.');
    return out;
  }

  var act = U.actions;
  act.pUse = function (el) { U.state.use = { slot: el.getAttribute('data-slot'), used: false }; U.openModal(useModal); };
  act.pForce = function () { U.state.use.force = !U.state.use.force; U.render(); };
  act.pDoUse = function () {
    var x = ctx(), u = U.state.use, c = x.c, p = x.p, S = x.S, ab, res;
    if (u.slot === 'basic' || u.slot === 'dart') {
      var isDart = u.slot === 'dart';
      ab = { name: isDart ? 'Mana Dart' : 'Basic Attack', type: 'Spell', items: [] };
      res = { action: 'Major', resource: isDart ? 'MP' : null, dCost: isDart ? S.disp(S.basic.dartCost) : 0, rolls: true, scaling: isDart ? 'Spirit' : S.basic.stat, sit: 0, cdRounds: 0, castTime: S.castTime(isDart ? 'Mana Dart' : 'Basic Attack') };
    } else { ab = c.abilities[u.slot]; res = A.compute(ab, S); }
    P.ensureTurn(c);
    if (res.resource && res.dCost) P.spend(c, res.resource, res.dCost);
    var isMajor = res.action === 'Major' || res.action === 'Major to call', isMinor = /^Minor/.test(res.action), isReaction = res.action === 'Reaction';
    if (p.inCombat) {
      if (!S.tickEngine) {
        if (isMajor) { p.ap = Math.max(0, p.ap - 2); p.majorUsed = true; }
        else if (isMinor) p.ap = Math.max(0, p.ap - 1);
        if (res.cdRounds) p.cd[u.slot] = res.cdRounds;
      } else {
        if (isMajor) { p.rd = p.tick + S.majorRecovery; }
        if (isMinor) p.freeMinor = true;
        if (res.cdTicks) p.readyAt[u.slot] = p.tick + (res.castTime || 0) + res.cdTicks;
      }
      if (isReaction) p.reactionUsed = true;
    }
    // ongoing effects
    var items = ab.items || [];
    items.forEach(function (it) {
      if (it.k === 'transform') {
        var rs = {}; (it.stats || []).forEach(function (s) { rs[s] = (rs[s] || 0) + res.transform.steps; });
        p.effects.push({ name: ab.name, slot: u.slot, rounds: res.transform.rounds, rs: rs });
      }
      if (it.k === 'weapon') p.effects.push({ name: ab.name, slot: u.slot, rounds: 10 + (res.durBonus || 0), weapon: true });
      if (it.k === 'summon') p.effects.push({ name: ab.name + ' (summon, ' + S.disp(res.summonHp) + ' Health)', slot: u.slot, rounds: 5 + (res.durBonus || 0) });
      if (it.k === 'familiar') p.effects.push({ name: ab.name + ' (familiar, ' + S.disp(res.famHp) + ' Health)', slot: u.slot, rounds: null });
      if (it.k === 'aura') p.auras[u.slot] = true;
      if (it.k === 'buff' && /dodge|defen|brace|ward/i.test(it.what || '') && !items.some(function (i) { return i.k === 'heal' || i.k === 'shield'; }))
        p.effects.push({ name: ab.name + ': +' + (it.pts || 1) + ' ' + (it.what || ''), slot: u.slot, rounds: 3 + (res.durBonus || 0) });
    });
    if (res.template && res.template.k === 'Annihilation') { var self = Math.floor(0.05 * S.pool.HP.dMax); p.hp = Math.max(0, p.hp - self); P.log(p, 'Annihilation costs you ' + self + ' Health.', 'dmg'); }
    if (res.template && res.template.k === 'Void') p.hollow = true;
    P.log(p, 'Used ' + ab.name + (res.dCost ? ' (−' + res.dCost + ' ' + res.resource + ')' : '') + '.', 'roll');
    u.used = true;
    if (res.rolls && res.scaling) u.roll = U.rollD20(ab.name, S.stat[res.scaling].cm, { sit: res.sit });
    commit();
  };
  act.pTier = function (el) {
    var x = ctx(), u = U.state.use, i = +el.getAttribute('data-i'), S = x.S;
    var ab = u.slot === 'basic' || u.slot === 'dart' ? null : x.c.abilities[u.slot];
    var base = ab ? A.compute(ab, S).dmg : (u.slot === 'dart' ? S.basic.dart : S.basic.dmg);
    var t = R.HIT_TIERS[i], v = t.dm ? S.disp(R.applyDM(base, t.dm)) : 0;
    if (u.tier == null) {
      P.log(x.p, (ab ? ab.name : u.slot === 'dart' ? 'Mana Dart' : 'Basic Attack') + ': ' + t.label + ' for ' + v + ' damage.', 'dmg');
      if (ab && A.compute(ab, S).drain && v) P.heal(x.c, S, Math.floor(v * 0.5), 'Drain');
    }
    u.tier = i; commit();
  };
  act.pSelfHeal = function (el) { var x = ctx(); P.heal(x.c, x.S, +el.getAttribute('data-n'), U.state.use ? x.c.abilities[U.state.use.slot] && x.c.abilities[U.state.use.slot].name : ''); commit(); };
  act.pSelfShield = function (el) { var x = ctx(); P.shield(x.c, +el.getAttribute('data-n'), +el.getAttribute('data-r')); commit(); };

  // pools
  act.pAmt = function (el) { U.state['amt' + el.getAttribute('data-k')] = el.value; };
  function amt(k) { var v = parseInt(U.state['amt' + k], 10); U.state['amt' + k] = ''; return isNaN(v) ? 0 : v; }
  act.pDmg = function () { var x = ctx(); P.damage(x.c, x.S, amt('HP')); commit(); };
  act.pHeal = function () { var x = ctx(); P.heal(x.c, x.S, amt('HP')); commit(); };
  act.pSpend = function (el) { var x = ctx(), k = el.getAttribute('data-k'), n = amt(k), key = k.toLowerCase(); x.p[key] = Math.max(0, x.p[key] - n); P.log(x.p, 'Spent ' + n + ' ' + k + '.', ''); commit(); };
  act.pGain = function (el) { var x = ctx(), k = el.getAttribute('data-k'), n = amt(k), key = k.toLowerCase(); x.p[key] = Math.min(x.S.pool[k].dMax, x.p[key] + n); P.log(x.p, 'Regained ' + n + ' ' + k + '.', 'up'); commit(); };
  act.pShield = function () { var x = ctx(), n = amt('shield'); if (n) P.shield(x.c, n, 3); commit(); };
  act.pMark = function (el) { var x = ctx(); x.p.deathMarks = Math.max(0, Math.min(3, x.p.deathMarks + (+el.getAttribute('data-d')))); commit(); };
  act.pRestRound = function () { P.restRound(ctx().c); commit(); };
  act.pRestHour = function () { P.restHour(ctx().c); commit(); };
  act.pReset = function () {
    var c = St.char(); var keepLog = c.play.log; c.play = St.newPlay(); c.play.log = keepLog;
    P.log(c.play, 'Play reset: pools full, fight cleared.', 'up'); commit();
  };

  // turns
  act.pCombat = function () { P.startCombat(ctx().c); commit(); };
  act.pEndCombat = function () { P.endCombat(ctx().c); commit(); };
  act.pEndTurn = function () { P.endTurn(ctx().c); commit(); };
  act.pStartTurn = function () { P.startTurn(ctx().c); commit(); };
  act.pUpkeep = function () { P.upkeep(ctx().c); commit(); };
  act.pExert = function () {
    var x = ctx(); P.ensureTurn(x.c);
    if (x.p.exerted || !P.spend(x.c, 'SP', x.S.dExert)) return;
    x.p.ap += 1; x.p.exerted = true; P.log(x.p, 'Exert: −' + x.S.dExert + ' SP for 1 more AP.', ''); commit();
  };
  act.pDefend = function () {
    var x = ctx(), p = x.p; P.ensureTurn(x.c);
    if (p.inCombat && !x.S.tickEngine) { if (p.ap < 1) return U.toast('Defend needs 1 AP.'); p.ap--; }
    if (p.inCombat && x.S.tickEngine) { if (p.freeMinor) return U.toast('You have used this Round’s free Minor.'); p.freeMinor = true; }
    p.effects = p.effects.filter(function (e) { return e.name !== 'Defend'; });
    p.effects.push({ name: 'Defend', rounds: 1 }); P.log(p, 'Defend: +2 to all defenses until your next turn.', ''); commit();
  };
  act.pMove = function () {
    var x = ctx(), p = x.p; P.ensureTurn(x.c);
    if (p.inCombat && !x.S.tickEngine) { if (p.ap < 1) return U.toast('Moving needs 1 AP.'); p.ap--; }
    if (p.inCombat && x.S.tickEngine) { if (p.freeMove) return U.toast('You have used this Round’s free Move.'); p.freeMove = true; }
    P.log(p, 'Moved up to ' + x.S.move + ' m.', ''); commit();
  };
  act.pTick = function (el) { var x = ctx(); P.advance(x.c, x.p.tick + (+el.getAttribute('data-d'))); commit(); };
  act.pTickReady = function () { var x = ctx(); P.advance(x.c, x.p.rd); commit(); };
  act.pSurge = function () {
    var x = ctx(), p = x.p;
    if (p.surged || !P.spend(x.c, 'SP', x.S.dExert)) return;
    p.rd = Math.max(p.tick, p.rd - 1); p.surged = true; P.log(p, 'Surge: −' + x.S.dExert + ' SP, ready 1 Tick sooner.', ''); commit();
  };
  act.pFxEnd = function (el) { var x = ctx(); var e = x.p.effects.splice(+el.getAttribute('data-i'), 1)[0]; if (e) P.log(x.p, e.name + ' ends.', ''); commit(); };
  act.pAuraOff = function (el) { var x = ctx(); x.p.auras[el.getAttribute('data-slot')] = false; commit(); };
  act.pAuraMode = function (el) {
    var x = ctx(), k = el.getAttribute('data-k'), p = x.p;
    p[k] = !p[k];
    if (k === 'press' && p.press) p.suppress = false;
    if (k === 'suppress' && p.suppress) { p.press = false; p.domain = false; }
    if (k === 'domain' && p.domain) p.suppress = false;
    commit();
  };
  act.pClash = function () { var x = ctx(); U.rollD20('Aura Clash', x.S.aura.AO); commit(); };

  // dice
  act.pEdge = function (el) { U.state.edge = Math.max(-5, Math.min(5, U.state.edge + (+el.getAttribute('data-d')))); U.render(); };
  act.pCheck = function (el) { var x = ctx(), k = el.getAttribute('data-k'); U.rollD20(k + ' check', x.S.stat[k].cm); U.render(); };
  act.pInit = function () {
    var x = ctx(), r = U.rollD20('Initiative', x.S.init), p = x.p;
    p.initRoll = r.total;
    if (p.topInit == null || p.topInit < r.total) p.topInit = r.total;
    p.anchor = Math.min(6, 1 + Math.floor(Math.max(0, p.topInit - p.initRoll) / 4));
    if (!p.inCombat) P.startCombat(x.c);
    p.rd = p.anchor; if (x.S.tickEngine) p.tick = 1;
    commit();
  };
  act.pClearLog = function () { ctx().p.log = []; commit(); };

  // afflictions
  act.pAffAdd = function () { var x = ctx(); P.addAffliction(x.c, x.S, U.state.affForm); commit(); };
  act.pCleanse = function (el) { var x = ctx(); P.cleanse(x.c, el.getAttribute('data-id'), el.getAttribute('data-how')); commit(); };

  // anchor follows the top Initiative entered (Ch4 §4.3.4)
  var prev = U.onBind;
  U.onBind = function (root, path) {
    if (prev) prev(root, path);
    if (root === 'char' && path === 'play.topInit') {
      var p = St.char().play;
      if (p.initRoll != null && p.topInit != null) p.anchor = Math.min(6, 1 + Math.floor(Math.max(0, p.topInit - p.initRoll) / 4));
    }
  };
})(window.EA = window.EA || {});
