/* Essence & Ascension — GM desk
 * gm-ui.js: the GM pages. Encounter, Foes, Party, Awakening & loot, Reference.
 */
(function (EA) {
  'use strict';
  var U = EA.ui, R = EA.rules, A = EA.abilities, D = EA.data, St = EA.store, P = EA.play, G = EA.gm, L = EA.library;
  var esc = U.esc, act = U.actions;
  U.state.gm = { foe: null, atk: null, awaken: { ess: 'Blood', stone: '', ow: false, roll: null, hg: [], tpl: null }, loot: [], conf: ['', '', ''], confRoll: null,
    odds: { cmA: 6, cmD: 6, rA: 0, rD: 0, area: false }, haz: { rank: 0, diff: 'Standard', cm: 7 }, tab: { raw: 13, r: 0, rs: 0, q: '', fam: '', rar: '' }, addN: {}, addGroup: {}, amt: {} };
  var GS = U.state.gm;

  function enc() { return G.state.enc; }
  function commit() { G.save(); U.render(); }
  U.roots.enc = function () { return G.state.enc; };
  U.roots.foe = function () { return G.state.foes[GS.foe]; };
  U.roots.gm = function () { return GS; };

  // ======================= top bar =======================
  function topbar() {
    var r = U.state.route;
    function m(id, label) { return '<button data-act="gmGo" data-to="' + id + '"' + (r === id ? ' aria-current="page"' : '') + '>' + label + '</button>'; }
    return '<header class="topbar"><a class="brand" href="index.html" title="Back to the table tools">' + EA.mark() + '<span><b>Essence &amp; Ascension</b><small>Game Master’s desk</small></span></a>' +
      '<nav class="modes" aria-label="GM pages">' + m('play', 'Play') + m('encounter', 'Encounter') + m('foes', 'Foes') + m('party', 'Party') + m('awaken', 'Awakening') + m('reference', 'Reference') + m('codex', 'Codex') + '</nav></header>';
  }
  U.gmTopbar = topbar;
  act.gmGo = function (el) {
    U.state.route = el.getAttribute('data-to'); U.modal = null; EA.codex.stack = [];
    try { history.replaceState(null, '', '#' + U.state.route); } catch (e) { /* ignore */ }
    window.scrollTo(0, 0); U.render();
  };
  function rankSel(bind, val, root, withNull) {
    return '<select data-type="int" data-root="' + root + '" data-bind="' + bind + '" style="width:auto">' + R.RANKS.map(function (n, i) { return '<option value="' + i + '"' + (val === i ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>';
  }
  function stepSel(bind, val, root) {
    return '<select data-type="int" data-root="' + root + '" data-bind="' + bind + '" style="width:auto">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (i) { return '<option value="' + i + '"' + (val === i ? ' selected' : '') + '>Step ' + i + '</option>'; }).join('') + '</select>';
  }
  function bar(k, cur, max, temp) {
    var pct = max ? Math.max(0, Math.min(100, cur / max * 100)) : 0, tp = temp ? Math.min(100 - pct, temp / max * 100) : 0;
    return '<div class="bar ' + k + '"><i class="v" style="width:' + pct + '%"></i>' + (tp ? '<i class="t" style="left:' + pct + '%;width:' + tp + '%"></i>' : '') + '</div>';
  }

  // ======================= ENCOUNTER =======================
  U.views.encounter = function () {
    var e = enc(); G.prep(e);
    var tm = G.tickMode(e), order = G.order(e), cur = !tm && e.started ? G.current(e) : null;
    var ready = tm && e.started ? G.readyNow(e) : [];
    var head = '<section class="panel"><div class="spread"><div style="flex:1;min-width:220px"><label class="f" style="margin:0"><span>Encounter</span><input type="text" data-root="enc" data-bind="name" value="' + esc(e.name) + '"></label></div>' +
      '<div class="row"><label class="small quiet">Party rank ' + rankSel('partyRank', e.partyRank, 'enc') + '</label>' +
      '<label class="small"><input type="checkbox" data-root="enc" data-bind="tableScale"' + (e.tableScale ? ' checked' : '') + '> Table scale' + (e.tableScale ? ' (÷' + R.fmt(Math.pow(4, e.partyRank)) + ')' : '') + '</label></div></div>' +
      '<div class="spread" style="margin-top:12px"><span class="chip on">' + (tm ? 'Tick track (a player character is Bronze or higher)' : 'Turns and Action Points (all players Iron)') + '</span><div class="row">' +
      (!e.started ? '<button class="btn" data-act="gmInit"' + (e.combatants.length ? '' : ' disabled') + '>' + U.icon('d20') + ' Roll initiative</button><button class="btn primary" data-act="gmStart"' + (e.combatants.length ? '' : ' disabled') + '>Start the fight</button>' :
        '<button class="btn" data-act="gmEnd">End the fight</button>') +
      '<button class="btn danger" data-act="gmClear"' + (e.combatants.length ? '' : ' disabled') + '>Clear</button></div></div>';
    if (e.started && !tm && cur) {
      head += '<hr class="rule"><div class="spread"><div><span class="quiet small">Round ' + e.round + ' • acting now</span><div style="font:400 26px var(--display)">' + esc(cur.name) + '</div></div>' +
        '<div class="row"><button class="btn" data-act="gmAct" data-id="' + cur.id + '">Act for ' + esc(cur.name) + '</button><button class="btn primary" data-act="gmNext">End turn: Upkeep, then next</button></div></div>';
    }
    if (e.started && tm) {
      var base = (e.round - 1) * 6, cells = '';
      for (var t = 1; t <= 6; t++) {
        var tick = base + t, anch = order.filter(function (x) { return x.anchor === t; }).map(function (x) { return x.name.split(' ')[0]; });
        cells += '<div class="' + (Math.floor(e.tick) === tick ? 'now' : '') + '"><b>' + tick + '</b>' + (anch.length ? esc(anch.join(', ')) : '&nbsp;') + '</div>';
      }
      head += '<hr class="rule"><div class="spread"><span class="quiet small">Round ' + e.round + ' • Tick ' + e.tick + ' • names under a Tick are Anchors (Upkeep from Round 2)</span>' +
        '<div class="row"><button class="btn sm" data-act="gmTick" data-d="0.5">+½</button><button class="btn sm" data-act="gmTick" data-d="1">+1 Tick</button><button class="btn sm primary" data-act="gmTickNext">Next ready Tick</button></div></div>' +
        '<div class="tickline">' + cells + '</div>' +
        '<div class="row"><span class="small quiet">Ready for a Major now:</span>' + (ready.length ? ready.map(function (x) { return '<button class="btn sm" data-act="gmAct" data-id="' + x.id + '">' + esc(x.name) + '</button>'; }).join('') : '<span class="small">nobody; advance the clock</span>') + '</div>';
    }
    head += '</section>';
    var list = order.length ? order.map(function (x, i) { return combatantCard(e, x, tm, cur && cur.id === x.id); }).join('') :
      '<section class="panel"><h3>No one is here yet</h3><p class="quiet">Add the party from this browser’s roster or from character files, and foes from your bestiary. Then roll initiative.</p></section>';
    return topbar() + '<main class="wrap"><div class="play-grid"><div>' + head + '<div style="margin-top:18px">' + list + '</div></div><div>' + addPanel(e) + logPanel(e) + '</div></div></main>';
  };

  function combatantCard(e, x, tm, isCur) {
    var S = G.sheet(x), p = x.c.play, def = G.defenses(x), down = p.hp <= 0;
    var cds = tm ? Object.keys(p.readyAt).filter(function (k) { return p.readyAt[k] > e.tick; }).map(function (k) { return (x.c.abilities[k] ? x.c.abilities[k].name : k) + ' T' + p.readyAt[k]; })
      : Object.keys(p.cd).map(function (k) { return (x.c.abilities[k] ? x.c.abilities[k].name : k) + ' ' + p.cd[k]; });
    var affs = p.afflictions.map(function (a) { return '<button class="chip warn" data-act="codex" data-ref="aff:' + esc(a.type) + '" title="From ' + esc(a.source) + '. Open the rules.">' + esc(a.type.replace(' (status)', '')) + ' ×' + a.S + ' • ' + a.D + (a.type === 'Doom (status)' ? ' • K' + a.K : '') + '</button>'; }).join(' ');
    var fx = p.effects.map(function (f) { return '<span class="chip on">' + esc(f.name) + (f.rounds != null ? ' ' + f.rounds : '') + '</span>'; }).join(' ');
    var amtKey = 'amt-' + x.id;
    return '<div class="combatant ' + x.side + (isCur ? ' current' : '') + (down ? ' down' : '') + '"><div class="top"><div class="init">' + (x.init == null ? '—' : x.init) + '<small>' + (x.roll != null ? 'd20 ' + x.roll : 'init') + '</small></div>' +
      '<div style="min-width:0"><div class="nm">' + U.xref(x.side === 'party' ? 'char:' + x.c.id : 'monster:' + x.srcId, x.name, 'title') + (down ? ' <span class="chip bad">' + (p.deathMarks >= 3 ? 'dead' : 'Downed • ' + p.deathMarks + ' marks') + '</span>' : '') + '</div>' +
      '<div class="small quiet">' + esc(S.rankName) + ' • ' + (x.side === 'party' ? 'Party' : 'Foe') + (x.c.hpMult && x.c.hpMult !== 1 ? ' • ' + G.tierName(x.c.hpMult) : '') +
      ' • strikes ' + R.sign(def.Strike.cm) + ' ' + def.Strike.name + ', spells ' + R.sign(def.Spell.cm) + ' ' + def.Spell.name + ', areas ' + R.sign(def.Area.cm) +
      ' • resist Bleed ' + R.sign(def.res.Power) + ', Poison ' + R.sign(def.res.Recovery) + ', Necrosis/Doom ' + R.sign(def.res.Spirit) + (tm ? ' • Anchor ' + x.anchor + ', ready T' + x.rd : '') + '</div></div>' +
      '<div class="row"><button class="btn sm primary" data-act="gmAct" data-id="' + x.id + '"' + (down ? ' disabled' : '') + '>Act</button>' +
      '<button class="btn sm" data-act="gmUpkeep" data-id="' + x.id + '" title="Run this combatant’s Upkeep now">Upkeep</button>' +
      '<button class="btn sm" data-act="gmDefend" data-id="' + x.id + '">Defend</button><button class="btn sm danger" data-act="gmRemove" data-id="' + x.id + '" aria-label="Remove ' + esc(x.name) + '">×</button></div></div>' +
      '<div class="mini">' + ['HP', 'MP', 'SP'].map(function (k) {
        var key = k.toLowerCase();
        return '<div><span>' + S.pool[k].label + ' ' + R.fmt(p[key]) + ' / ' + R.fmt(S.pool[k].dMax) + (k === 'HP' && p.temp ? ' +' + p.temp : '') + '</span>' + bar(k, p[key], S.pool[k].dMax, k === 'HP' ? p.temp : 0) + '</div>';
      }).join('') + '</div>' +
      '<div class="row"><input type="number" min="0" data-key="' + amtKey + '" data-input="gmAmt" data-id="' + x.id + '" value="' + esc(GS.amt[x.id] || '') + '" placeholder="Amount" aria-label="Amount for ' + esc(x.name) + '">' +
      '<button class="btn sm danger" data-act="gmDmg" data-id="' + x.id + '">Damage</button><button class="btn sm" data-act="gmHeal" data-id="' + x.id + '">Heal</button><button class="btn sm" data-act="gmShield" data-id="' + x.id + '">Shield</button>' +
      '<button class="btn sm" data-act="gmSpend" data-id="' + x.id + '" data-k="mp">−MP</button><button class="btn sm" data-act="gmSpend" data-id="' + x.id + '" data-k="sp">−SP</button>' +
      (affs || fx || cds.length ? '<span style="flex-basis:100%"></span>' + affs + ' ' + fx + (cds.length ? ' <span class="small quiet">Cooling: ' + esc(cds.join(', ')) + '</span>' : '') : '') +
      (p.afflictions.length ? '<button class="btn sm" data-act="gmCleanse" data-id="' + x.id + '" title="Remove the oldest affliction">Cleanse one</button>' : '') + '</div></div>';
  }

  function addPanel(e) {
    var party = G.partyList(), inEnc = e.combatants.map(function (x) { return x.c.id; });
    var pcs = party.length ? party.map(function (pp) {
      var c = pp.c, here = inEnc.indexOf(c.id) >= 0;
      return '<div class="spread" style="margin-bottom:6px"><span>' + U.xref('char:' + c.id, c.name || 'Unnamed') + ' <span class="small quiet">' + R.rankName(c.rank, c.rs) + '</span></span><button class="btn sm" data-act="gmAddPC" data-src="' + pp.src + '" data-id="' + c.id + '"' + (here ? ' disabled' : '') + '>' + (here ? 'In the fight' : 'Add') + '</button></div>';
    }).join('') : '<p class="small quiet">No adventurers yet. Build them in the Character Forge on this device, or import their files on the Party page.</p>';
    var foes = Object.keys(G.state.foes).map(function (k) { return G.state.foes[k]; }).map(function (f) {
      return '<div class="spread" style="margin-bottom:6px"><span>' + U.xref('monster:' + f.id, f.name) + ' <span class="small quiet">' + G.rankLabel(f) + (f.hpMult !== 1 ? ', ' + G.tierName(f.hpMult) : '') + '</span></span>' +
        '<span class="row"><input type="number" min="1" max="20" data-key="n-' + f.id + '" data-input="gmAddN" data-id="' + f.id + '" value="' + (GS.addN[f.id] || 1) + '" style="width:58px;padding:3px 6px" aria-label="How many">' +
        '<label class="small" title="Identical minions roll one initiative"><input type="checkbox" data-act="gmGroup" data-id="' + f.id + '"' + (GS.addGroup[f.id] ? ' checked' : '') + '> group</label>' +
        '<button class="btn sm" data-act="gmAddFoe" data-id="' + f.id + '">Add</button></span></div>';
    }).join('');
    var BZ = EA.bestiary, pick = GS.canonPick && BZ.find(GS.canonPick);
    var canonSel = '<select data-input="gmCanonPick" data-key="canonpick" aria-label="Creature from the novels"><option value="">Choose a creature\u2026</option>' + BZ.RANKS.map(function (r) {
      return '<optgroup label="' + r + '">' + BZ.list.filter(function (f) { return BZ.rankKey(f) === r; }).map(function (f) { return '<option value="' + f.id + '"' + (GS.canonPick === f.id ? ' selected' : '') + '>' + esc(f.name) + ' (' + esc(G.rankLabel(f).replace(' (as Iron 0)', '')) + ', ' + G.tierName(f.hpMult) + ')</option>'; }).join('') + '</optgroup>';
    }).join('') + '</select>';
    var canonRow = pick ? '<div class="row" style="margin-top:8px"><input type="number" min="1" max="20" data-key="n-' + pick.id + '" data-input="gmAddN" data-id="' + pick.id + '" value="' + (GS.addN[pick.id] || (pick.hpMult < 1 ? 4 : 1)) + '" style="width:58px;padding:3px 6px" aria-label="How many">' +
      '<label class="small"><input type="checkbox" data-act="gmGroup" data-id="' + pick.id + '"' + (GS.addGroup[pick.id] || (GS.addGroup[pick.id] == null && pick.hpMult < 1) ? ' checked' : '') + '> group</label>' +
      '<button class="btn sm" data-act="gmAddFoe" data-id="' + pick.id + '">Add</button></div>' : '';
    return '<section class="panel"><h3>The party</h3>' + pcs + '<hr class="rule"><h3>Your foes</h3>' + (foes || '<p class="small quiet">Your bestiary is empty.</p>') +
      '<button class="btn sm" data-act="gmGo" data-to="foes" style="margin-top:6px">Build a foe</button>' +
      '<hr class="rule"><h3>From the novels</h3>' + canonSel + canonRow + '</section>';
  }
  function logPanel(e) {
    return '<section class="panel"><div class="spread"><h3 style="margin:0">Log</h3><button class="btn sm" data-act="gmClearLog">Clear</button></div><div class="log" data-scroll="gmlog" style="margin-top:10px">' +
      e.log.map(function (l) { return '<div class="' + l.kind + '"><time>' + esc(l.at) + '</time>' + esc(l.text) + '</div>'; }).join('') + '</div></section>';
  }

  // ---------- encounter actions ----------
  act.gmInit = function () { G.rollInitiative(enc(), U.d20); commit(); };
  act.gmStart = function () { G.start(enc()); commit(); };
  act.gmEnd = function () { G.end(enc()); commit(); };
  act.gmClear = function () { var e = enc(); var keep = { name: e.name, partyRank: e.partyRank, tableScale: e.tableScale }; G.state.enc = Object.assign(G.newEncounter(), keep); commit(); };
  act.gmNext = function () { G.nextTurn(enc()); commit(); };
  act.gmTick = function (el) { var e = enc(); G.advance(e, e.tick + (+el.getAttribute('data-d'))); commit(); };
  act.gmTickNext = function () { var e = enc(); G.advance(e, G.nextReadyTick(e)); commit(); };
  act.gmUpkeep = function (el) { var e = enc(); G.upkeep(e, G.find(e, el.getAttribute('data-id'))); commit(); };
  act.gmRemove = function (el) { G.remove(enc(), el.getAttribute('data-id')); commit(); };
  act.gmClearLog = function () { enc().log = []; commit(); };
  act.gmAmt = function (el) { GS.amt[el.getAttribute('data-id')] = el.value; };
  function takeAmt(id) { var v = parseInt(GS.amt[id], 10); GS.amt[id] = ''; return isNaN(v) ? 0 : v; }
  act.gmDmg = function (el) { var e = enc(), x = G.find(e, el.getAttribute('data-id')), n = takeAmt(x.id); if (n) { P.damage(x.c, G.sheet(x), n); G.log(e, x.name + ' takes ' + n + ' damage.', 'dmg'); } commit(); };
  act.gmHeal = function (el) { var e = enc(), x = G.find(e, el.getAttribute('data-id')), n = takeAmt(x.id); if (n) { P.heal(x.c, G.sheet(x), n); G.log(e, x.name + ' heals ' + n + '.', 'up'); } commit(); };
  act.gmShield = function (el) { var e = enc(), x = G.find(e, el.getAttribute('data-id')), n = takeAmt(x.id); if (n) { P.shield(x.c, n, 3); G.log(e, x.name + ' gains ' + n + ' temporary Health.', 'up'); } commit(); };
  act.gmSpend = function (el) { var e = enc(), x = G.find(e, el.getAttribute('data-id')), k = el.getAttribute('data-k'), n = takeAmt(x.id); x.c.play[k] = Math.max(0, x.c.play[k] - n); commit(); };
  act.gmDefend = function (el) {
    var e = enc(), x = G.find(e, el.getAttribute('data-id')), p = x.c.play;
    var on = p.effects.some(function (f) { return f.name === 'Defend'; });
    p.effects = p.effects.filter(function (f) { return f.name !== 'Defend'; });
    if (!on) { p.effects.push({ name: 'Defend', rounds: 1 }); G.log(e, x.name + ' defends (+2 to all defenses).', ''); }
    commit();
  };
  act.gmCleanse = function (el) { var e = enc(), x = G.find(e, el.getAttribute('data-id')), a = x.c.play.afflictions[0]; if (a) { P.removeAff(x.c.play, a.id); G.log(e, x.name + ': ' + a.type + ' cleansed.', 'up'); } commit(); };
  act.gmAddPC = function (el) {
    var src = el.getAttribute('data-src'), id = el.getAttribute('data-id');
    var c = src === 'roster' ? St.roster[id] : G.state.party[id];
    if (c) { G.addPC(enc(), c); G.log(enc(), (c.name || 'An adventurer') + ' joins the fight.', ''); }
    commit();
  };
  act.gmCanonPick = function (el) { GS.canonPick = el.value || null; U.render(); };
  act.gmAddN = function (el) { GS.addN[el.getAttribute('data-id')] = Math.max(1, parseInt(el.value, 10) || 1); };
  act.gmGroup = function (el) {
    var id = el.getAttribute('data-id'), f = G.foeById(id), cur = GS.addGroup[id] == null ? !!(f && f.hpMult < 1) : GS.addGroup[id];
    GS.addGroup[id] = !cur; U.render();
  };
  act.gmAddFoe = function (el) {
    var id = el.getAttribute('data-id'), f = G.foeById(id); if (!f) return;
    var minion = f.hpMult < 1, n = GS.addN[id] || (minion && f.canon ? 4 : 1), grp = GS.addGroup[id] == null ? minion : GS.addGroup[id];
    G.addFoe(enc(), f, n, !!grp); G.log(enc(), n + ' × ' + f.name + ' added.', ''); U.toast(n + ' × ' + f.name + ' added to the encounter.'); commit();
  };

  // ---------- act modal: one roll, read twice ----------
  act.gmAct = function (el) {
    var e = enc(), x = G.find(e, el.getAttribute('data-id')), acts = G.actions(x);
    var foesOf = e.combatants.filter(function (y) { return y.side !== x.side && y.c.play.hp > 0; });
    GS.atk = { id: x.id, key: acts[0] ? acts[0].key : 'basic', targets: foesOf.length ? [foesOf[0].id] : [], d: null, manual: '', edge: 0 };
    U.openModal(actModal);
  };
  function actModal() {
    var e = enc(), a = GS.atk, x = G.find(e, a.id); if (!x) return '';
    var S = G.sheet(x), acts = G.actions(x), cur = acts.filter(function (y) { return y.key === a.key; })[0] || acts[0];
    var support = cur.res.heal || cur.res.shield;
    var opts = acts.map(function (y) {
      var cd = G.tickMode(e) ? (x.c.play.readyAt[y.key] > e.tick ? ' (ready T' + x.c.play.readyAt[y.key] + ')' : '') : (x.c.play.cd[y.key] ? ' (cooling ' + x.c.play.cd[y.key] + ')' : '');
      return '<option value="' + y.key + '"' + (y.key === cur.key ? ' selected' : '') + '>' + esc(y.ab.name) + ' • ' + esc(y.res.costText) + cd + '</option>';
    }).join('');
    var tlist = G.order(e).filter(function (y) { return y.id !== x.id || support; }).map(function (y) {
      var on = a.targets.indexOf(y.id) >= 0;
      return '<label class="chip' + (on ? ' on' : '') + '" style="cursor:pointer"><input type="checkbox" data-act="gmTarget" data-id="' + y.id + '"' + (on ? ' checked' : '') + ' style="width:14px;height:14px"> ' + esc(y.name) + (y.c.play.hp <= 0 ? ' (down)' : '') + '</label>';
    }).join(' ');
    var plan = a.d ? G.resolve(e, x, cur.key, a.targets, a.d, a.edge) : null;
    var rows = plan ? plan.rows.map(function (r) {
      var t = r.tier != null ? R.HIT_TIERS[r.tier] : null;
      var cls = r.tier == null ? '' : r.tier === 0 ? 'miss' : r.tier === 1 ? 'graze' : 'hit';
      return '<div class="outcome"><div><div class="tier ' + cls + '">' + esc(r.name) + (t ? ': ' + t.label : '') + '</div>' +
        '<div class="small quiet">' + (r.tn ? plan.total + ' vs ' + r.tn + ' (' + r.defName + ', margin ' + R.sign(r.margin) + ')' : '') + (r.note ? ' • ' + esc(r.note) : '') + '</div>' +
        (r.riders && r.riders.length ? '<div class="small">' + r.riders.map(function (rd) { return rd.aff.replace(' (status)', '') + ': ' + rd.stacks + ' of ' + rd.of + ' stacks (' + plan.total + ' vs ' + rd.tn + ', ' + rd.label + ')'; }).join(' • ') + '</div>' : '') +
        (r.lines.length ? '<div class="small quiet">' + esc(r.lines.join(' ')) + '</div>' : '') + '</div>' +
        '<div style="text-align:right">' + (r.dmg != null ? '<b style="font:26px var(--display)">' + r.dmg + '</b><div class="small quiet">damage' + (r.drain ? ', drains ' + r.drain : '') + '</div>' : '') + '</div></div>';
    }).join('') : '';
    var die = a.d ? '<div class="die' + (a.d === 20 ? ' nat20' : a.d === 1 ? ' nat1' : '') + '">' + U.dieSVG() + '<b>' + a.d + '</b></div><div class="rollout"><div class="total">' + plan.total + '</div><div class="small quiet">d20 ' + a.d + ' ' + R.sign(plan.cmA) + (plan.sit ? ', edge ' + R.sign(plan.sit) : '') + '</div></div>' : '';
    var needsRoll = cur.res.rolls || cur.res.dmg;
    return '<div class="modal" style="width:min(820px,100%)" role="dialog" aria-modal="true" aria-label="' + esc(x.name) + ' acts"><div class="panel"><button class="iconbtn x" data-act="closeModal" aria-label="Close">' + U.icon('close') + '</button>' +
      '<p class="quiet small" style="margin:0">' + esc(S.rankName) + ' • ' + (x.side === 'party' ? 'Party' : 'Foe') + '</p><h2>' + esc(x.name) + ' acts</h2>' +
      '<div class="grid2"><label class="f"><span>Action</span><select data-input="gmActKey" data-key="gmactkey">' + opts + '</select></label>' +
      '<div><span class="small quiet">Edge or penalty</span><div class="stepper" style="grid-template-columns:32px 46px 32px;margin-top:5px"><button data-act="gmEdge" data-d="-1" style="height:32px">−</button><output style="font-size:22px">' + R.sign(a.edge) + '</output><button data-act="gmEdge" data-d="1" style="height:32px">+</button></div></div></div>' +
      (cur.key !== 'basic' && cur.key !== 'dart' ? '<p class="small" style="margin:0 0 4px">' + U.xref((x.side === 'party' ? 'cab:' + x.c.id : 'mab:' + x.srcId) + ':' + cur.key, 'About ' + cur.ab.name) + '</p>' : '') +
      '<p class="small" style="margin:0 0 8px">' + esc(A.finalText ? (cur.key === 'basic' || cur.key === 'dart' ? cur.ab.name + ': ' + R.fmt(S.disp(cur.res.dmg)) + ' damage.' : A.finalText(cur.ab, cur.res, S)) : '') + '</p>' +
      '<div style="margin-bottom:10px"><span class="small quiet">Targets' + (cur.res.area ? ' (area: tick everyone inside)' : '') + '</span><div class="row" style="margin-top:6px">' + (tlist || '<span class="small">No targets.</span>') + '</div></div>' +
      '<div class="row"><button class="btn primary" data-act="gmRoll">' + U.icon('d20') + (needsRoll ? (a.d ? ' Roll again' : ' Roll the d20') : ' Resolve') + '</button>' +
      '<label class="small quiet">or the player rolled <input type="number" min="1" max="20" data-key="gmmanual" data-input="gmManual" value="' + esc(a.manual) + '" style="width:64px;display:inline-block"></label><button class="btn sm" data-act="gmUseManual">Use it</button></div>' +
      (plan ? '<hr class="rule"><div class="actres"><div>' + die + '</div><div>' + (rows || '<p class="quiet">Choose a target.</p>') + '</div></div>' +
        '<div class="row" style="margin-top:12px"><button class="btn primary" data-act="gmApply"' + (plan.rows.length || !needsRoll ? '' : ' disabled') + '>Apply results</button><button class="btn" data-act="closeModal">Cancel</button>' +
        '<span class="small quiet">Applying pays the cost, starts the cooldown' + (G.tickMode(e) ? ', sets the next Ready Tick' : '') + ', and deals damage and afflictions.</span></div>' : '') +
      '</div></div>';
  }
  act.gmActKey = function (el) { GS.atk.key = el.value; GS.atk.d = null; var e = enc(), x = G.find(e, GS.atk.id), cur = G.actions(x).filter(function (y) { return y.key === el.value; })[0];
    if (cur && (cur.res.heal || cur.res.shield)) GS.atk.targets = [x.id];
    else if (cur && cur.res.area) GS.atk.targets = e.combatants.filter(function (y) { return y.side !== x.side && y.c.play.hp > 0; }).map(function (y) { return y.id; });
    U.render(); };
  act.gmTarget = function (el) { var id = el.getAttribute('data-id'), t = GS.atk.targets, i = t.indexOf(id); if (i >= 0) t.splice(i, 1); else t.push(id); U.render(); };
  act.gmEdge = function (el) { GS.atk.edge = Math.max(-5, Math.min(5, GS.atk.edge + (+el.getAttribute('data-d')))); U.render(); };
  act.gmRoll = function () { GS.atk.d = U.d20(); U.render(); };
  act.gmManual = function (el) { GS.atk.manual = el.value; };
  act.gmUseManual = function () { var v = parseInt(GS.atk.manual, 10); if (v >= 1 && v <= 20) { GS.atk.d = v; U.render(); } else U.toast('Enter the natural d20 roll, 1 to 20.'); };
  act.gmApply = function () {
    var e = enc(), a = GS.atk, x = G.find(e, a.id);
    var d = a.d || 10, plan = G.resolve(e, x, a.key, a.targets, d, a.edge);
    if (plan) G.apply(e, plan);
    GS.atk = null; U.closeModal(); commit();
  };

  // ======================= FOES =======================
  GS.foeTab = 'mine'; GS.canonRank = 'Iron'; GS.canon = null;
  U.views.foes = function () {
    var tab = GS.foeTab, BZ = EA.bestiary;
    var toggle = '<div class="seg full" role="tablist" aria-label="Which bestiary"><button role="tab" data-act="gmFoeTab" data-t="mine" aria-selected="' + (tab === 'mine') + '">Your foes</button><button role="tab" data-act="gmFoeTab" data-t="canon" aria-selected="' + (tab === 'canon') + '">Novels</button></div>';
    function item(f, picked, act) {
      return '<button class="ess-opt' + (picked ? ' picked' : '') + '" data-act="' + act + '" data-id="' + f.id + '" style="width:100%;margin-bottom:8px"><b>' + esc(f.name) + '</b><span class="rar">' + esc(G.rankLabel(f)) + '</span><span class="th">' + esc(G.tierName(f.hpMult)) + ' \u2022 ' + esc(f.archetype || '') + ' \u2022 ' + G.kitSlots(f).length + ' abilities</span></button>';
    }
    if (tab === 'canon') {
      var inRank = BZ.list.filter(function (f) { return BZ.rankKey(f) === GS.canonRank; }).sort(function (a, b) { return a.hpMult - b.hpMult || a.rs - b.rs; });
      if (!GS.canon || !BZ.find(GS.canon) || BZ.rankKey(BZ.find(GS.canon)) !== GS.canonRank) GS.canon = inRank[0] ? inRank[0].id : null;
      var chips = BZ.RANKS.map(function (r) { var n = BZ.list.filter(function (f) { return BZ.rankKey(f) === r; }).length; return '<button class="chip' + (GS.canonRank === r ? ' on' : '') + '" data-act="gmCanonRank" data-r="' + r + '">' + r + ' ' + n + '</button>'; }).join(' ');
      var groups = G.TIER_ORDER.map(function (t) {
        var fs = inRank.filter(function (f) { return f.hpMult === t; });
        return fs.length ? '<p class="small quiet" style="margin:10px 0 6px">' + G.tierName(t) + '</p>' + fs.map(function (f) { return item(f, f.id === GS.canon, 'gmCanon'); }).join('') : '';
      }).join('');
      var cf = BZ.find(GS.canon);
      return topbar() + '<main class="wrap"><div class="forge-grid foe-grid"><aside><section class="panel">' + toggle + '<div class="row" style="margin:12px 0 4px">' + chips + '</div>' + groups + '</section></aside>' +
        (cf ? canonPanel(cf) + '<div>' + statBlock(cf) + '</div>' : '<section class="panel"><p>Pick a creature.</p></section><div></div>') + '</div></main>';
    }
    var foes = Object.keys(G.state.foes).map(function (k) { return G.state.foes[k]; });
    if (!GS.foe || !G.state.foes[GS.foe]) GS.foe = foes[0] ? foes[0].id : null;
    var list = foes.map(function (f) { return item(f, f.id === GS.foe, 'gmFoe'); }).join('');
    var f = G.state.foes[GS.foe];
    return topbar() + '<main class="wrap"><div class="forge-grid foe-grid"><aside><section class="panel">' + toggle + '<div style="margin-top:12px">' + (list || '<p class="quiet small">No foes yet. Build one, or copy a creature from the novels.</p>') + '</div>' +
      '<button class="btn primary" data-act="gmNewFoe" style="width:100%">New foe</button></section></aside>' +
      (f ? foeEditor(f) + '<div>' + statBlock(f) + '</div>' : '<section class="panel"><p>Make your first foe.</p></section><div></div>') + '</div></main>';
  };

  var TIER_USE = {
    0.5: 'Minion: half Health. Bring several and roll their initiative as a group.',
    1: 'Standard: a fair fight one-on-one for an adventurer of the same rank. Use one to two per player.',
    2: 'Elite: twice the Health. One elite plus a few minions makes a full fight for a small party.',
    4: 'Solo: four times the Health, built to face a party of four alone.'
  };
  function canonPanel(f) {
    var e = enc(), here = e.combatants.filter(function (x) { return x.srcId === f.id; }).length;
    return '<section class="panel"><p class="small quiet" style="margin:0">' + U.dot('unverified') + 'From the novels: name and rank \u2022 ' + U.dot('derived') + 'Game build: stats, Step and kit</p>' +
      '<h2>' + esc(f.name) + '</h2>' + (EA.lore.monster[f.id] ? '<blockquote class="cquote" style="--entity:#ff6f7f">' + esc(EA.lore.monster[f.id].q) + '</blockquote>' : '') + '<p class="lede">' + esc(EA.lore.monster[f.id] ? EA.lore.monster[f.id].lore : f.desc) + '</p>' +
      '<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="codex" data-ref="monster:' + f.id + '">Full lore, loot and tactics</button></div>' +
      '<dl class="kv"><dt>Rank</dt><dd>' + esc(G.rankLabel(f)) + '</dd><dt>Threat</dt><dd>' + esc(G.tierName(f.hpMult)) + '</dd></dl>' +
      '<p class="small">' + esc(TIER_USE[f.hpMult]) + (f.normal ? ' Normal-rank monsters are below Iron: they use Iron 0 rules with weak stats and drop lesser monster cores.' : '') + '</p>' +
      '<hr class="rule"><div class="row"><input type="number" min="1" max="20" data-key="n-' + f.id + '" data-input="gmAddN" data-id="' + f.id + '" value="' + (GS.addN[f.id] || (f.hpMult < 1 ? 4 : 1)) + '" style="width:64px" aria-label="How many">' +
      '<label class="small"><input type="checkbox" data-act="gmGroup" data-id="' + f.id + '"' + (GS.addGroup[f.id] || (GS.addGroup[f.id] == null && f.hpMult < 1) ? ' checked' : '') + '> one initiative roll for the group</label>' +
      '<button class="btn primary" data-act="gmAddFoe" data-id="' + f.id + '">Add to the encounter</button>' + (here ? '<span class="small quiet">' + here + ' in the encounter</span>' : '') + '</div>' +
      '<div class="row" style="margin-top:10px"><button class="btn" data-act="gmCanonCopy" data-id="' + f.id + '">Copy to your foes to edit</button></div>' +
      '<p class="small quiet" style="margin-top:12px">The novels name these creatures and their rank but rarely give powers in game terms. Kits here are built with the ability pricing rules so each one meets the damage benchmark for its rank and Step; reskin or edit freely.</p></section>';
  }
  act.gmFoeTab = function (el) { GS.foeTab = el.getAttribute('data-t'); U.render(); };
  act.gmCanonRank = function (el) { GS.canonRank = el.getAttribute('data-r'); GS.canon = null; U.render(); };
  act.gmCanon = function (el) { GS.canon = el.getAttribute('data-id'); U.render(); };
  act.gmCanonCopy = function (el) {
    var f = EA.bestiary.copy(el.getAttribute('data-id'));
    G.state.foes[f.id] = f; GS.foe = f.id; GS.foeTab = 'mine'; U.toast(f.name + ' copied to your foes.'); commit();
  };

  function foeEditor(f) {
    var b = function (k) { return 'data-root="foe" data-bind="' + k + '"'; };
    var arche = Object.keys(G.ARCHETYPES).map(function (k) { return '<button class="btn sm' + (f.archetype === k ? ' primary' : '') + '" data-act="gmArche" data-k="' + k + '">' + k + '</button>'; }).join(' ');
    var stats = R.STATS.map(function (k) { return '<label class="f"><span>' + k + '</span><input type="number" min="1" max="30" data-type="int" ' + b('stats.' + k) + ' value="' + f.stats[k] + '"></label>'; }).join('');
    var S = R.computeSheet(f);
    var kit = G.kitSlots(f).map(function (slot) {
      var ab = f.abilities[slot], res = A.compute(ab, S), qa = ab.qa;
      var head = '<div class="spread"><b style="font:400 18px var(--display)">' + esc(ab.name) + '</b><button class="btn sm danger" data-act="gmKitRm" data-slot="' + slot + '">Remove</button></div>';
      if (!qa) return '<div class="item" style="grid-template-columns:1fr">' + head + '<span class="small quiet">' + esc(ab.type) + ' • ' + esc(res.costText) + ' • ' + esc(res.cdText) + ' • from the library</span></div>';
      var q = function (k) { return 'data-root="foe" data-bind="abilities.' + slot + '.qa.' + k + '"'; };
      return '<div class="item" style="grid-template-columns:1fr">' + head + '<div class="opts">' +
        '<input type="text" ' + q('name') + ' value="' + esc(qa.name) + '" aria-label="Attack name" style="min-width:160px">' +
        '<select ' + q('type') + '><option' + (qa.type === 'Special Attack' ? ' selected' : '') + '>Special Attack</option><option' + (qa.type === 'Spell' ? ' selected' : '') + '>Spell</option></select>' +
        '<select ' + q('scaling') + '>' + R.STATS.map(function (s) { return '<option' + (qa.scaling === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
        '<select data-type="int" ' + q('cd') + '>' + A.CDS.map(function (n) { return '<option value="' + n + '"' + (qa.cd === n ? ' selected' : '') + '>CD ' + n + '</option>'; }).join('') + '</select>' +
        '<label class="small"><input type="checkbox" ' + q('area') + (qa.area ? ' checked' : '') + '> Area</label>' +
        '<select ' + q('aff') + '><option value="">No affliction</option>' + A.AFF.map(function (x) { return '<option' + (qa.aff === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
        (qa.aff ? '<input type="number" min="1" max="6" data-type="int" ' + q('stacks') + ' value="' + (qa.stacks || 1) + '" style="width:64px" aria-label="Stacks">' : '') +
        '</div><span class="small quiet">' + esc(res.text) + ' ' + esc(res.costText) + ', ' + esc(res.cdText) + '.</span></div>';
    }).join('');
    var lib = '<select data-input="gmKitLib" data-key="kitlib" style="width:auto"><option value="">Add from the library…</option><optgroup label="Blood chart">' +
      L.blood.map(function (x, i) { return '<option value="b' + i + '">' + esc(x.name) + '</option>'; }).join('') + '</optgroup><optgroup label="Rulebook examples">' +
      L.examples.map(function (x, i) { return '<option value="e' + i + '">' + esc(x.name) + '</option>'; }).join('') + '</optgroup></select>';
    return '<section class="panel"><h2>' + esc(f.name || 'New foe') + '</h2><p class="lede">Foes use the same rules as adventurers. Start from an archetype, set rank and Step, give it a Basic Attack and two to four abilities.</p>' +
      '<div class="grid2"><label class="f"><span>Name</span><input type="text" ' + b('name') + ' value="' + esc(f.name) + '"></label>' +
      '<label class="f"><span>Threat</span><select data-type="num" ' + b('hpMult') + '>' + G.TIER_ORDER.map(function (k) { return '<option value="' + k + '"' + (k === (f.hpMult || 1) ? ' selected' : '') + '>' + G.TIERS[k] + (k !== 1 ? ', Health ×' + k : '') + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="f"><span>Description</span><textarea ' + b('desc') + ' style="min-height:60px">' + esc(f.desc || '') + '</textarea></label>' +
      '<div class="row" style="margin-bottom:12px"><span class="small quiet">Archetype</span>' + arche + '</div>' +
      '<div class="grid4">' + stats + '</div>' +
      '<div class="row" style="margin-bottom:6px"><span class="small quiet">Rank</span>' + rankSel('rank', f.rank, 'foe') + stepSel('rs', f.rs, 'foe') +
      '<span class="small quiet">Basic Attack uses</span><select ' + b('basicStat') + ' style="width:auto"><option' + (f.basicStat === 'Power' ? ' selected' : '') + '>Power</option><option' + (f.basicStat === 'Speed' ? ' selected' : '') + '>Speed</option></select></div>' +
      '<hr class="rule"><h3>Kit</h3><p class="small quiet" style="margin-top:-6px">Quick attacks are priced for you: area costs 40 APB and each affliction stack 10; damage gets the rest. A CD 3 and a CD 5 attack meet the damage benchmark.</p>' +
      '<div class="items">' + kit + '</div><div class="row"><button class="btn" data-act="gmKitAdd">Add a quick attack</button>' + lib + '</div>' +
      '<hr class="rule"><div class="row"><button class="btn" data-act="gmFoeDup">Duplicate</button><button class="btn danger" data-act="gmFoeDel">Delete</button></div></section>';
  }

  function statBlock(f) {
    var S = R.computeSheet(f), p = S.pool, B = S.B;
    var atks = G.kitSlots(f).map(function (slot) {
      var ab = f.abilities[slot], res = A.compute(ab, S);
      var tiers = res.dmg ? '<div class="small quiet">' + R.HIT_TIERS.slice(1).map(function (t) { return t.label.replace(' Hit', '') + ' ' + R.fmt(S.disp(R.applyDM(res.dmg, t.dm))); }).join(' • ') + '</div>' : '';
      return '<div class="atk"><b>' + U.xref('mab:' + f.id + ':' + slot, ab.name, 'title') + '</b> <span class="small quiet">' + esc(ab.type) + ', ' + esc(res.costText) + ', ' + esc(res.cdText) + (res.rolls && res.scaling ? ', d20 ' + R.sign(S.stat[res.scaling].cm + res.sit) : '') + '</span><div class="small">' + esc(A.finalText(ab, res, S)) + '</div>' + tiers + '</div>';
    }).join('');
    return '<div class="statblock" style="position:sticky;top:76px"><p class="small quiet" style="margin:0">' + esc(G.rankLabel(f)) + ' • ' + esc(f.archetype || '') + ' • ' + esc(G.TIERS[f.hpMult || 1]) + (f.hpMult !== 1 ? ', Health ×' + f.hpMult : '') + '</p><p class="ttl">' + U.xref('monster:' + f.id, f.name, 'title') + '</p>' +
      (f.desc ? '<p class="small" style="font-style:italic;color:var(--muted)">' + esc(f.desc) + '</p>' : '') +
      '<div class="grid4" style="margin:10px 0">' + R.STATS.map(function (k) { return '<div><b>' + R.sign(S.stat[k].cm) + '</b><span>' + k + ' ' + S.stat[k].raw + '</span></div>'; }).join('') + '</div>' +
      '<dl class="kv"><dt>Health</dt><dd><b>' + R.fmt(p.HP.dMax) + '</b> (+' + p.HP.dReg + ')</dd><dt>Mana</dt><dd>' + R.fmt(p.MP.dMax) + ' (+' + p.MP.dReg + ')</dd><dt>Stamina</dt><dd>' + R.fmt(p.SP.dMax) + ' (+' + p.SP.dReg + ')</dd>' +
      '<dt>Defense: strikes / spells / areas</dt><dd>' + R.sign(S.def.strike) + ' / ' + R.sign(S.def.spell) + ' / ' + R.sign(S.def.area) + '</dd><dt>Initiative</dt><dd>' + R.sign(S.init) + '</dd><dt>Move</dt><dd>' + S.move + ' m</dd>' +
      (S.tickEngine ? '<dt>Ticks between Majors</dt><dd>' + S.majorRecovery + '</dd>' : '') + (S.aura.available ? '<dt>Aura output / defense</dt><dd>' + R.sign(S.aura.AO) + ' / ' + R.sign(S.aura.AD) + '</dd>' : '') + '</dl>' +
      '<div class="atk"><b>Basic Attack</b> <span class="small quiet">' + S.basic.stat + ', d20 ' + R.sign(S.stat[S.basic.stat].cm) + '</span><div class="small">' + R.fmt(S.disp(S.basic.dmg)) + ' damage.</div></div>' + atks +
      (B > 1 ? '<p class="small faint" style="margin:8px 0 0">At ' + R.RANKS[S.tableRank] + ' table scale (÷' + R.fmt(B) + ').</p>' : '') +
      (f.canon ? '' : '<div class="row" style="margin-top:12px"><button class="btn primary" data-act="gmAddFoe" data-id="' + f.id + '">Add to the encounter</button></div>') + '</div>';
  }

  act.gmFoe = function (el) { GS.foe = el.getAttribute('data-id'); U.render(); };
  act.gmNewFoe = function () { var f = G.newFoe('New foe'); f.abilities['E1-1'] = G.quickAttack({ name: 'Strike', cd: 3 }); f.abilities['E1-1'].qa = { name: 'Strike', type: 'Special Attack', scaling: 'Power', cd: 3, area: false, aff: '', stacks: 2 }; G.state.foes[f.id] = f; GS.foe = f.id; commit(); };
  act.gmArche = function (el) { var f = U.roots.foe(), k = el.getAttribute('data-k'); f.archetype = k; f.stats = G.clone(G.ARCHETYPES[k]); if (k === 'Skirmisher') f.basicStat = 'Speed'; commit(); };
  act.gmKitAdd = function () {
    var f = U.roots.foe(), slot = G.nextSlot(f); if (!slot) return U.toast('That foe has a full kit.');
    var qa = { name: 'Attack', type: 'Special Attack', scaling: f.basicStat || 'Power', cd: 5, area: false, aff: '', stacks: 2 };
    f.abilities[slot] = Object.assign(G.quickAttack(qa), { qa: qa }); commit();
  };
  act.gmKitLib = function (el) {
    var v = el.value; if (!v) return;
    var f = U.roots.foe(), slot = G.nextSlot(f); if (!slot) return U.toast('That foe has a full kit.');
    var src = v.charAt(0) === 'b' ? L.blood : L.examples;
    f.abilities[slot] = G.clone(src[+v.slice(1)]); commit();
  };
  act.gmKitRm = function (el) { delete U.roots.foe().abilities[el.getAttribute('data-slot')]; commit(); };
  act.gmFoeDup = function () { var f = G.clone(U.roots.foe()); f.id = 'f' + Date.now().toString(36); f.name += ' (copy)'; G.state.foes[f.id] = f; GS.foe = f.id; commit(); };
  act.gmFoeDel = function () { delete G.state.foes[GS.foe]; GS.foe = null; commit(); };

  // rebuild quick-attack items when their fields change; persist every bound edit
  var prevBind = U.onBind;
  U.onBind = function (root, path) {
    if (prevBind) prevBind(root, path);
    if (root === 'foe') {
      var m = path.match(/^abilities\.([A-Z0-9-]+)\.qa\./);
      if (m) {
        var f = U.roots.foe(), ab = f.abilities[m[1]], qa = ab.qa;
        qa.cd = +qa.cd; qa.stacks = Math.max(1, Math.min(6, +qa.stacks || 1));
        if (qa.area && qa.aff && qa.stacks > 6) qa.stacks = 6;
        f.abilities[m[1]] = Object.assign(G.quickAttack(qa), { qa: qa });
      }
      if (path === 'hpMult') U.roots.foe().hpMult = +U.roots.foe().hpMult || 1;
      if (path === 'rank' || path === 'rs') U.roots.foe().normal = false;
    }
    if (root === 'foe' || root === 'enc') G.save();
  };

  // ======================= PARTY =======================
  U.views.party = function () {
    var e = enc(), list = G.partyList();
    var rows = list.map(function (pp) {
      var c = pp.c, S = R.computeSheet(Object.assign({}, c, { options: Object.assign({}, c.options, { tableScale: e.tableScale, partyRank: e.partyRank }) }));
      return '<tr><td><b>' + U.xref('char:' + c.id, c.name || 'Unnamed', 'title') + '</b><div class="small quiet">' + c.essences.filter(Boolean).map(function (n) { return U.xref('essence:' + n, n); }).join(', ') + (S.confluence ? ' • ' + U.xref('conf:' + S.confluence.name, S.confluence.name) : '') + '</div></td>' +
        '<td>' + esc(S.rankName) + '</td>' + R.STATS.map(function (k) { return '<td class="n">' + R.sign(S.stat[k].cm) + '</td>'; }).join('') +
        '<td class="n">' + R.fmt(S.pool.HP.dMax) + '</td><td class="n">' + R.fmt(S.pool.MP.dMax) + '</td><td class="n">' + R.fmt(S.pool.SP.dMax) + '</td>' +
        '<td class="n">' + R.sign(S.def.strike) + ' / ' + R.sign(S.def.spell) + ' / ' + R.sign(S.def.area) + '</td><td class="small quiet">' + (pp.src === 'roster' ? 'This device' : 'Imported') + '</td>' +
        '<td><button class="btn sm" data-act="gmAddPC" data-src="' + pp.src + '" data-id="' + c.id + '">Add to fight</button>' + (pp.src === 'imported' ? ' <button class="btn sm danger" data-act="gmPartyRm" data-id="' + c.id + '">×</button>' : '') + '</td></tr>';
    }).join('');
    return topbar() + '<main class="wrap"><section class="panel"><h2>The party</h2><p class="lede">Adventurers built in the Character Forge on this device appear here automatically. Import files your players send you to add theirs. The encounter uses your own copy, so nothing you do in a fight changes a player’s sheet.</p>' +
      '<div class="scrollbox"><table class="tbl"><thead><tr><th>Adventurer</th><th>Rank</th><th class="n">Power</th><th class="n">Speed</th><th class="n">Spirit</th><th class="n">Recovery</th><th class="n">Health</th><th class="n">Mana</th><th class="n">Stamina</th><th class="n">Strike / spell / area</th><th>Source</th><th></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="12" class="quiet">No adventurers yet.</td></tr>') + '</tbody></table></div>' +
      '<p class="small quiet">Numbers at the encounter’s table scale (' + R.RANKS[e.partyRank] + (e.tableScale ? ', ÷' + R.fmt(Math.pow(4, e.partyRank)) : ', full numbers') + ').</p>' +
      '<div class="row"><label class="btn" for="gmImport">' + U.icon('upload') + ' Import character files</label><input id="gmImport" type="file" accept=".json,application/json" multiple class="sr" data-input="gmImport"><a class="btn" href="adventurer.html#home">Open the Character Forge</a></div></section></main>';
  };
  act.gmImport = function (el) {
    var files = Array.prototype.slice.call(el.files || []), done = 0, bad = 0;
    files.forEach(function (f) {
      var rd = new FileReader();
      rd.onload = function () { try { G.importPC(rd.result); done++; } catch (e) { bad++; } if (done + bad === files.length) { U.toast('Imported ' + done + (bad ? ', skipped ' + bad : '') + '.'); U.render(); } };
      rd.readAsText(f);
    });
  };
  act.gmPartyRm = function (el) { delete G.state.party[el.getAttribute('data-id')]; commit(); };

  // ======================= AWAKENING & LOOT =======================
  U.views.awaken = function () {
    var a = GS.awaken, stone = D.stones.filter(function (s) { return s.id === a.stone; })[0];
    var gradeKey = stone ? (stone.grade === 'Divine' ? 'Divine' : stone.grade === 'Grave' ? 'Legendary' : /^(Common|Uncommon|Rare|Epic)$/.test(stone.rarity) ? stone.rarity : (stone.grade === 'High-Grade' ? 'Rare' : 'Common')) : 'Innate';
    var g = A.GRADES[gradeKey], shift = g.shift + (a.ow && gradeKey !== 'Innate' && gradeKey !== 'Divine' ? 1 : 0);
    var essOpts = D.essences.map(function (e) { return '<option' + (a.ess === e.name ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('');
    var stoneOpts = '<option value="">No stone (innate awakening)</option>' + ['Standard', 'High-Grade', 'Grave', 'Divine'].map(function (gr) {
      return '<optgroup label="' + gr + '">' + D.stones.filter(function (s) { return s.grade === gr; }).map(function (s) { return '<option value="' + s.id + '"' + (a.stone === s.id ? ' selected' : '') + '>' + esc(s.name.replace('Awakening Stone of ', '')) + ' (' + s.rarity + (s.lock ? ', ' + s.lock : '') + ')</option>'; }).join('') + '</optgroup>';
    }).join('');
    var reach = '';
    if (a.roll) {
      var lo = ((a.roll - shift - 1) % 20 + 20) % 20 + 1, hi = ((a.roll + shift - 1) % 20) + 1;
      reach = '<p>Rolled <b>' + a.roll + '</b>. ' + (shift ? 'The player may take any row from <b>' + lo + '</b> to <b>' + hi + '</b> (rows wrap).' : 'No steering: row ' + a.roll + '.') +
        (stone && stone.lock ? ' Then the stone leans toward <b>' + esc(stone.lock) + '</b>: move to the nearest row of that kind if the chosen row is not one.' : '') + '</p>';
      if (a.ess === 'Blood') {
        reach += '<div class="scrollbox"><table class="tbl"><thead><tr><th>d20</th><th>Result</th><th>Kind</th><th>Effect at Iron, stat 14</th></tr></thead><tbody>' + L.blood.map(function (b, i) {
          var row = i + 1, dist = Math.min(Math.abs(row - a.roll), 20 - Math.abs(row - a.roll));
          var S = R.computeSheet({ heritage: 'native', rank: 0, rs: 0, stats: { Power: 14, Speed: 14, Spirit: 14, Recovery: 14 }, essences: [], abilities: {}, options: {}, confluence: {} });
          return '<tr class="' + (dist <= shift ? 'hl' : '') + '"><td>' + row + '</td><td>' + U.xref('ability:' + b.name, b.name) + '</td><td>' + esc(b.type) + '</td><td class="small">' + esc(A.compute(b, S).text) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      } else reach += '<p class="small quiet">The rulebook writes out the Blood chart only. Read these rows from the ' + esc(a.ess) + ' chart you wrote with the template (GM’s Guide §5.4).</p>';
    }
    var props = '';
    if (g.hg) props = '<div class="row" style="margin-top:10px"><button class="btn" data-act="gmHG">' + U.icon('d20') + ' Roll ' + g.hg + ' High-Grade propert' + (g.hg > 1 ? 'ies' : 'y') + '</button>' + a.hg.map(function (h) { return '<button class="chip on" data-act="codex" data-ref="hg:' + esc(h.k) + '">' + h.roll + ': ' + esc(h.k) + ' (' + esc(h.text) + ')</button>'; }).join('') + '</div>';
    if (g.template) {
      var named = stone && stone.template ? A.templateByName(stone.template) : null;
      props = '<div style="margin-top:10px">' + (named ? '<p>Named template: <b>' + esc(named.k) + '</b>. ' + esc(named.power) + '. Drawback: ' + esc(named.cost) + '.</p>' : '<button class="btn" data-act="gmTpl">' + U.icon('d20') + ' Roll the Grave Mutation' + (a.ow ? ' (outworlder: twice, choose)' : '') + '</button>') +
        (a.tpl ? a.tpl.map(function (t) { return '<p class="small"><button class="chip on" data-act="codex" data-ref="tpl:' + esc(t.k) + '">' + t.roll + ': ' + esc(t.k) + '</button> ' + esc(t.power) + '. Drawback: ' + esc(t.cost) + '. Net ' + t.net + ' APB.</p>'; }).join('') : '') + '</div>';
    }
    var cf = GS.conf.filter(Boolean).length === 3 ? R.resolveConfluence({ essences: GS.conf, heritage: 'native', options: { shifting: !!GS.confRoll }, confluence: { shiftRoll: GS.confRoll } }) : null;
    var dl = '<datalist id="essDL">' + D.essences.map(function (e) { return '<option value="' + esc(e.name) + '">'; }).join('') + '</datalist>';
    var confHTML = '<div class="grid4" style="grid-template-columns:repeat(3,1fr)">' + [0, 1, 2].map(function (i) { return '<label class="f"><span>Essence ' + (i + 1) + '</span><input type="text" list="essDL" data-root="gm" data-bind="conf.' + i + '" value="' + esc(GS.conf[i]) + '" placeholder="Type or pick"></label>'; }).join('') + '</div>' + dl;
    var bad = GS.conf.filter(function (n) { return n && !D.essenceByName[n]; });
    if (bad.length) confHTML += '<p class="small" style="color:var(--warn)">Not in the index: ' + esc(bad.join(', ')) + '. Names are case-sensitive.</p>';
    else if (cf) {
      var u = cf.usual;
      confHTML += '<div class="confluence" style="grid-template-columns:150px 1fr"><div>' + EA.sigil(GS.conf, cf, { small: true }) + '</div><div><p class="cname">' + U.dot(cf.tag) + U.xref('conf:' + cf.name, cf.name, 'title') + '</p><p style="margin:0 0 6px">' + esc(cf.theme) + '</p>' + (EA.lore.confluence[cf.name] || EA.lore.derived[cf.name] ? '<blockquote class="cquote" style="--entity:var(--gold);font-size:16px">' + esc(EA.lore.confluence[cf.name] || EA.lore.derived[cf.name]) + '</blockquote>' : '') +
        '<p class="small quiet">' + esc(u.source) + (u.step ? ': ' + esc(u.step) : '') + '.' + (u.alt ? ' The records also list ' + esc(u.alt) + ' for this trio.' : '') + ' Trio key: ' + esc(cf.key) + '.</p>' +
        (cf.restricted ? '<p class="chip bad">Restricted by the Adventure Society</p>' : '') + (cf.note ? '<p class="small">' + esc(cf.note) + '</p>' : '') +
        '<div class="row"><button class="btn sm" data-act="gmConfRoll">' + U.icon('d20') + ' Shifting confluence roll</button>' + (GS.confRoll ? '<button class="btn sm" data-act="gmConfClear">Clear roll</button>' : '') + '</div></div></div>';
    }
    var loot = GS.loot.map(function (l) { return '<div class="outcome"><div><div class="tier hit">' + (l.ref ? U.xref(l.ref, l.item, 'title') : esc(l.item)) + '</div><div class="small quiet">' + esc(l.detail) + '</div></div><div class="small quiet">' + esc(l.rolls) + '</div></div>'; }).join('');
    return topbar() + '<main class="wrap"><div class="cols2">' +
      '<section class="panel"><h2>Run an awakening</h2><p class="lede">The player picks the essence and hands over the stone. You roll, show them the rows their stone can reach, and they choose.</p>' +
      '<div class="grid2"><label class="f"><span>Essence</span><select data-root="gm" data-bind="awaken.ess">' + essOpts + '</select></label><label class="f"><span>Stone</span><select data-root="gm" data-bind="awaken.stone">' + stoneOpts + '</select></label></div>' +
      '<p class="small" style="margin:-4px 0 10px">' + U.xref('essence:' + a.ess, 'About ' + a.ess) + (stone ? ' \u2022 ' + U.xref('stone:' + stone.id, 'About this stone') : '') + '</p>' +
      '<label class="small"><input type="checkbox" data-root="gm" data-bind="awaken.ow"' + (a.ow ? ' checked' : '') + '> Outworlder (steers one row further)</label>' +
      '<p class="small quiet">' + esc(g.label) + (stone && stone.fixed ? '. Fixed ability: ' + esc(stone.fixed) + '; no roll.' : '') + '</p>' +
      '<div class="row"><button class="btn primary" data-act="gmAwRoll"' + (stone && stone.fixed ? ' disabled' : '') + '>' + U.icon('d20') + ' Roll the chart</button></div>' + reach + props + '</section>' +
      '<div><section class="panel"><h2>Confluence lookup</h2><p class="lede">Any three essences. Known trios first, then the Uncovered Trio Procedure.</p>' + confHTML + '</section>' +
      '<section class="panel"><div class="spread"><h2 style="margin:0">Loot</h2><div class="row"><button class="btn" data-act="gmLoot" data-k="essence">' + U.icon('d20') + ' An essence</button><button class="btn" data-act="gmLoot" data-k="stone">' + U.icon('d20') + ' A stone</button>' + (GS.loot.length ? '<button class="btn sm" data-act="gmLootClear">Clear</button>' : '') + '</div></div>' +
      '<p class="small quiet">Rarity roll: 1–10 Common, 11–15 Uncommon, 16–18 Rare, 19 Epic, 20 roll again (1–15 Epic, 16–20 Legendary). Divine stones are never random loot.</p>' + loot + '</section></div></div></main>';
  };
  act.gmAwRoll = function () { var a = GS.awaken; a.roll = U.d20(); a.hg = []; a.tpl = null; U.render(); };
  act.gmHG = function () {
    var a = GS.awaken, s = D.stones.filter(function (x) { return x.id === a.stone; })[0], n = s && s.rarity === 'Epic' ? 2 : 1;
    a.hg = []; for (var i = 0; i < n; i++) { var r = U.d20(), h = A.hgByRoll(r); a.hg.push({ roll: r, k: h.k, text: h.text }); }
    if (n === 2 && a.hg[0].k === a.hg[1].k) U.toast('Both rolls gave ' + a.hg[0].k + ': it applies at double value.');
    U.render();
  };
  act.gmTpl = function () { var a = GS.awaken, n = a.ow ? 2 : 1; a.tpl = []; for (var i = 0; i < n; i++) { var r = U.d20(), t = A.templateByRoll(r); a.tpl.push(Object.assign({ roll: r }, t)); } U.render(); };
  act.gmConfRoll = function () { GS.confRoll = U.d20(); U.render(); };
  act.gmConfClear = function () { GS.confRoll = null; U.render(); };
  act.gmLoot = function (el) {
    var k = el.getAttribute('data-k'), r = G.lootRarity(U.d20), item, detail, ref;
    if (k === 'essence') {
      var pool = D.essences.filter(function (e) { return e.rarity === r.rarity; });
      var e = G.pick(pool); ref = 'essence:' + e.name; item = e.name + ' essence'; detail = e.rarity + ' • ' + e.theme;
    } else {
      var sp = D.stones.filter(function (s) { return s.rarity === r.rarity; });
      if (!sp.length) sp = D.stones.filter(function (s) { return s.grade === 'Standard'; });
      var s = G.pick(sp); ref = 'stone:' + s.id; item = s.name; detail = s.rarity + ' • ' + s.grade + (s.lock ? ' • leans ' + s.lock : '') + (s.template ? ' • template ' + s.template : '');
    }
    GS.loot.unshift({ item: item, ref: ref, detail: detail, rolls: 'd20 ' + r.roll + (r.reroll ? ', then ' + r.reroll : '') });
    U.render();
  };
  act.gmLootClear = function () { GS.loot = []; U.render(); };

  // ======================= REFERENCE =======================
  U.views.reference = function () {
    var o = GS.odds, h = GS.haz, tb = GS.tab;
    var od = G.odds(+o.cmA, +o.cmD, +o.rA, +o.rD, !!o.area);
    var cols = ['#5c5470', '#f0b35a', '#7fe3f2', '#62d9a0', '#a98bff', '#ff6f7f'];
    var oddsBar = '<div class="oddsbar">' + od.counts.map(function (n, i) { return n ? '<i style="width:' + n * 5 + '%;background:' + cols[i] + '" title="' + R.HIT_TIERS[i].label + ' ' + n * 5 + '%">' + (n >= 2 ? R.HIT_TIERS[i].label.replace(' Hit', '') + ' ' + n * 5 + '%' : '') + '</i>' : ''; }).join('') + '</div>';
    var num = function (k, root, v, min, max) { return '<input type="number" data-type="int" min="' + min + '" max="' + max + '" data-root="gm" data-bind="' + root + '.' + k + '" value="' + v + '" style="width:80px;display:inline-block">'; };
    var oddsHTML = '<div class="row"><label class="small quiet">Attacker bonus ' + num('cmA', 'odds', o.cmA, -20, 70) + '</label><label class="small quiet">rank ' + rankSel('odds.rA', +o.rA, 'gm') + '</label>' +
      '<label class="small quiet">Defender bonus ' + num('cmD', 'odds', o.cmD, -20, 70) + '</label><label class="small quiet">rank ' + rankSel('odds.rD', +o.rD, 'gm') + '</label>' +
      '<label class="small"><input type="checkbox" data-root="gm" data-bind="odds.area"' + (o.area ? ' checked' : '') + '> Area</label></div>' + oddsBar +
      '<p class="small">Needs ' + (/^(8|11|18)$/.test(String(od.needed)) ? 'an ' : 'a ') + od.needed + ' or better to hit. Hit or better ' + Math.round(od.success * 100) + '% • expected damage multiplier ' + od.edm.toFixed(3) + '. A contested check with the same bonuses succeeds ' + Math.round(od.success * 100) + '% of the time.</p>';
    var hr = G.hazard(+h.rank, h.diff), need = 11 + hr - (+h.cm);
    var hazHTML = '<div class="row"><label class="small quiet">Hazard rank ' + rankSel('haz.rank', +h.rank, 'gm') + '</label><label class="small quiet">Difficulty <select data-root="gm" data-bind="haz.diff" style="width:auto">' + Object.keys(G.HAZARD).map(function (k) { return '<option value="' + k + '"' + (h.diff === k ? ' selected' : '') + '>' + k + ' (+' + G.HAZARD[k] + ')</option>'; }).join('') + '</select></label>' +
      '<label class="small quiet">Character bonus ' + num('cm', 'haz', h.cm, -20, 70) + '</label></div><p>Hazard Rating <b>' + hr + '</b>: the character needs d20 ≥ <b>' + need + '</b> (' + Math.max(0, Math.min(100, (21 - need) * 5)) + '% before natural 20s and 1s).</p>';
    // rank table
    var raw = Math.max(1, Math.min(30, +tb.raw || 13));
    var rankRows = R.RANKS.map(function (n, r) {
      return '<tr><th>' + n + '</th>' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (s) { var M = R.M(r, s); return '<td class="n" title="M ' + M.toFixed(3) + ', bonus ' + R.sign(R.statMod(raw) + R.P(r, s)) + '">' + R.fmt(Math.floor(raw * M)) + '</td>'; }).join('') + '</tr>';
    }).join('');
    // pools for the chosen raw at a chosen rank
    var poolRows = '';
    for (var s = 0; s <= 9; s++) {
      var Sx = R.computeSheet({ heritage: 'native', rank: +tb.r, rs: s, stats: { Power: raw, Speed: raw, Spirit: raw, Recovery: raw }, essences: [], abilities: {}, options: { tableScale: true }, confluence: {} });
      poolRows += '<tr><th>Step ' + s + '</th><td class="n">' + R.fmt(Sx.pool.HP.dMax) + ' (' + Sx.pool.HP.dReg + ')</td><td class="n">' + R.fmt(Sx.pool.MP.dMax) + ' (' + Sx.pool.MP.dReg + ')</td><td class="n">' + R.fmt(Sx.pool.SP.dMax) + ' (' + Sx.pool.SP.dReg + ')</td><td class="n">' + R.sign(R.statMod(raw) + R.P(+tb.r, s)) + '</td></tr>';
    }
    var Mr = R.M(+tb.r, +tb.rs), Bt = Math.pow(4, +tb.r);
    var costRows = A.CDS.map(function (cd) { var t = A.TABLE_A[cd]; return '<tr><td>' + cd + '</td><td class="n">' + 6 * cd + '</td><td class="n">' + t.C.toFixed(2) + '</td><td class="n">' + t.k + '</td><td class="n">' + R.fmt(Math.floor(Math.floor(t.k * Mr) / Bt)) + '</td></tr>'; }).join('');
    // indexes
    var q = (tb.q || '').toLowerCase();
    var essRows = D.essences.filter(function (e) { return (!q || e.name.toLowerCase().indexOf(q) >= 0 || e.theme.toLowerCase().indexOf(q) >= 0) && (!tb.fam || e.family === tb.fam) && (!tb.rar || e.rarity === tb.rar); })
      .map(function (e) { return '<tr><td>' + U.dot('unverified') + U.xref('essence:' + e.name, e.name) + '</td><td>' + U.xref('rarity:' + e.rarity, e.rarity) + '</td><td><span class="ess-opt" style="padding:0;border:0;background:none"><span class="fam" style="background:' + U.FAMILY_COLOR[e.family] + '"></span></span>' + U.xref('family:' + e.family, e.family) + '</td><td class="small">' + esc(e.theme) + '</td></tr>'; }).join('');
    var fams = Object.keys(U.FAMILY_COLOR).filter(function (f) { return f !== 'MIXED'; });
    var stoneRows = D.stones.map(function (s) { return '<tr><td>' + U.dot(s.tag) + U.xref('stone:' + s.id, s.name.replace('Awakening Stone of ', '')) + '</td><td>' + esc(s.rarity) + '</td><td>' + U.xref('grade:' + s.grade, s.grade) + (s.provisional ? ' (provisional)' : '') + '</td><td>' + esc(s.lock || 'Free roll') + '</td><td>' + (s.template ? U.xref('tpl:' + s.template, s.template) : esc(s.fixed || '')) + '</td></tr>'; }).join('');
    return topbar() + '<main class="wrap"><div class="cols2">' +
      '<section class="panel"><h2>Odds</h2><p class="lede">Every face of the d20 read through the attack rules, Rank Wall and area floor included.</p>' + oddsHTML + '<hr class="rule"><h3>Hazards</h3>' + hazHTML + '</section>' +
      '<section class="panel"><h2>Ability costs</h2><p class="lede">Table A at <select data-type="int" data-root="gm" data-bind="tab.r" style="width:auto">' + R.RANKS.map(function (n, i) { return '<option value="' + i + '"' + (+tb.r === i ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select> ' + stepSel('tab.rs', +tb.rs, 'gm') + ', at table scale.</p>' +
      '<div class="tblwrap"><table class="tbl"><thead><tr><th>CD (Rounds)</th><th class="n">Base Ticks</th><th class="n">C per 100 APB</th><th class="n">κ</th><th class="n">Cost</th></tr></thead><tbody>' + costRows + '</tbody></table></div></section></div>' +
      '<section class="panel"><div class="spread"><h2 style="margin:0">Effective stat by rank</h2><label class="small quiet">Raw stat <input type="number" min="1" max="30" data-type="int" data-root="gm" data-bind="tab.raw" value="' + raw + '" style="width:80px;display:inline-block"></label></div>' +
      '<div class="scrollbox" style="margin-top:10px"><table class="tbl"><thead><tr><th></th>' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (i) { return '<th class="n">Step ' + i + '</th>'; }).join('') + '</tr></thead><tbody>' + rankRows + '</tbody></table></div>' +
      '<h3 style="margin-top:18px">Pools at ' + R.RANKS[+tb.r] + ' for stat ' + raw + ' (table scale, regain per Upkeep in brackets)</h3><div class="scrollbox"><table class="tbl"><thead><tr><th></th><th class="n">Health (Power)</th><th class="n">Mana (Spirit)</th><th class="n">Stamina (Speed)</th><th class="n">Check bonus</th></tr></thead><tbody>' + poolRows + '</tbody></table></div></section>' +
      '<section class="panel"><div class="spread"><h2 style="margin:0">Essence index</h2><div class="row"><input type="search" data-root="gm" data-bind="tab.q" data-key="refq" value="' + esc(tb.q) + '" placeholder="Search name or theme" style="width:220px">' +
      '<select data-root="gm" data-bind="tab.fam" style="width:auto"><option value="">Any family</option>' + fams.map(function (f) { return '<option' + (tb.fam === f ? ' selected' : '') + '>' + f + '</option>'; }).join('') + '</select>' +
      '<select data-root="gm" data-bind="tab.rar" style="width:auto"><option value="">Any rarity</option>' + ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Unknown'].map(function (r) { return '<option' + (tb.rar === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="scrollbox" style="margin-top:10px"><table class="tbl"><thead><tr><th>Essence</th><th>Rarity</th><th>Family</th><th>Theme</th></tr></thead><tbody>' + essRows + '</tbody></table></div></section>' +
      '<section class="panel"><h2>Stone index</h2><div class="scrollbox"><table class="tbl"><thead><tr><th>Stone</th><th>Rarity</th><th>Grade</th><th>Leans toward</th><th>Template or fixed ability</th></tr></thead><tbody>' + stoneRows + '</tbody></table></div></section>' +
      '</main>';
  };
})(window.EA = window.EA || {});

(function (EA) {
  'use strict';
  EA.ui.views.codex = function () { return EA.ui.gmTopbar() + '<main class="wrap codex-wrap">' + EA.codex.viewHTML() + '</main>'; };
})(window.EA = window.EA || {});
