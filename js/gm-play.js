/* Essence & Ascension — GM desk
 * gm-play.js: the Play page, the GM's at-the-table hub. Party at a glance, the fight in brief,
 * group rolls, dice with secret rolls, quick reference, trackers, in-world time and session notes.
 */
(function (EA) {
  'use strict';
  var U = EA.ui, R = EA.rules, P = EA.play, G = EA.gm, T = EA.tt, esc = U.esc, act = U.actions;
  U.state.gmPlay = { groupStat: 'Speed', groupLabel: '' };
  var GP = U.state.gmPlay;

  function bar(k, cur, max, temp) {
    var pct = max ? Math.max(0, Math.min(100, cur / max * 100)) : 0, tp = temp ? Math.min(100 - pct, temp / max * 100) : 0;
    return '<div class="bar ' + k + '"><i class="v" style="width:' + pct + '%"></i>' + (tp ? '<i class="t" style="left:' + pct + '%;width:' + tp + '%"></i>' : '') + '</div>';
  }
  /** Each party member with the numbers the table needs: the fight copy if they are in the encounter, else their sheet. */
  function party() {
    var e = G.state.enc;
    return G.partyList().map(function (pp) {
      var x = e.combatants.filter(function (y) { return y.side === 'party' && y.c.id === pp.c.id; })[0];
      if (x) { G.prep(e); return { c: x.c, S: G.sheet(x), def: G.defenses(x), x: x, src: pp.src }; }
      var c = pp.c, S = R.computeSheet(Object.assign({}, c, { options: Object.assign({}, c.options, { tableScale: e.tableScale, partyRank: e.partyRank }) }));
      var cm = function (k) { return S.stat[k].cm; };
      return { c: c, S: S, def: { Strike: { cm: Math.max(cm('Speed'), cm('Power')) }, Spell: { cm: Math.max(cm('Speed'), cm('Spirit')) }, Area: { cm: cm('Speed') }, res: { Power: cm('Power'), Recovery: cm('Recovery'), Spirit: cm('Spirit') } }, x: null, src: pp.src };
    });
  }
  function pools(m) {
    var p = m.c.play || {}, S = m.S, live = m.x || p.init;
    return ['HP', 'MP', 'SP'].map(function (k) {
      var key = k.toLowerCase(), cur = live ? p[key] : S.pool[k].dMax;
      return '<div><span>' + S.pool[k].label + ' ' + R.fmt(cur) + ' / ' + R.fmt(S.pool[k].dMax) + (k === 'HP' && live && p.temp ? ' +' + p.temp : '') + '</span>' + bar(k, cur, S.pool[k].dMax, k === 'HP' && live ? p.temp : 0) + '</div>';
    }).join('');
  }
  function memberCard(m) {
    var c = m.c, S = m.S, p = c.play || {}, d = m.def;
    var flags = [];
    if (m.x) flags.push('<span class="chip on">in the fight</span>');
    if ((m.x || p.init) && p.hp <= 0) flags.push('<span class="chip bad">Downed • ' + (p.deathMarks || 0) + ' marks</span>');
    if ((m.x || p.init) && p.sp <= 0) flags.push('<span class="chip warn">Exhausted</span>');
    var affs = (m.x || p.init) && p.afflictions ? p.afflictions.map(function (a) { return '<button class="chip warn" data-act="codex" data-ref="aff:' + esc(a.type) + '">' + esc(a.type.replace(' (status)', '')) + ' ×' + a.S + '</button>'; }).join(' ') : '';
    return '<div class="combatant party pc"><div class="top" style="grid-template-columns:minmax(0,1fr) auto"><div style="min-width:0"><div class="nm">' + U.xref('char:' + c.id, c.name || 'Unnamed', 'title') + ' ' + flags.join(' ') + '</div>' +
      '<div class="small quiet">' + U.xref('rank:' + c.rank, S.rankName) + ' • ' + c.essences.filter(Boolean).map(function (n) { return U.xref('essence:' + n, n); }).join(', ') + (S.confluence ? ' → ' + U.xref('conf:' + S.confluence.name, S.confluence.name) : '') + '</div></div>' +
      '<div class="small quiet" style="text-align:right">Init ' + R.sign(S.init) + '<br>Move ' + S.move + ' m</div></div>' +
      '<div class="mini">' + pools(m) + '</div>' +
      '<dl class="kv pcstats"><dt>Defense: strikes / spells / areas</dt><dd>' + R.sign(d.Strike.cm) + ' / ' + R.sign(d.Spell.cm) + ' / ' + R.sign(d.Area.cm) + '</dd>' +
      '<dt>Resist ' + U.xref('aff:Bleed', 'Bleed') + ' / ' + U.xref('aff:Poison', 'Poison') + ' / ' + U.xref('aff:Necrosis', 'Necrosis') + '</dt><dd>' + R.sign(d.res.Power) + ' / ' + R.sign(d.res.Recovery) + ' / ' + R.sign(d.res.Spirit) + '</dd>' +
      '<dt>To hit them, a strike needs</dt><dd>' + (11 + d.Strike.cm) + '</dd></dl>' + (affs ? '<div class="row" style="margin-top:6px">' + affs + '</div>' : '') + '</div>';
  }

  function fightBrief() {
    var e = G.state.enc;
    if (!e.combatants.length) return '<section class="panel"><div class="spread"><h3 style="margin:0">The fight</h3><button class="btn sm" data-act="gmGo" data-to="encounter">Set up an encounter</button></div><p class="small quiet" style="margin:6px 0 0">No encounter yet.</p></section>';
    G.prep(e);
    var tm = G.tickMode(e), alive = function (side) { return e.combatants.filter(function (x) { return x.side === side && x.c.play.hp > 0; }).length; };
    var now = '';
    if (e.started && !tm) { var cur = G.current(e); now = cur ? 'Round ' + e.round + ': <b>' + esc(cur.name) + '</b> is acting.' : 'Round ' + e.round + '.'; }
    else if (e.started) { var r = G.readyNow(e); now = 'Round ' + e.round + ', Tick ' + e.tick + ': ' + (r.length ? 'ready now ' + r.map(function (x) { return '<b>' + esc(x.name) + '</b>'; }).join(', ') : 'nobody ready; advance the clock') + '.'; }
    else now = 'Not started.';
    var foes = e.combatants.filter(function (x) { return x.side === 'foes'; }).map(function (x) {
      var S = G.sheet(x), p = x.c.play;
      return '<div class="spread small" style="margin-bottom:4px"><span>' + U.xref('monster:' + x.srcId, x.name) + '</span><span style="flex:1;margin:0 10px;max-width:220px">' + bar('HP', p.hp, S.pool.HP.dMax, p.temp) + '</span><span class="quiet">' + R.fmt(p.hp) + ' / ' + R.fmt(S.pool.HP.dMax) + '</span></div>';
    }).join('');
    return '<section class="panel"><div class="spread"><h3 style="margin:0">' + esc(e.name || 'The fight') + '</h3><button class="btn sm primary" data-act="gmGo" data-to="encounter">Open the encounter</button></div>' +
      '<p style="margin:6px 0 10px">' + now + ' <span class="quiet small">' + (tm ? 'Tick track' : 'Turns') + ' • party ' + alive('party') + ' standing, foes ' + alive('foes') + ' standing</span></p>' + foes + '</section>';
  }

  function groupTools(list) {
    var opts = R.STATS.map(function (k) { return '<option' + (GP.groupStat === k ? ' selected' : '') + '>' + k + '</option>'; }).join('');
    return '<div class="row" style="margin-top:12px"><button class="btn sm" data-act="gpInit"' + (list.length ? '' : ' disabled') + '>' + U.icon('d20') + ' Everyone rolls initiative</button>' +
      '<label class="small quiet">Group check <select data-root="gmPlay" data-bind="groupStat" style="width:auto">' + opts + '</select></label>' +
      '<input type="text" data-root="gmPlay" data-bind="groupLabel" value="' + esc(GP.groupLabel) + '" placeholder="What for? (Perception)" style="width:180px">' +
      '<button class="btn sm" data-act="gpCheck"' + (list.length ? '' : ' disabled') + '>Everyone rolls</button>' +
      '<button class="btn sm" data-act="gpPick"' + (list.length ? '' : ' disabled') + '>Pick a random adventurer</button>' +
      '<button class="btn sm" data-act="gpRest"' + (list.length ? '' : ' disabled') + ' title="Advances the clock an hour; fills the pools of party members in the encounter">An hour of rest</button></div>';
  }
  U.roots.gmPlay = function () { return GP; };

  U.views.play = function () {
    var list = party();
    var partyPanel = '<section class="panel"><div class="spread"><h2 style="margin:0">The party</h2><button class="btn sm" data-act="gmGo" data-to="party">Manage</button></div>' +
      (list.length ? '<div class="pcgrid">' + list.map(memberCard).join('') + '</div>' : '<p class="quiet">No adventurers yet. Players build them in the Character Forge on this device, or send you their files to import on the Party page.</p>') +
      groupTools(list) + '</section>';
    return U.gmTopbar() + '<main class="wrap"><div class="play-grid gmplay"><div>' + partyPanel + fightBrief() +
      '<div class="cols2" style="margin-top:22px">' + T.trackersHTML('gm') + T.clockHTML('gm') + '</div>' + T.notesHTML('gm') + '</div>' +
      '<div>' + T.diceHTML('gm', { title: 'Dice and table log' }) + T.refHTML('gm') + '</div></div></main>';
  };

  act.gpInit = function () {
    var lines = party().map(function (m) { var d = U.d20(); return { n: m.c.name || 'Unnamed', t: d + m.S.init, d: d, b: m.S.init }; }).sort(function (a, b) { return b.t - a.t; });
    T.logText('gm', 'Initiative: ' + lines.map(function (l) { return l.n + ' ' + l.t + ' (d20 ' + l.d + ' ' + R.sign(l.b) + ')'; }).join(', ') + '.', 'roll');
    U.render();
  };
  act.gpCheck = function () {
    var k = GP.groupStat, what = GP.groupLabel ? GP.groupLabel + ' (' + k + ')' : k + ' check';
    var lines = party().map(function (m) { var d = U.d20(), b = m.S.stat[k].cm; return (m.c.name || 'Unnamed') + ' ' + (d + b) + (d === 20 ? ' (natural 20)' : d === 1 ? ' (natural 1)' : ''); });
    T.logText('gm', what + ': ' + lines.join(', ') + '.', 'roll');
    U.render();
  };
  act.gpPick = function () {
    var list = party(), m = list[T.die(list.length) - 1];
    T.logText('gm', 'Random adventurer: ' + (m.c.name || 'Unnamed') + '.', 'note'); U.toast((m.c.name || 'Unnamed') + '.'); U.render();
  };
  act.gpRest = function () {
    var e = G.state.enc, n = 0;
    e.combatants.filter(function (x) { return x.side === 'party'; }).forEach(function (x) { P.restHour(x.c); n++; });
    T.advanceClock('gm', 60);
    T.logText('gm', 'The party rests for an hour' + (n ? ': ' + n + ' in the encounter restored to full.' : '. Remind players to tap “An hour of rest” on their own sheets.'), 'note');
    G.save(); U.render();
  };
})(window.EA = window.EA || {});
