/* Essence & Ascension — Character Forge
 * ui-forge.js: home screen, the five-step builder, and the status window.
 */
(function (EA) {
  'use strict';
  var U = EA.ui, R = EA.rules, A = EA.abilities, D = EA.data, St = EA.store;
  var esc = U.esc;

  var STEPS = [
    { t: 'Heritage', s: 'Who you are' },
    { t: 'Stats', s: 'Power, Speed, Spirit, Recovery' },
    { t: 'Essences', s: 'Three, and what they make' },
    { t: 'Abilities', s: 'Your twenty-slot grid' },
    { t: 'Rank & finish', s: 'Step, scale, checks' }
  ];
  var ARCHETYPES = [
    ['Heavy fighter', { Power: 18, Speed: 12, Spirit: 8, Recovery: 14 }],
    ['Caster', { Power: 8, Speed: 12, Spirit: 20, Recovery: 12 }],
    ['Skirmisher', { Power: 12, Speed: 20, Spirit: 8, Recovery: 12 }],
    ['All-rounder', { Power: 13, Speed: 13, Spirit: 13, Recovery: 13 }]
  ];

  U.sheet = function (fx) { var c = St.char(); return c ? R.computeSheet(c, fx) : null; };

  // ======================= HOME =======================
  U.views.home = function () {
    var list = St.list();
    var starters = EA.library.starters.map(function (s, i) {
      return '<button class="starter" data-act="newStarter" data-i="' + i + '"><b>' + esc(s.name) + '</b>' +
        '<span class="ess">' + s.essences.join(' • ') + '</span><p>' + esc(s.concept) + '</p></button>';
    }).join('');
    var roster = list.length ? '<div class="panel"><h3>Your adventurers</h3><div class="roster">' + list.map(function (c) {
      var S = R.computeSheet(c);
      return '<div class="item"><span class="badge m-' + R.RANKS[c.rank] + '" aria-hidden="true">' + R.RANKS[c.rank][0] + '</span>' +
        '<div class="grow"><b>' + esc(c.name || 'Unnamed adventurer') + '</b><div class="quiet small">' + esc(S.rankName) + ' • ' +
        (c.essences.filter(Boolean).join(', ') || 'no essences yet') + '</div></div>' +
        '<button class="btn sm" data-act="open" data-id="' + c.id + '" data-to="forge">Edit</button>' +
        '<button class="btn sm primary" data-act="open" data-id="' + c.id + '" data-to="play">Play</button>' +
        '<button class="btn sm" data-act="dup" data-id="' + c.id + '" aria-label="Duplicate ' + esc(c.name) + '">Copy</button>' +
        '<button class="btn sm danger" data-act="del" data-id="' + c.id + '" aria-label="Delete ' + esc(c.name) + '">Delete</button></div>';
    }).join('') + '</div></div>' : '';
    return topbar() + '<main class="wrap">' +
      '<section class="hero"><div><h1>Essence <span class="amp">&amp;</span> Ascension</h1>' +
      '<p>Pick a heritage, spend your stats, bond three essences and wake their powers. The forge works out every bonus, pool and regeneration value, then hands you a finished sheet to play from or print.</p>' +
      '<div class="row"><button class="btn primary" data-act="newBlank">Forge a new adventurer</button>' +
      '<label class="btn" for="importFile">' + U.icon('upload') + ' Import a character</label>' +
      '<input id="importFile" type="file" accept=".json,application/json" class="sr" data-input="importFile"></div>' +
      (St.storageBroken ? '<p class="small" style="color:var(--warn)">This browser is blocking storage, so characters last only until you close the page. Export to keep them.</p>' : '') +
      '</div><div class="sigil-wrap">' + EA.sigil(['Fire', 'Shield', 'Swift'], { name: 'Mosaic' }, { progress: 13 }) + '</div></section>' +
      roster +
      '<div class="panel"><h3>Or start from a ready-made adventurer</h3><p class="lede">The four starters from the Adventurer’s Handbook, built at Iron 0. Change anything you like.</p><div class="starters">' + starters + '</div></div>' +
      '</main>';
  };

  // ======================= TOP BAR =======================
  function topbar() {
    var c = St.char(), r = U.state.route;
    function m(id, label) { return '<button data-act="go" data-to="' + id + '"' + (r === id ? ' aria-current="page"' : '') + (c || id === 'home' ? '' : ' disabled') + '>' + label + '</button>'; }
    return '<header class="topbar"><a class="brand" href="index.html" title="Back to the table tools">' + EA.mark() + '<span><b>Essence &amp; Ascension</b><small>Character Forge</small></span></a>' +
      '<nav class="modes" aria-label="Mode">' + m('home', 'Roster') + m('forge', 'Forge') + m('play', 'Play') + m('sheet', 'Sheet') + '</nav>' +
      (c ? '<div class="who"><button class="iconbtn" data-act="exportOpen" title="Save or share this character" aria-label="Save or share this character">' + U.icon('save') + '</button>' +
        '<button class="iconbtn" data-act="go" data-to="sheet" title="Print or save as PDF" aria-label="Print or save as PDF">' + U.icon('print') + '</button></div>' : '') +
      '</header>';
  }
  U.topbar = topbar;

  // ======================= FORGE =======================
  U.views.forge = function () {
    var c = St.char(); if (!c) return U.views.home();
    var S = R.computeSheet(c);
    var step = U.state.step || 0;
    var rail = '<nav class="steps panel" aria-label="Build steps"><ol>' + STEPS.map(function (s, i) {
      return '<li><button data-act="step" data-i="' + i + '"' + (i === step ? ' aria-current="step"' : '') + (stepDone(c, S, i) && i !== step ? ' class="done"' : '') + '><span><span class="t">' + s.t + '</span><span class="s">' + s.s + '</span></span></button></li>';
    }).join('') + '</ol></nav>';
    var body = [stepHeritage, stepStats, stepEssences, stepAbilities, stepFinish][step](c, S);
    var nav = '<div class="spread" style="margin-top:18px">' + (step > 0 ? '<button class="btn" data-act="step" data-i="' + (step - 1) + '">Back: ' + STEPS[step - 1].t + '</button>' : '<span></span>') +
      (step < 4 ? '<button class="btn primary" data-act="step" data-i="' + (step + 1) + '">Next: ' + STEPS[step + 1].t + '</button>' : '<button class="btn primary" data-act="go" data-to="play">Start playing</button>') + '</div>';
    return topbar() + '<main class="wrap"><div class="forge-grid">' + rail + '<div>' + body + nav + '</div>' + statusWindow(c, S) + '</div></main>';
  };

  function stepDone(c, S, i) {
    if (i === 0) return !!c.name;
    if (i === 1) return S.spent === S.budget && R.validateStats(c).length === 0;
    if (i === 2) return c.essences.filter(Boolean).length === 3;
    if (i === 3) return ['E1-1', 'E2-1', 'E3-1', 'C-1'].every(function (s) { return c.abilities[s]; });
    return false;
  }

  // ---------- step 1: heritage ----------
  function stepHeritage(c) {
    function choice(val, title, pts, list) {
      return '<label class="choice' + (c.heritage === val ? ' sel' : '') + '"><input type="radio" name="her" value="' + val + '" data-bind="heritage"' + (c.heritage === val ? ' checked' : '') + '>' +
        '<h4>' + title + '</h4><div class="quiet">' + pts + ' stat points</div>' + (list ? '<ul>' + list + '</ul>' : '<ul><li>No special traits. Two more stat points to spend.</li></ul>') + '</label>';
    }
    var ow = '<li><b>Spoils of the Fallen:</b> once per session, an extra essence, stone or core after beating a worthy monster.</li>' +
      '<li><b>Anomalous Soul:</b> you can steer every awakening one step further.</li>' +
      '<li><b>Foreign Mind:</b> +2 edge to resist mind-reading, charm and control.</li>' +
      '<li><b>Outsider:</b> −2 on local customs, lore and reading people, until Bronze.</li>';
    return '<section class="panel"><h2>Who walks into the Adventure Society?</h2>' +
      '<p class="lede">Name your adventurer and choose where they come from. Most are natives of the world; a few are outworlders whose souls never quite fit the local magic.</p>' +
      '<div class="grid2"><label class="f"><span>Character name</span><input type="text" data-bind="name" value="' + esc(c.name) + '" placeholder="Name your adventurer" autocomplete="off"></label>' +
      '<label class="f"><span>Player</span><input type="text" data-bind="player" value="' + esc(c.player) + '" autocomplete="off"></label></div>' +
      '<label class="f"><span>Concept, in a sentence</span><input type="text" data-bind="concept" value="' + esc(c.concept) + '" placeholder="A bounty hunter who never misses twice"></label>' +
      '<div class="grid2">' + choice('native', 'Native', 54, '') + choice('outworlder', 'Outworlder', 52, ow) + '</div></section>';
  }

  // ---------- step 2: stats ----------
  function stepStats(c, S) {
    var left = S.budget - S.spent;
    var pct = Math.min(100, S.spent / S.budget * 100);
    var cards = R.STATS.map(function (k) {
      var st = S.stat[k], v = c.stats[k];
      var extra = c.rawBonus[k] ? ' <span class="chip on" title="Raised by rewards">+' + c.rawBonus[k] + ' reward</span>' : '';
      return '<div class="statcard"><div class="head"><h4>' + k + '</h4>' + extra + '</div><div class="hint">' + R.STAT_HINT[k] + '</div>' +
        '<div class="stepper"><button data-act="stat" data-k="' + k + '" data-d="-1" aria-label="Lower ' + k + '"' + (v <= R.CREATION.min ? ' disabled' : '') + '>−</button>' +
        '<output aria-live="polite">' + st.raw + '</output><button data-act="stat" data-k="' + k + '" data-d="1" aria-label="Raise ' + k + '"' + (v >= R.CREATION.max || left <= 0 ? ' disabled' : '') + '>+</button></div>' +
        '<div class="bon">Stat bonus ' + R.sign(st.sm) + '</div></div>';
    }).join('');
    var arche = ARCHETYPES.map(function (a, i) { return '<button class="btn sm" data-act="arche" data-i="' + i + '">' + a[0] + '</button>'; }).join(' ');
    var issues = R.validateStats(c).filter(function (x) { return !/left to spend/.test(x); });
    return '<section class="panel"><h2>Spend your stats</h2>' +
      '<p class="lede">Every stat starts between 6 and 20. Doubling a stat adds +5 to its bonus, so the first points are worth the most.</p>' +
      '<div class="budget" style="margin-bottom:16px"><div><div class="quiet small">Points left</div><b' + (left < 0 ? ' style="color:var(--bad)"' : '') + '>' + left + '</b></div>' +
      '<div class="meter' + (left < 0 ? ' over' : '') + '"><i style="width:' + pct + '%"></i></div><div class="quiet small">' + S.spent + ' of ' + S.budget + '</div></div>' +
      '<div class="grid4">' + cards + '</div>' +
      (issues.length ? '<ul class="issues">' + issues.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      '<hr class="rule"><div class="row"><span class="quiet small">Starting spreads:</span>' + arche + '</div>' +
      (c.heritage === 'native' ? '<p class="quiet small">Spreads use 52 points; natives then have 2 more to place anywhere.</p>' : '') +
      '<details class="hood"><summary>Rewards beyond creation</summary><p class="small quiet">Rare rewards can raise a stat after creation, up to 30. Record them here so the creation budget stays honest.</p><div class="grid4">' +
      R.STATS.map(function (k) { return '<label class="f"><span>' + k + '</span><input type="number" min="0" max="24" data-type="int" data-bind="rawBonus.' + k + '" value="' + (c.rawBonus[k] || 0) + '"></label>'; }).join('') +
      '</div></details>' +
      '<hr class="rule"><h3>What those numbers give you</h3>' + derivedTable(S) + '</section>';
  }

  function derivedTable(S) {
    var p = S.pool;
    return '<div class="grid2"><dl class="kv">' +
      '<dt>Health</dt><dd><b>' + R.fmt(p.HP.dMax) + '</b> <span class="quiet">regain ' + p.HP.dReg + '</span></dd>' +
      '<dt>Mana</dt><dd><b>' + R.fmt(p.MP.dMax) + '</b> <span class="quiet">regain ' + p.MP.dReg + '</span></dd>' +
      '<dt>Stamina</dt><dd><b>' + R.fmt(p.SP.dMax) + '</b> <span class="quiet">regain ' + p.SP.dReg + '</span></dd>' +
      '<dt>Initiative</dt><dd>d20 ' + R.sign(S.init) + '</dd></dl><dl class="kv">' +
      '<dt>Defense vs strikes</dt><dd>' + R.sign(S.def.strike) + ' <span class="quiet">' + S.def.strikeName + '</span></dd>' +
      '<dt>Defense vs spells</dt><dd>' + R.sign(S.def.spell) + ' <span class="quiet">' + S.def.spellName + '</span></dd>' +
      '<dt>Defense vs areas</dt><dd>' + R.sign(S.def.area) + ' <span class="quiet">Dodge</span></dd>' +
      '<dt>Move</dt><dd>' + S.move + ' m per Move</dd></dl></div>' +
      '<details class="hood"><summary>Under the hood</summary><div class="mono">' +
      'Rank multiplier M = 4^(' + S.r + ' + ' + S.rs + '/10) = ' + S.M.toFixed(3) + '\n' +
      R.STATS.map(function (k) { var s = S.stat[k]; return k + ': raw ' + s.raw + ', stat bonus ' + R.sign(s.sm) + ', rank bonus +' + s.rankMod + ', effective ' + R.fmt(s.E); }).join('\n') + '\n' +
      'Health = (5 × E_Power + 20 × M) × ' + (1 + 0.1 * S.r).toFixed(1) + (S.passives.hpmax ? ' × ' + (1 + S.passives.hpmax).toFixed(2) : '') + ' = ' + R.fmt(p.HP.max) + '\n' +
      'Mana = 6 × E_Spirit + 10 × M' + (S.passives.mpmax ? ', × ' + (1 + S.passives.mpmax).toFixed(2) : '') + ' = ' + R.fmt(p.MP.max) + '\n' +
      'Stamina = 5 × E_Speed + 10 × M' + (S.passives.spmax ? ', × ' + (1 + S.passives.spmax).toFixed(2) : '') + ' = ' + R.fmt(p.SP.max) + '\n' +
      'Regain per Upkeep: the smaller of Recovery × ¼ / ½ / ½ and 6% / 8% / 10% of the maximum = ' + p.HP.reg + ' / ' + p.MP.reg + ' / ' + p.SP.reg +
      (S.B > 1 ? '\nTable scale: every value shown ÷ ' + R.fmt(S.B) : '') + '</div></details>';
  }

  // ---------- step 3: essences ----------
  function stepEssences(c, S) {
    var active = U.state.essSlot == null ? c.essences.indexOf('') : U.state.essSlot;
    if (active < 0) active = -1;
    var gm = c.options.gmView;
    var slots = [0, 1, 2].map(function (i) {
      var n = c.essences[i], e = n && D.essenceByName[n];
      return '<button class="ess-slot' + (n ? ' filled' : '') + (i === active ? ' active' : '') + '" data-act="essSlot" data-i="' + i + '" style="' + (n ? 'border-color:' + U.essColor(n) : '') + '">' +
        '<span class="lbl">Essence ' + (i + 1) + (i === active ? ' • choosing' : '') + '</span>' +
        (n ? '<b>' + esc(n) + '</b><span class="quiet small">' + e.rarity + '</span>' : '<b class="faint">Empty</b><span class="quiet small">Pick from the list</span>') + '</button>';
    }).join('');
    var q = (U.state.essQuery || '').toLowerCase(), rf = U.state.essRarity || '';
    var opts = D.essences.filter(function (e) {
      return (!q || e.name.toLowerCase().indexOf(q) >= 0 || e.theme.toLowerCase().indexOf(q) >= 0) && (!rf || e.rarity === rf);
    }).map(function (e) {
      var picked = c.essences.indexOf(e.name) >= 0;
      return '<button class="ess-opt' + (picked ? ' picked' : '') + '" data-act="pickEss" data-n="' + esc(e.name) + '"' + (picked ? ' aria-pressed="true"' : '') + '>' +
        '<span class="fam" style="background:' + U.FAMILY_COLOR[e.family] + '"></span><b>' + esc(e.name) + '</b><span class="rar">' + e.rarity + '</span>' +
        '<span class="th">' + esc(e.theme) + (gm ? ' • ' + e.family : '') + '</span></button>';
    }).join('');
    var rarities = ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Unknown'];
    var filter = '<div class="row" style="margin-bottom:10px"><input type="search" data-key="essq" data-input="essQuery" value="' + esc(U.state.essQuery || '') + '" placeholder="Search 147 essences by name or theme" style="flex:1;min-width:200px">' +
      '<select data-key="essr" data-input="essRarity" style="width:auto">' + rarities.map(function (r) { return '<option value="' + r + '"' + (r === rf ? ' selected' : '') + '>' + (r || 'Any rarity') + '</option>'; }).join('') + '</select></div>';
    return '<section class="panel"><h2>Bond three essences</h2>' +
      '<p class="lede">Choose for theme first: everything you ever awaken grows from these three. Rarity is how hard an essence is to find, not how strong it is. Your GM decides which you can get.</p>' +
      '<div class="ess-slots">' + slots + '</div>' + filter +
      '<div class="ess-list" data-scroll="esslist">' + (opts || '<p class="quiet">No essence matches that search.</p>') + '</div>' +
      '<p class="small quiet" style="margin-top:10px">' + U.dot('unverified') + 'Every essence on this list comes from the novels; most details are unconfirmed. Colors mark the essence’s family.</p></section>' +
      confluencePanel(c, S);
  }

  function confluencePanel(c, S) {
    var cf = S.confluence;
    if (!cf) return '<section class="panel"><h3>Your confluence</h3><p class="quiet">When your third essence bonds, a fourth forms on its own. Choose three essences to see it.</p></section>';
    var revealed = c.confluence.revealed || c.options.gmView;
    var head = '<div class="confluence"><div>' + EA.sigil(c.essences, revealed ? cf : null, { small: true, sealed: !revealed, condense: U.state.condense }) + '</div><div>';
    var body;
    if (!revealed) {
      body = '<div class="sealed"><h3 style="color:var(--gold-soft)">A confluence has formed</h3><p style="margin:0 0 12px">In play your GM tells you what it is. Reveal it now if your table builds in the open, or enter what your GM told you.</p>' +
        '<div class="row"><button class="btn gold" data-act="revealConf">Reveal my confluence</button></div></div>';
    } else {
      body = '<p class="quiet small" style="margin:0">Your confluence</p><p class="cname">' + U.dot(cf.tag) + esc(cf.name) + '</p>' +
        '<p style="margin:0 0 8px">' + esc(cf.theme) + '</p>' +
        (cf.restricted ? '<p class="chip bad">Restricted by the Adventure Society: expect a kill contract if you are found out</p>' : '') +
        (c.options.gmView ? '<p class="small quiet">' + esc(cf.source) + (cf.step ? ': ' + esc(cf.step) : '') + ' Trio key: ' + esc(cf.key) + (cf.usual && cf.usual.alt ? '. The records also list ' + esc(cf.usual.alt) + ' for this trio.' : '') + '</p>' : '') +
        (cf.note ? '<p class="small">' + esc(cf.note) + '</p>' : '');
    }
    var shift = '';
    if (cf.shifting) {
      var roll = c.confluence.shiftRoll;
      shift = '<hr class="rule"><h3>Shifting confluence</h3><p class="small quiet">' + (S.outworlder ? 'Outworlder souls always roll' : 'Your table uses the shifting rule') + ': 1–15 the usual result, 16–19 the family confluence, 20 your choice of any known confluence that lists one of your essences.</p>' +
        '<div class="row">' + (roll ? '<span class="chip on">Rolled ' + roll + '</span>' : '') + '<button class="btn sm" data-act="shiftRoll">' + U.icon('d20') + (roll ? ' Roll again' : ' Roll the d20') + '</button>' +
        (roll === 20 ? '<select data-bind="confluence.choice" style="width:auto"><option value="">Choose a confluence</option>' + R.shiftChoices(c.essences).map(function (n) { return '<option' + (c.confluence.choice === n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select>' : '') + '</div>';
    }
    var override = '<details class="hood"' + (c.confluence.override ? ' open' : '') + '><summary>Your GM named a different confluence</summary><label class="f" style="margin-top:6px"><span>Confluence name</span><input type="text" data-bind="confluence.override" value="' + esc(c.confluence.override) + '" placeholder="Leave empty to use the rules"></label></details>';
    return '<section class="panel"><h3>Your confluence</h3>' + head + body + '</div></div>' + shift + override + '</section>';
  }

  // ---------- step 4: abilities ----------
  function stepAbilities(c, S) {
    var cols = ['E1', 'E2', 'E3', 'C'];
    var cf = S.confluence;
    var names = [c.essences[0], c.essences[1], c.essences[2], cf && (c.confluence.revealed || c.options.gmView) ? cf.name : (cf ? 'Confluence' : '')];
    var html = cols.map(function (col, ci) {
      var n = names[ci], colr = ci < 3 ? (n ? U.essColor(n) : 'var(--faint)') : 'var(--gold)';
      var head = '<div class="colhead" style="--c:' + colr + '"><b>' + esc(n || (ci < 3 ? 'Essence ' + (ci + 1) : 'Confluence')) + '</b><span>' + (ci < 3 ? 'Essence ' + (ci + 1) : 'Confluence') + '</span></div>';
      var cells = [1, 2, 3, 4, 5].map(function (row) {
        var slot = col + '-' + row, ab = c.abilities[slot];
        var locked = row > S.rowsOpen, noEss = !n;
        if (ab) {
          var res = A.compute(ab, S);
          return '<button class="acell' + (row === 1 ? ' innate' : '') + '" style="--c:' + colr + '" data-act="editAb" data-slot="' + slot + '">' +
            (res.issues.length ? '<span class="warn" title="' + esc(res.issues.join(' ')) + '">▲</span>' : '') +
            '<span class="slot">' + slot + (row === 1 ? ' • innate' : '') + '</span><b>' + esc(ab.name || 'Unnamed ability') + '</b>' +
            '<span class="meta">' + esc(ab.type) + ' • ' + esc(res.costText) + ' • ' + esc(res.cdText) + '</span>' +
            '<span class="eff">' + esc(trim(A.finalText(ab, res, S), 110)) + '</span></button>';
        }
        if (locked) return '<div class="acell locked"><span class="slot">' + slot + '</span><span class="small">Opens at ' + R.ROW_GATE[row - 1] + '</span></div>';
        if (noEss) return '<div class="acell locked"><span class="slot">' + slot + '</span><span class="small">Bond this essence first</span></div>';
        return '<button class="acell empty" data-act="editAb" data-slot="' + slot + '"><span class="slot">' + slot + '</span>' +
          (row === 1 ? '<span>Wakes when the essence bonds</span><span class="small">Add its innate ability</span>' : '<span>Awaken with a stone</span><span class="small">Open slot</span>') + '</button>';
      }).join('');
      return '<div>' + head + '<div style="display:grid;gap:8px;margin-top:8px">' + cells + '</div></div>';
    }).join('');
    return '<section class="panel"><h2>Wake your abilities</h2>' +
      '<p class="lede">Each essence holds five abilities. Row 1 wakes for free; later rows open as you climb Iron and each needs an awakening stone. Tap a slot to build its card. Every number is worked out for you.</p>' +
      '<div class="agrid">' + html + '</div>' +
      '<hr class="rule"><div class="spread"><div class="small quiet">' + countAb(c) + ' of ' + (S.rowsOpen * 4) + ' open slots awakened. ' + (S.rowsOpen < 5 ? 'Next row opens at ' + R.ROW_GATE[S.rowsOpen] + '.' : 'All rows are open.') + '</div>' +
      '<label class="small"><input type="checkbox" data-bind="options.canonPace"' + (c.options.canonPace ? ' checked' : '') + '> Canon pace (no row gates)</label></div></section>';
  }
  function trim(s, n) { return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }
  function countAb(c) { return Object.keys(c.abilities).filter(function (k) { return c.abilities[k]; }).length; }

  // ---------- step 5: rank & finish ----------
  function stepFinish(c, S) {
    var rankSel = '<select data-type="int" data-bind="rank" style="width:auto">' + R.RANKS.map(function (n, i) { return '<option value="' + i + '"' + (i === c.rank ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>';
    var rsSel = '<select data-type="int" data-bind="rs" style="width:auto">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (i) { return '<option value="' + i + '"' + (i === c.rs ? ' selected' : '') + '>Step ' + i + '</option>'; }).join('') + '</select>';
    var partySel = '<select data-type="intnull" data-bind="options.partyRank" style="width:auto"><option value=""' + (c.options.partyRank == null ? ' selected' : '') + '>Same as my rank</option>' +
      R.RANKS.map(function (n, i) { return '<option value="' + i + '"' + (c.options.partyRank === i ? ' selected' : '') + '>' + n + ' party</option>'; }).join('') + '</select>';
    var checks = [];
    var sv = R.validateStats(c);
    checks.push([sv.length === 0, sv.length ? sv.join(' ') : 'Stats spent: ' + S.spent + ' of ' + S.budget + '.']);
    var ne = c.essences.filter(Boolean).length;
    checks.push([ne === 3, ne === 3 ? 'Three essences bonded; confluence ' + (S.confluence && (c.confluence.revealed || c.options.gmView) ? S.confluence.name : 'sealed') + '.' : (3 - ne) + ' essence' + (ne === 2 ? '' : 's') + ' still to choose.']);
    var innate = ['E1-1', 'E2-1', 'E3-1', 'C-1'].filter(function (s) { return !c.abilities[s]; });
    checks.push([innate.length === 0, innate.length ? 'Innate abilities missing in ' + innate.join(', ') + '.' : 'All four innate abilities are on the sheet.']);
    var bad = A.list(c).map(function (x) { return { s: x.slot, r: A.compute(x.ab, S) }; }).filter(function (x) { return x.r.issues.length; });
    checks.push([bad.length === 0, bad.length ? bad.map(function (x) { return x.s + ': ' + x.r.issues[0]; }).join(' ') : 'Every ability card balances its power budget.']);
    var over = A.list(c).filter(function (x) { return +x.slot.slice(-1) > S.rowsOpen; });
    if (over.length) checks.push([false, over.length + ' abilities sit in rows that are not open at ' + S.rankName + '.']);
    return '<section class="panel"><h2>Rank, scale and final checks</h2>' +
      '<p class="lede">New adventurers start at Iron, Step 0. Set a higher rank to build a veteran or to see how this character grows: every pool and ability updates.</p>' +
      '<div class="row" style="margin-bottom:12px"><span class="badge m-' + R.RANKS[c.rank] + '" aria-hidden="true">' + R.RANKS[c.rank][0] + '</span>' + rankSel + rsSel +
      '<span class="quiet small">Rank bonus +' + S.P + ', multiplier ×' + S.M.toFixed(3) + '</span></div>' +
      '<div class="grid2"><div><h3>Table scale</h3><p class="small quiet">Numbers explode by ×4 each rank, so the books print everything divided by the party’s rank. Leave this on unless your GM uses full numbers.</p>' +
      '<label class="small"><input type="checkbox" data-bind="options.tableScale"' + (c.options.tableScale !== false ? ' checked' : '') + '> Show numbers at table scale</label><div style="margin-top:8px">' + partySel + '</div></div>' +
      '<div><h3>Weapon and table options</h3><label class="f"><span>Basic Attack uses</span><select data-bind="basicStat"><option' + (c.basicStat === 'Power' ? ' selected' : '') + '>Power</option><option' + (c.basicStat === 'Speed' ? ' selected' : '') + '>Speed</option></select></label>' +
      '<label class="small"><input type="checkbox" data-bind="options.shifting"' + (c.options.shifting ? ' checked' : '') + '> Shifting confluences at our table</label><br>' +
      '<label class="small"><input type="checkbox" data-bind="options.gmView"' + (c.options.gmView ? ' checked' : '') + '> GM view: show families, confluence sources and the Blood chart</label></div></div>' +
      '<hr class="rule"><h3>Checks</h3><ul style="list-style:none;padding:0;margin:0">' + checks.map(function (x) {
        return '<li style="margin:6px 0"><span style="color:' + (x[0] ? 'var(--ok)' : 'var(--warn)') + '">' + (x[0] ? '✓' : '▲') + '</span> ' + esc(x[1]) + '</li>';
      }).join('') + '</ul>' +
      '<hr class="rule"><label class="f"><span>Notes, gear and contracts</span><textarea data-bind="notes" placeholder="Monster cores, coins, spirit coins, contracts, people you owe">' + esc(c.notes) + '</textarea></label>' +
      '<div class="row"><button class="btn" data-act="go" data-to="sheet">' + U.icon('print') + ' Print or save as PDF</button><button class="btn" data-act="exportOpen">' + U.icon('save') + ' Save a copy</button></div></section>';
  }

  // ======================= STATUS WINDOW =======================
  function statusWindow(c, S) {
    var p = S.pool;
    var stats = R.STATS.map(function (k) { return '<div><b>' + R.sign(S.stat[k].cm) + '</b><span>' + k + ' ' + S.stat[k].raw + '</span></div>'; }).join('');
    function pool(k) {
      return '<div class="pool"><div class="top"><span>' + p[k].label + '</span><span><b>' + R.fmt(p[k].dMax) + '</b> <span class="reg">+' + p[k].dReg + ' / Upkeep</span></span></div><div class="bar ' + k + '"><i class="v" style="width:100%"></i></div></div>';
    }
    var cf = S.confluence;
    return '<aside class="status panel" aria-label="Character summary"><div class="row" style="flex-wrap:nowrap"><span class="badge m-' + R.RANKS[c.rank] + '" aria-hidden="true">' + R.RANKS[c.rank][0] + '</span>' +
      '<div style="min-width:0"><p class="name">' + esc(c.name || 'Unnamed adventurer') + '</p><div class="sub">' + esc(S.rankName) + ' • ' + (c.heritage === 'outworlder' ? 'Outworlder' : 'Native') + '</div></div></div>' +
      '<div style="max-width:250px;margin:6px auto 0">' + EA.sigil(c.essences, (c.confluence.revealed || c.options.gmView) ? cf : null, { sealed: !(c.confluence.revealed || c.options.gmView), progress: S.P }) + '</div>' +
      '<div class="statline">' + stats + '</div>' + pool('HP') + pool('MP') + pool('SP') +
      '<dl class="kv" style="margin-top:12px"><dt>Strikes / spells / areas</dt><dd>' + R.sign(S.def.strike) + ' / ' + R.sign(S.def.spell) + ' / ' + R.sign(S.def.area) + '</dd>' +
      '<dt>Initiative</dt><dd>d20 ' + R.sign(S.init) + '</dd><dt>Move</dt><dd>' + S.move + ' m</dd>' +
      (S.tickEngine ? '<dt>Ready again after a Major</dt><dd>' + S.majorRecovery + ' Ticks</dd>' : '<dt>Action Points</dt><dd>3 per turn</dd>') +
      (S.aura.available ? '<dt>Aura output / defense</dt><dd>' + R.sign(S.aura.AO) + ' / ' + R.sign(S.aura.AD) + '</dd>' : '') +
      '<dt>Abilities</dt><dd>' + countAb(c) + ' / ' + S.rowsOpen * 4 + '</dd></dl>' +
      (S.B > 1 ? '<p class="small faint" style="margin:10px 0 0">Shown at ' + R.RANKS[S.tableRank] + ' table scale (÷' + R.fmt(S.B) + ').</p>' : '') +
      '</aside>';
  }
  U.statusWindow = statusWindow;
  U.derivedTable = derivedTable;

  // ======================= ACTIONS =======================
  var act = U.actions;
  act.go = function (el) {
    var to = el.getAttribute('data-to');
    if (to !== 'home' && !St.char()) return;
    U.state.route = to;
    try { history.replaceState(null, '', '#' + to); } catch (e) { location.hash = to; }
    window.scrollTo(0, 0); U.render();
  };
  act.step = function (el) { U.state.step = +el.getAttribute('data-i'); window.scrollTo(0, 0); U.render(); };
  act.newBlank = function () { St.add(St.newCharacter()); U.state.step = 0; act.go({ getAttribute: function () { return 'forge'; } }); };
  act.newStarter = function (el) { St.add(St.fromStarter(+el.getAttribute('data-i'))); U.state.step = 4; act.go({ getAttribute: function () { return 'forge'; } }); };
  act.open = function (el) { St.select(el.getAttribute('data-id')); U.state.step = 0; act.go({ getAttribute: function () { return el.getAttribute('data-to'); } }); };
  act.dup = function (el) { St.duplicate(el.getAttribute('data-id')); U.render(); };
  act.del = function (el) {
    var id = el.getAttribute('data-id'), c = St.roster[id];
    U.openModal(function () {
      return '<div class="modal" style="width:min(460px,100%)"><div class="panel"><h2>Delete ' + esc(c.name || 'this adventurer') + '?</h2><p>This removes the character from this browser. Export it first if you want a copy.</p>' +
        '<div class="row"><button class="btn danger" data-act="delYes" data-id="' + id + '">Delete</button><button class="btn" data-act="closeModal">Keep</button></div></div></div>';
    });
  };
  act.delYes = function (el) { St.remove(el.getAttribute('data-id')); U.closeModal(); };
  act.closeModal = function () { U.closeModal(); };
  act.stat = function (el) {
    var c = St.char(), k = el.getAttribute('data-k'), d = +el.getAttribute('data-d');
    var v = c.stats[k] + d;
    if (v < R.CREATION.min || v > R.CREATION.max) return;
    c.stats[k] = v; St.touch(); U.render();
  };
  act.arche = function (el) {
    var c = St.char(), a = ARCHETYPES[+el.getAttribute('data-i')][1];
    c.stats = Object.assign({}, a); St.touch(); U.render();
  };
  act.essSlot = function (el) { U.state.essSlot = +el.getAttribute('data-i'); U.render(); };
  act.essQuery = function (el) { U.state.essQuery = el.value; U.render(); };
  act.essRarity = function (el) { U.state.essRarity = el.value; U.render(); };
  act.pickEss = function (el) {
    var c = St.char(), n = el.getAttribute('data-n');
    var had = c.essences.filter(Boolean).length;
    var at = c.essences.indexOf(n);
    if (at >= 0) { c.essences[at] = ''; U.state.essSlot = at; }
    else {
      var slot = U.state.essSlot != null ? U.state.essSlot : c.essences.indexOf('');
      if (slot < 0) { U.toast('All three essences are chosen. Tap a slot to replace one.'); return; }
      c.essences[slot] = n;
      var nextEmpty = c.essences.indexOf('');
      U.state.essSlot = nextEmpty >= 0 ? nextEmpty : null;
    }
    c.confluence.shiftRoll = null; c.confluence.choice = '';
    if (had < 3 && c.essences.filter(Boolean).length === 3) {
      U.state.condense = true;
      setTimeout(function () { U.state.condense = false; }, 1500);
    }
    St.touch(); U.render();
  };
  act.revealConf = function () { var c = St.char(); c.confluence.revealed = true; U.state.condense = true; setTimeout(function () { U.state.condense = false; }, 1500); St.touch(); U.render(); };
  act.shiftRoll = function () { var c = St.char(); c.confluence.shiftRoll = U.d20(); c.confluence.revealed = true; St.touch(); U.render(); };

  act.importFile = function (el) {
    var f = el.files && el.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try { St.importJSON(rd.result); U.state.step = 4; act.go({ getAttribute: function () { return 'forge'; } }); U.toast('Imported ' + (St.char().name || 'character') + '.'); }
      catch (e) { U.toast(e.message || 'That file could not be read.'); }
    };
    rd.readAsText(f);
  };
})(window.EA = window.EA || {});
