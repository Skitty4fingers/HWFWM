/* Essence & Ascension — table tools
 * table-tools.js: game-time utilities shared by the Character Forge and the GM desk.
 *   - dice: any expression (2d6+3, 4d6kh3, d20+7, d100), quick-dice pool, secret rolls, history,
 *     and reading a d20 total against a target number
 *   - quick reference: the rules you reach for mid-session, in plain language, linked to the codex
 *   - trackers, an in-world clock and session notes (GM)
 * State persists in localStorage under 'ea-table-v1', split by namespace ('player' / 'gm').
 */
(function (EA) {
  'use strict';
  var U = EA.ui, R = EA.rules, esc = U.esc;
  var T = EA.tt = {};
  var KEY = 'ea-table-v1';

  // ---------- state ----------
  function blank() { return { rolls: [], pool: {}, mod: 0, expr: '', secret: false, vs: '', notes: '', trackers: [], clock: { day: 1, min: 480 }, refTab: 'turn', refQ: '' }; }
  T.state = { player: blank(), gm: blank() };
  T.load = function () {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw) ['player', 'gm'].forEach(function (ns) { T.state[ns] = Object.assign(blank(), raw[ns] || {}); });
    } catch (e) { /* keep defaults */ }
    if (!T.state.gm.trackers.length) T.state.gm.trackers = [{ id: 't1', name: 'Alarm', val: 0, max: 6 }, { id: 't2', name: 'Monster surge', val: 0, max: 10 }];
  };
  var timer = null;
  function write() { timer = null; try { localStorage.setItem(KEY, JSON.stringify(T.state)); } catch (e) { /* storage blocked */ } }
  T.save = function () { clearTimeout(timer); timer = setTimeout(write, 250); };
  window.addEventListener('pagehide', function () { if (timer) { clearTimeout(timer); write(); } });
  function st(ns) { return T.state[ns]; }
  function stamp() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  // ---------- dice ----------
  T.die = function (n) {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint32Array(1), lim = Math.floor(4294967296 / n) * n;
      do { crypto.getRandomValues(a); } while (a[0] >= lim);
      return (a[0] % n) + 1;
    }
    return 1 + Math.floor(Math.random() * n);
  };
  /** Parse "2d6+1d4-1", "4d6kh3", "d20+7", "d%". Returns terms or throws. */
  T.parse = function (expr) {
    var s = String(expr || '').toLowerCase().replace(/\s+/g, '').replace(/d%/g, 'd100');
    if (!s) throw new Error('Type dice like 2d6+3.');
    if (!/^[+-]?(\d*d\d+(k[hl]\d+)?|\d+)([+-](\d*d\d+(k[hl]\d+)?|\d+))*$/.test(s)) throw new Error('Could not read “' + expr + '”. Try 2d6+3 or 4d6kh3.');
    var terms = [], re = /([+-]?)(?:(\d*)d(\d+)(?:k([hl])(\d+))?|(\d+))/g, m;
    while ((m = re.exec(s))) {
      if (!m[0]) { re.lastIndex++; continue; }
      var sign = m[1] === '-' ? -1 : 1;
      if (m[6] != null) terms.push({ sign: sign, k: +m[6] });
      else {
        var n = m[2] === '' ? 1 : +m[2], sides = +m[3];
        if (n < 1 || n > 100 || sides < 2 || sides > 1000) throw new Error('Keep to 1–100 dice of 2–1000 sides.');
        terms.push({ sign: sign, n: n, d: sides, keep: m[4] ? { hl: m[4], n: Math.min(n, +m[5]) } : null });
      }
    }
    return terms;
  };
  T.roll = function (expr, label) {
    var terms = T.parse(expr), total = 0, parts = [], natural = null;
    terms.forEach(function (t) {
      if (t.k != null) { total += t.sign * t.k; parts.push({ sign: t.sign, k: t.k }); return; }
      var faces = [];
      for (var i = 0; i < t.n; i++) faces.push({ v: T.die(t.d), keep: true });
      if (t.keep) {
        var order = faces.map(function (f, i) { return i; }).sort(function (a, b) { return t.keep.hl === 'h' ? faces[b].v - faces[a].v : faces[a].v - faces[b].v; });
        faces.forEach(function (f) { f.keep = false; });
        order.slice(0, t.keep.n).forEach(function (i) { faces[i].keep = true; });
      }
      var sum = faces.reduce(function (s, f) { return s + (f.keep ? f.v : 0); }, 0);
      total += t.sign * sum;
      parts.push({ sign: t.sign, n: t.n, d: t.d, faces: faces, keep: t.keep });
      if (t.n === 1 && t.d === 20 && terms.filter(function (x) { return x.d; }).length === 1) natural = faces[0].v;
    });
    return { expr: expr, label: label || '', total: total, parts: parts, natural: natural };
  };
  /** Read a d20 total against a target number (11 + the defense or resistance bonus). */
  T.read = function (total, tn, natural) {
    var mg = total - tn, deg = R.degree(mg), tier = deg.success ? 1 + deg.deg : (deg.deg === 1 ? 1 : 0);
    if (natural === 20) tier = Math.min(5, Math.max(tier, 1) + 1);
    if (natural === 1) tier = Math.max(0, Math.min(tier, 2) - 1);
    return { margin: mg, tier: tier, label: R.HIT_TIERS[tier].label };
  };
  function poolExpr(s) {
    var order = [4, 6, 8, 10, 12, 20, 100], bits = order.filter(function (d) { return s.pool[d]; }).map(function (d) { return s.pool[d] + 'd' + d; });
    if (s.mod) bits.push(String(s.mod));
    return bits.join('+').replace(/\+-/g, '-');
  }
  T.push = function (ns, r, extra) {
    var s = st(ns); r = Object.assign(r, extra || {}, { at: stamp() });
    s.rolls.unshift(r); if (s.rolls.length > 60) s.rolls.length = 60;
    T.save(); return r;
  };
  T.logText = function (ns, text, kind) { return T.push(ns, { text: text, kind: kind || 'note' }); };

  function facesHTML(r) {
    return r.parts.map(function (p, i) {
      var sign = i || p.sign < 0 ? (p.sign < 0 ? ' − ' : ' + ') : '';
      if (p.k != null) return sign + '<b>' + p.k + '</b>';
      return sign + '<span class="dset">' + p.faces.map(function (f) {
        var cls = 'df' + (f.keep ? '' : ' drop') + (f.v === p.d ? ' max' : f.v === 1 ? ' min' : '');
        return '<i class="' + cls + '" title="d' + p.d + '">' + f.v + '</i>';
      }).join('') + '<small>' + p.n + 'd' + p.d + (p.keep ? 'k' + p.keep.hl + p.keep.n : '') + '</small></span>';
    }).join('');
  }
  T.rollHTML = function (r, gm) {
    if (r.text) return '<div class="troll note"><time>' + esc(r.at) + '</time><span>' + esc(r.text) + '</span></div>';
    var read = r.read ? ' <span class="chip ' + (r.read.tier === 0 ? 'bad' : r.read.tier === 1 ? 'warn' : 'on') + '">' + esc(r.read.label) + ' vs ' + r.vs + ' (' + R.sign(r.read.margin) + ')</span>' : '';
    var nat = r.natural === 20 ? ' <span class="chip on">natural 20</span>' : r.natural === 1 ? ' <span class="chip bad">natural 1</span>' : '';
    return '<div class="troll' + (r.secret ? ' secret' : '') + '"><time>' + esc(r.at) + '</time><div><div class="tline"><b class="ttot">' + r.total + '</b> <span class="small quiet">' + esc(r.label || r.expr) + (r.label ? ' • ' + esc(r.expr) : '') + '</span>' + (r.secret && gm ? ' <span class="chip">secret</span>' : '') + nat + read + '</div><div class="tfaces">' + facesHTML(r) + '</div></div></div>';
  };

  /** The dice tray. ns: 'player' | 'gm'. opts: { title, secret: bool, onRoll(r) } */
  T.diceHTML = function (ns, opts) {
    var s = st(ns), gm = ns === 'gm', last = s.rolls.filter(function (r) { return !r.text; })[0];
    var dice = [4, 6, 8, 10, 12, 20, 100].map(function (d) {
      return '<button class="dbtn" data-act="ttAdd" data-ns="' + ns + '" data-d="' + d + '" aria-label="Add a d' + d + '">' + (s.pool[d] ? '<span class="cnt">' + s.pool[d] + '</span>' : '') + 'd' + d + '</button>';
    }).join('');
    var pe = poolExpr(s);
    var big = last ? '<div class="tbig' + (last.natural === 20 ? ' nat20' : last.natural === 1 ? ' nat1' : '') + '"><span class="small quiet">' + esc(last.label || last.expr) + '</span><b>' + last.total + '</b><div class="tfaces">' + facesHTML(last) + '</div>' +
      (last.read ? '<div class="tier ' + (last.read.tier === 0 ? 'miss' : last.read.tier === 1 ? 'graze' : 'hit') + '">' + esc(last.read.label) + ' against ' + last.vs + '</div><div class="small faint">Read as equal ranks. Across ranks, the Rank Wall can cancel a natural 20 or 1.</div>' : '') + '</div>' : '';
    return '<section class="panel ttray"><div class="spread"><h3 style="margin:0">' + esc(opts && opts.title || 'Dice') + '</h3>' +
      (gm ? '<label class="small"><input type="checkbox" data-act="ttSecret" data-ns="' + ns + '"' + (s.secret ? ' checked' : '') + '> Secret roll</label>' : '') + '</div>' + big +
      '<div class="dpool">' + dice + '</div>' +
      '<div class="row" style="margin-top:8px"><span class="small quiet">Modifier</span><div class="stepper" style="grid-template-columns:30px 48px 30px"><button data-act="ttMod" data-ns="' + ns + '" data-d="-1" style="height:30px" aria-label="Lower modifier">−</button><output style="font-size:20px">' + R.sign(s.mod) + '</output><button data-act="ttMod" data-ns="' + ns + '" data-d="1" style="height:30px" aria-label="Raise modifier">+</button></div>' +
      '<button class="btn primary" data-act="ttRollPool" data-ns="' + ns + '"' + (pe && /d/.test(pe) ? '' : ' disabled') + '>' + U.icon('d20') + ' Roll ' + esc(pe || '') + '</button>' + (pe ? '<button class="btn sm" data-act="ttClear" data-ns="' + ns + '">Clear</button>' : '') + '</div>' +
      '<div class="row" style="margin-top:10px"><input type="text" data-key="ttexpr-' + ns + '" data-input="ttExpr" data-ns="' + ns + '" value="' + esc(s.expr) + '" placeholder="Or type: 2d6+3, 4d6kh3, d20+7" style="flex:1;min-width:150px" aria-label="Dice expression">' +
      '<button class="btn" data-act="ttRollExpr" data-ns="' + ns + '">Roll</button></div>' +
      '<div class="row" style="margin-top:8px"><label class="small quiet">Read a d20 against a target number <input type="number" data-key="ttvs-' + ns + '" data-input="ttVs" data-ns="' + ns + '" value="' + esc(s.vs) + '" placeholder="TN" style="width:76px;display:inline-block"></label><span class="small faint">TN = 11 + the defense or resistance bonus</span></div>' +
      '<div class="spread" style="margin-top:12px"><span class="small quiet">History</span>' + (s.rolls.length ? '<button class="btn sm" data-act="ttHistClear" data-ns="' + ns + '">Clear</button>' : '') + '</div>' +
      '<div class="thist" data-scroll="thist-' + ns + '">' + (s.rolls.length ? s.rolls.map(function (r) { return T.rollHTML(r, gm); }).join('') : '<p class="small quiet">Rolls appear here.</p>') + '</div></section>';
  };
  T.hooks = {};   // ns -> function(rollResult) called after each tray roll (e.g. copy into a character log)
  function doRoll(ns, expr, label) {
    var s = st(ns), r;
    try { r = T.roll(expr, label); } catch (e) { U.toast(e.message); return; }
    var vs = parseInt(s.vs, 10);
    if (!isNaN(vs) && r.parts.length && r.parts.filter(function (p) { return p.d; }).length === 1 && r.parts.filter(function (p) { return p.d; })[0].d === 20 && r.parts.filter(function (p) { return p.d; })[0].n === 1) {
      r.read = T.read(r.total, vs, r.natural); r.vs = vs;
    }
    T.push(ns, r, { secret: ns === 'gm' && s.secret });
    if (T.hooks[ns]) T.hooks[ns](r);
    U.render();
  }
  T.rollNow = doRoll;
  var A = U.actions;
  A.ttAdd = function (el) { var s = st(el.getAttribute('data-ns')), d = +el.getAttribute('data-d'); s.pool[d] = Math.min(20, (s.pool[d] || 0) + 1); T.save(); U.render(); };
  A.ttMod = function (el) { var s = st(el.getAttribute('data-ns')); s.mod = Math.max(-50, Math.min(50, s.mod + (+el.getAttribute('data-d')))); T.save(); U.render(); };
  A.ttClear = function (el) { var s = st(el.getAttribute('data-ns')); s.pool = {}; s.mod = 0; T.save(); U.render(); };
  A.ttRollPool = function (el) { var ns = el.getAttribute('data-ns'); doRoll(ns, poolExpr(st(ns))); };
  A.ttExpr = function (el, ev) { var ns = el.getAttribute('data-ns'); st(ns).expr = el.value; T.save(); if (ev && ev.inputType === 'insertLineBreak') doRoll(ns, el.value); };
  A.ttRollExpr = function (el) { var ns = el.getAttribute('data-ns'); doRoll(ns, st(ns).expr); };
  A.ttVs = function (el) { st(el.getAttribute('data-ns')).vs = el.value; T.save(); };
  A.ttSecret = function (el) { var s = st(el.getAttribute('data-ns')); s.secret = !s.secret; T.save(); U.render(); };
  A.ttHistClear = function (el) { st(el.getAttribute('data-ns')).rolls = []; T.save(); U.render(); };
  document.addEventListener('keydown', function (ev) {
    var t = ev.target;
    if (ev.key === 'Enter' && t && t.getAttribute && t.getAttribute('data-input') === 'ttExpr') { ev.preventDefault(); doRoll(t.getAttribute('data-ns'), t.value); }
  });

  // ---------- quick reference ----------
  function tbl(head, rows) { return '<div class="tblwrap"><table class="tbl"><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'; }
  function x(ref, label) { return U.xref(ref, label); }
  T.REF = [
    { id: 'turn', title: 'Your turn (Iron)', html: function () {
      return '<p>While everyone in the party is Iron, fights go in turns in Initiative order. Each turn has <b>3 Action Points</b>.</p>' + tbl(['Action', 'AP'], [
        ['<b>Major</b>: an attack ability, a spell, a conjuration or summon, a Basic Attack or a Mana Dart. One per turn.', '2'],
        ['<b>Minor</b>: switch on an aura, transform, or command a summon or familiar', '1'],
        ['<b>Move</b>: 6 m, plus your Speed stat bonus in meters if positive (doubles each rank)', '1'],
        ['<b>Dash</b>: a second Move', '1'],
        ['<b>Defend</b>: +2 to all your defenses until your next turn', '1'],
        ['<b>Use an item</b> or <b>interact</b> with something', '1'],
        ['<b>Help a Downed ally</b>: use a healing item or ability on them as a Minor', '1'],
        ['<b>Reaction</b>: an ability marked ' + x('kw:Reaction', 'Reaction') + ', on anyone’s turn, once per Round', '0'],
        ['<b>Hold</b>: end your turn and keep 1 unused AP for next turn (4 at most)', '0']]) +
        '<ul><li><b>Exert:</b> once per turn, pay Stamina for 1 extra AP (8 at Step 0, a little more each Step). It cannot buy a second Major.</li><li>At <b>0 Stamina</b> you get only 2 AP and cannot Exert.</li><li>Cooldowns count down by 1 at each of your Upkeeps; an ability is ready again at 0.</li></ul>';
    } },
    { id: 'ticks', title: 'The Tick track (Bronze+)', html: function () {
      return '<p>Once anyone in the party reaches ' + x('rank:1', 'Bronze') + ', there are no turns and no AP. Each Round has six Ticks; the GM counts them and calls each character when they are ready.</p><ul>' +
        '<li><b>When you are called</b>, take one Major. Your next is ready about 6 Ticks later: sooner with high Speed, later with low.</li>' +
        '<li><b>Every Round</b> you also get one free Move and one free Minor, at any Tick, unless you are casting.</li>' +
        '<li><b>Casting takes a moment</b>: about a Tick for a spell, longer for conjurations, summons and familiars. A hit of a tenth of your Health or more while casting can disrupt it: the cost is spent, the spell fails, and its cooldown does not start.</li>' +
        '<li><b>Surge:</b> once per Round, pay Stamina to act one Tick sooner.</li>' +
        '<li><b>Cooldowns</b> count in Ticks. <b>Upkeep</b> happens once per Round on your own Tick, your <b>Anchor</b>.</li></ul>';
    } },
    { id: 'roll', title: 'Reading the roll', html: function () {
      return '<p>Only the side taking the action rolls: <b>d20 + bonus</b> against <b>11 + the defender’s defense</b> (a strike is Dodged with Speed or Braced with Power, a spell Dodged or Warded with Spirit, whichever is better; an area is always Dodged). Every 5 points of margin is one degree.</p>' +
        tbl(['Margin', 'Result', 'Damage'], [['−6 or worse, or a natural 1', '<b>Miss</b>', '×0'], ['−1 to −5', '<b>Graze</b>', '×0.5'], ['0 to 4', '<b>Hit</b>', '×1'], ['5 to 9', '<b>Solid Hit</b>', '×1.25'], ['10 to 14', '<b>Strong Hit</b>', '×1.5'], ['15 or more', '<b>Devastating Hit</b>', '×2']]) +
        '<ul><li><b>Natural 20:</b> one degree better, and it succeeds unless the target outranks you. <b>Natural 1:</b> one degree worse, and it fails unless you outrank the target.</li>' +
        '<li><b>Afflictions read the same roll a second time</b> against 11 + the target’s resistance: beat it and every stack lands; miss by 1–5 and half land (round up); miss by more and none do. See ' + x('kw:Rider', 'Rider') + '.</li>' +
        '<li>' + x('kw:Area', 'Area') + ' attacks never miss a target of the same rank or lower outright: a Miss counts as a Graze.</li></ul>';
    } },
    { id: 'aff', title: 'Afflictions', html: function () {
      return tbl(['Affliction', 'Resisted with', 'Lasts', 'Cap', 'What it does'], Object.keys(R.AFFLICTIONS).map(function (k) {
        var a = R.AFFLICTIONS[k], l = EA.lore && EA.lore.affliction[k];
        return [x('aff:' + k, k.replace(' (status)', '')), x('stat:' + a.resist, a.resist), a.duration + ' Upkeeps', String(a.cap), esc(l ? l.rules.split('. ')[0] + '.' : '')];
      })) + '<p class="small">Recovery sheds stacks each Upkeep (never the last one). Doom ignores ordinary cleanses and bursts when it ends. Keywords that touch afflictions: ' +
        ['Amplify', 'Elongate', 'Detonate', 'Trigger', 'Cleanse'].map(function (k) { return x('kw:' + k, k); }).join(', ') + '.</p>';
    } },
    { id: 'upkeep', title: 'The Upkeep', html: function () {
      return '<p>Every combatant has one Upkeep per Round: at the end of their turn at Iron, on their Anchor Tick at Bronze and above. It runs in this order:</p><ol>' +
        '<li>Pay aura upkeep costs, or the aura drops.</li><li>Affliction ticks: Bleed, Poison and Necrosis deal their damage, in the order applied.</li><li>Downed check.</li>' +
        '<li>Regeneration of every pool (no Health while ' + x('aff:Necrosis', 'Necrosis') + ' is on you or you are Downed).</li><li>Aura Strain changes (Silver and above).</li>' +
        '<li>Recovery sheds affliction stacks; ' + x('aff:Doom (status)', 'Doom') + ' counts the other ticks.</li><li>Cooldowns go down by 1 (Iron).</li><li>Durations go down by 1.</li><li>Anything at 0 ends; Doom bursts.</li></ol>';
    } },
    { id: 'down', title: 'Downed and pool states', html: function () {
      return tbl(['State', 'When', 'Effect'], [
        ['<b>Downed</b>', 'Health reaches 0', 'No actions; no Health regeneration. Each Upkeep in which an affliction would deal Health damage, gain a <b>Death Mark</b> instead. Three Death Marks and you die. Any healing of 1 or more ends Downed and clears every Death Mark.'],
        ['<b>Mana-dry</b>', 'Mana is 0', 'You cannot pay Mana costs.'],
        ['<b>Exhausted</b>', 'Stamina is 0', 'You cannot pay Stamina costs; −2 to dodge strikes; only 2 AP at Iron.'],
        ['<b>Maximum goes up</b>', 'A rank, a Step or a buff', 'The current value rises by the same amount.'],
        ['<b>Maximum goes down</b>', 'A buff ends or a debuff', 'The current value is capped at the new maximum.']]);
    } },
    { id: 'rest', title: 'Rest and recovery', html: function () {
      return '<ul><li><b>In combat:</b> each Upkeep, every pool regains a little (Recovery-based, capped at 6% of maximum Health, 8% Mana, 10% Stamina).</li>' +
        '<li><b>After the fight:</b> once no enemy has acted for a full Round, each Round restores five times as much, with caps of 30%, 40% and 50%.</li>' +
        '<li><b>An hour of rest:</b> every pool full, every Death Mark gone.</li></ul><p class="small">See ' + x('stat:Recovery', 'Recovery') + '.</p>';
    } },
    { id: 'aura', title: 'Aura (Silver+)', html: function () {
      return '<p>At ' + x('rank:2', 'Silver') + ' your aura becomes a weapon.</p><ul>' +
        '<li><b>Press</b> (free Minor): push your aura onto enemies around you whose aura is not clearly stronger. They take a penalty (up to −3) to attacks and contests, act a little slower, and shake off afflictions less easily.</li>' +
        '<li><b>Strain</b> (0 to 10): pressing adds 1 each Round, a Suppression field 2; a Round of rest takes some off. At the maximum you <b>Collapse</b>: everything drops and your aura is down for 2 Rounds.</li>' +
        '<li><b>Aura Clash</b> (once per Round, free Minor or Reaction): d20 + your aura against theirs. Win well and you break their press; lose badly and you are pressed harder.</li>' +
        '<li><b>Suppression field</b> (Major): shut down the auras of enemies of your rank or lower around you. 2 Strain a Round.</li>' +
        '<li><b>Rank pressure:</b> enemies two or more ranks below are pressed automatically, without Strain. At ' + x('rank:4', 'Diamond') + ', one rank below, and you can impose a <b>Domain</b>.</li></ul>';
    } },
    { id: 'ranks', title: 'Rank gaps', html: function () {
      return '<ul><li>A rank is worth <b>+10</b> on every roll.</li><li><b>Rank Wall:</b> a natural 20 does not guarantee success against a higher rank, and a natural 1 does not guarantee failure against a lower one.</li>' +
        '<li><b>Rank Barrier:</b> damage from a lower-rank source is halved for each rank of difference.</li><li><b>Table scale:</b> every number is shown divided by 4 for each rank of the party, so Iron and Diamond fights use similar numbers.</li></ul>' +
        '<p class="small">' + R.RANKS.map(function (n, i) { return x('rank:' + i, n); }).join(' • ') + '</p>';
    } },
    { id: 'hazard', gm: true, title: 'Hazards (GM)', html: function () {
      return '<p>For a lock, ward, trap or collapsing tunnel: <b>Hazard Rating = 10 × Hazard Rank + Difficulty</b>, used as the defender’s bonus. The character needs d20 + bonus ≥ 11 + HR.</p>' +
        tbl(['Difficulty', 'Add', 'Average character, same rank'], [['Easy', '+2', 'about 75%'], ['Standard', '+7', 'about 50%'], ['Hard', '+12', 'about 25%'], ['Extreme', '+15', 'about 10%']]) +
        '<p class="small">One rank above the party is ten points harder: Easy plays like Hard and anything tougher is out of reach. The Reference page has a calculator.</p>';
    } },
    { id: 'build', gm: true, title: 'Building a fight (GM)', html: function () {
      return '<ul><li>Start from an archetype at the party’s rank; set the Step for difficulty.</li><li><b>Minion</b> ×0.5 Health: bring several and roll one initiative for the group.</li>' +
        '<li><b>Standard</b>: one or two per player. <b>Elite</b> ×2 Health: one plus a few minions is a full fight. <b>Solo</b> ×4 Health faces a party of four alone.</li>' +
        '<li>A solo needs more Health, not more damage. A CD 3 and a CD 5 attack meet the damage benchmark.</li><li>Fights that run long usually mean too much Health or the party is missing someone; fights over in a Round or two usually mean a rank gap.</li></ul>' +
        '<p class="small">Creatures from the novels by rank: ' + R.RANKS.map(function (n, i) { return x('rank:' + i, n); }).join(' • ') + '</p>';
    } },
    { id: 'loot', gm: true, title: 'Loot (GM)', html: function () {
      return tbl(['d20', 'Essence or stone rarity'], [['1–10', 'Common'], ['11–15', 'Uncommon'], ['16–18', 'Rare'], ['19', 'Epic'], ['20', 'Roll again: 1–15 Epic, 16–20 Legendary']]) +
        '<p class="small">A monster of the party’s rank or higher should drop something worth having. Outworlders get one extra item from such a fight once per session. Divine stones are never random loot.</p>';
    } }
  ];
  T.refHTML = function (ns) {
    var s = st(ns), gm = ns === 'gm', secs = T.REF.filter(function (r) { return gm || !r.gm; });
    var q = (s.refQ || '').toLowerCase().trim(), cur;
    var tabs = secs.map(function (r) { return '<button class="chip' + (s.refTab === r.id && !q ? ' on' : '') + '" data-act="ttRef" data-ns="' + ns + '" data-id="' + r.id + '">' + esc(r.title.replace(' (GM)', '')) + '</button>'; }).join(' ');
    var body;
    if (q) {
      var hits = secs.filter(function (r) { return (r.title + ' ' + r.html().replace(/<[^>]+>/g, ' ')).toLowerCase().indexOf(q) >= 0; });
      body = hits.length ? hits.map(function (r) { return '<section class="refsec"><h4>' + esc(r.title) + '</h4>' + r.html() + '</section>'; }).join('') : '<p class="quiet small">Nothing in the quick reference mentions that. Try the Codex.</p>';
    } else {
      cur = secs.filter(function (r) { return r.id === s.refTab; })[0] || secs[0];
      body = '<section class="refsec"><h4>' + esc(cur.title) + '</h4>' + cur.html() + '</section>';
    }
    return '<section class="panel quickref"><div class="spread"><h3 style="margin:0">Quick reference</h3><input type="search" data-key="refq-' + ns + '" data-input="ttRefQ" data-ns="' + ns + '" value="' + esc(s.refQ) + '" placeholder="Search the rules" style="width:200px" aria-label="Search the quick reference"></div>' +
      '<div class="row" style="margin:10px 0">' + tabs + '</div>' + body + '</section>';
  };
  A.ttRef = function (el) { var s = st(el.getAttribute('data-ns')); s.refTab = el.getAttribute('data-id'); s.refQ = ''; T.save(); U.render(); };
  A.ttRefQ = function (el) { st(el.getAttribute('data-ns')).refQ = el.value; T.save(); U.render(); };

  // ---------- trackers, clock, notes (GM) ----------
  T.clockText = function (c) { var h = Math.floor(c.min / 60) % 24, m = c.min % 60; return 'Day ' + c.day + ', ' + ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) + ' ' + (h < 5 ? '(night)' : h < 12 ? '(morning)' : h < 17 ? '(afternoon)' : h < 21 ? '(evening)' : '(night)'); };
  T.advanceClock = function (ns, minutes) {
    var c = st(ns).clock; c.min += minutes;
    while (c.min >= 1440) { c.min -= 1440; c.day++; }
    T.logText(ns, 'Time passes (' + (minutes >= 60 ? (minutes / 60) + ' h' : minutes + ' min') + '): ' + T.clockText(c) + '.', 'note');
  };
  T.trackersHTML = function (ns) {
    var s = st(ns);
    var rows = s.trackers.map(function (t, i) {
      var pct = t.max ? Math.min(100, t.val / t.max * 100) : 0;
      return '<div class="tracker"><input type="text" data-key="trk-' + t.id + '" data-input="ttTrkName" data-ns="' + ns + '" data-i="' + i + '" value="' + esc(t.name) + '" aria-label="Tracker name">' +
        '<div class="ttrack"><i style="width:' + pct + '%"></i></div><div class="row" style="flex-wrap:nowrap"><button class="btn sm" data-act="ttTrk" data-ns="' + ns + '" data-i="' + i + '" data-d="-1" aria-label="Lower ' + esc(t.name) + '">−</button>' +
        '<b class="tval">' + t.val + (t.max ? '<small>/' + t.max + '</small>' : '') + '</b><button class="btn sm" data-act="ttTrk" data-ns="' + ns + '" data-i="' + i + '" data-d="1" aria-label="Raise ' + esc(t.name) + '">+</button>' +
        '<input type="number" min="0" max="99" data-key="trkmax-' + t.id + '" data-input="ttTrkMax" data-ns="' + ns + '" data-i="' + i + '" value="' + (t.max || '') + '" placeholder="max" style="width:62px" aria-label="Maximum">' +
        '<button class="btn sm danger" data-act="ttTrkRm" data-ns="' + ns + '" data-i="' + i + '" aria-label="Remove ' + esc(t.name) + '">×</button></div></div>';
    }).join('');
    return '<section class="panel"><div class="spread"><h3 style="margin:0">Trackers</h3><button class="btn sm" data-act="ttTrkAdd" data-ns="' + ns + '">Add a tracker</button></div>' +
      '<p class="small quiet" style="margin:4px 0 10px">Countdowns and clocks: alarms, surges, rituals, reputation. Changes go to the table log.</p>' + (rows || '<p class="small quiet">No trackers.</p>') + '</section>';
  };
  A.ttTrk = function (el) {
    var ns = el.getAttribute('data-ns'), t = st(ns).trackers[+el.getAttribute('data-i')]; if (!t) return;
    t.val = Math.max(0, t.val + (+el.getAttribute('data-d')));
    if (t.max && t.val >= t.max) { t.val = t.max; T.logText(ns, t.name + ' is full (' + t.val + '/' + t.max + ').', 'warn'); U.toast(t.name + ' is full.'); }
    else T.logText(ns, t.name + ': ' + t.val + (t.max ? '/' + t.max : '') + '.');
    U.render();
  };
  A.ttTrkName = function (el) { var t = st(el.getAttribute('data-ns')).trackers[+el.getAttribute('data-i')]; if (t) { t.name = el.value; T.save(); } };
  A.ttTrkMax = function (el) { var t = st(el.getAttribute('data-ns')).trackers[+el.getAttribute('data-i')]; if (t) { t.max = Math.max(0, parseInt(el.value, 10) || 0); T.save(); U.render(); } };
  A.ttTrkRm = function (el) { st(el.getAttribute('data-ns')).trackers.splice(+el.getAttribute('data-i'), 1); T.save(); U.render(); };
  A.ttTrkAdd = function (el) { var s = st(el.getAttribute('data-ns')); s.trackers.push({ id: 't' + Date.now().toString(36), name: 'New tracker', val: 0, max: 6 }); T.save(); U.render(); };

  T.clockHTML = function (ns) {
    var c = st(ns).clock;
    function b(m, l) { return '<button class="btn sm" data-act="ttClock" data-ns="' + ns + '" data-m="' + m + '">' + l + '</button>'; }
    return '<section class="panel"><h3 style="margin:0 0 6px">In-world time</h3><p class="tclock">' + esc(T.clockText(c)) + '</p>' +
      '<div class="row">' + b(1, '+1 min') + b(10, '+10 min') + b(60, '+1 hour') + b(480, '+8 hours') + '<button class="btn sm" data-act="ttMorning" data-ns="' + ns + '">Next morning</button></div>' +
      '<p class="small quiet" style="margin:8px 0 0">A Round is 6 seconds. An hour of rest fills every pool and clears Death Marks.</p></section>';
  };
  A.ttClock = function (el) { T.advanceClock(el.getAttribute('data-ns'), +el.getAttribute('data-m')); U.render(); };
  A.ttMorning = function (el) {
    var ns = el.getAttribute('data-ns'), c = st(ns).clock, to = 7 * 60, add = (c.min < to ? to - c.min : 1440 - c.min + to);
    T.advanceClock(ns, add); U.render();
  };
  T.notesHTML = function (ns, title) {
    return '<section class="panel"><h3 style="margin:0 0 8px">' + esc(title || 'Session notes') + '</h3><textarea data-key="ttnotes-' + ns + '" data-input="ttNotes" data-ns="' + ns + '" placeholder="Names, clues, promises, who owes whom. Saved in this browser." style="min-height:160px">' + esc(st(ns).notes) + '</textarea></section>';
  };
  A.ttNotes = function (el) { st(el.getAttribute('data-ns')).notes = el.value; T.save(); };

  T.load();
})(window.EA = window.EA || {});
