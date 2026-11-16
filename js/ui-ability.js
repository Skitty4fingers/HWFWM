/* Essence & Ascension — Character Forge
 * ui-ability.js: the ability forge (card editor), ability library, and the awakening roller.
 */
(function (EA) {
  'use strict';
  var U = EA.ui, R = EA.rules, A = EA.abilities, D = EA.data, St = EA.store, L = EA.library;
  var esc = U.esc;

  U.roots.edit = function () { return U.state.edit && U.state.edit.ab; };

  var prevBind = U.onBind;
  U.onBind = function (root, path) {
    if (prevBind) prevBind(root, path);
    if (root !== 'edit') return;
    var ab = U.state.edit.ab, T = A.TYPES[ab.type];
    if (path === 'type') {
      if (T.res === 'SP' || T.res === 'MP') ab.resource = T.res;
      if (T.res === 'choose' && ab.resource !== 'MP' && ab.resource !== 'SP') ab.resource = 'SP';
      if (T.cd && !ab.cd) ab.cd = 3;
      if (ab.type === 'Passive') { ab.scaling = null; }
      else if (!ab.scaling) ab.scaling = ab.type === 'Special Attack' ? 'Power' : 'Spirit';
    }
    if (path === 'grade') trimProps(ab);
    if (path === 'cd') ab.cd = +ab.cd;
    if (/^items\.\d+\.(x|n|pts)$/.test(path)) {
      var parts = path.split('.'), it = ab.items[+parts[1]];
      it[parts[2]] = Math.max(0, +it[parts[2]] || 0);
    }
  };
  function trimProps(ab) {
    var g = A.GRADES[ab.grade];
    ab.hg = (ab.hg || []).slice(0, g.hg);
    while (ab.hg.length < g.hg) ab.hg.push({ k: '' });
    if (!g.template) ab.template = '';
  }

  function colEssence(c, slot) {
    var col = slot.split('-')[0];
    if (col === 'C') { var cf = R.resolveConfluence(c); return cf ? cf.name : ''; }
    return c.essences[+col.slice(1) - 1] || '';
  }

  // ======================= open / save =======================
  U.actions.editAb = function (el) {
    var c = St.char(), slot = el.getAttribute('data-slot');
    var ab = c.abilities[slot] ? St.clone(c.abilities[slot]) : A.blank(slot);
    if (!c.abilities[slot] && slot.slice(-1) === '1') ab.grade = 'Innate';
    trimProps(ab);
    U.state.edit = { slot: slot, ab: ab, tab: c.abilities[slot] ? 'build' : 'awaken', isNew: !c.abilities[slot], awaken: { stone: '', roll: null } };
    U.openModal(editorView);
  };
  U.actions.edTab = function (el) { U.state.edit.tab = el.getAttribute('data-tab'); U.render(); };
  U.actions.edSave = function () {
    var c = St.char(), e = U.state.edit;
    if (!e.ab.name) e.ab.name = 'Unnamed ability';
    e.ab.hg = (e.ab.hg || []).filter(function (h) { return h.k; });
    c.abilities[e.slot] = e.ab; St.touch();
    U.state.edit = null; U.closeModal(); U.toast(e.ab.name + ' is on your sheet.');
  };
  U.actions.edRemove = function () {
    var c = St.char(), e = U.state.edit;
    delete c.abilities[e.slot]; St.touch(); U.state.edit = null; U.closeModal();
  };
  U.actions.addItem = function (el) {
    var k = el.value || el.getAttribute('data-k'); if (!k) return;
    var d = A.ITEMS[k];
    U.state.edit.ab.items.push(Object.assign({ k: k }, St.clone(d.def)));
    if (el.tagName === 'SELECT') el.value = '';
    U.render();
  };
  U.actions.rmItem = function (el) { U.state.edit.ab.items.splice(+el.getAttribute('data-i'), 1); U.render(); };
  U.actions.rollHG = function (el) {
    var i = +el.getAttribute('data-i'), r = U.d20(), h = A.hgByRoll(r);
    U.state.edit.ab.hg[i] = { k: h.k };
    U.toast('Rolled ' + r + ': ' + h.k + '. Re-roll if it cannot affect this ability.');
  };
  U.actions.rollTpl = function () { var r = U.d20(), t = A.templateByRoll(r); U.state.edit.ab.template = t.k; U.toast('Rolled ' + r + ': ' + t.k + '.'); };
  U.actions.addEvo = function () { U.state.edit.ab.evo.push({ k: 'Efficient' }); U.render(); };
  U.actions.rmEvo = function (el) { U.state.edit.ab.evo.splice(+el.getAttribute('data-i'), 1); U.render(); };
  U.actions.loadLib = function (el) {
    var src = el.getAttribute('data-src'), i = +el.getAttribute('data-i');
    var list = src === 'blood' ? L.blood : src === 'ex' ? L.examples : L.starterAbilities().map(function (x) { return x.ab; });
    var e = U.state.edit, keep = { grade: e.ab.grade, stone: e.ab.stone, hg: e.ab.hg, template: e.ab.template, evo: e.ab.evo };
    e.ab = Object.assign(St.clone(list[i]), keep);
    trimProps(e.ab);
    e.tab = 'build'; U.render();
  };

  // ======================= awakening =======================
  U.actions.awStone = function (el) {
    var e = U.state.edit, s = D.stones.filter(function (x) { return x.id === el.value; })[0];
    e.awaken.stone = el.value; e.awaken.roll = null;
    if (!s) return U.render();
    e.ab.stone = s.name;
    e.ab.grade = gradeOf(s);
    if (s.template) e.ab.template = s.template;
    trimProps(e.ab);
    U.render();
  };
  function gradeOf(s) {
    if (s.grade === 'Divine') return 'Divine';
    if (s.grade === 'Grave') return 'Legendary';
    if (/^(Common|Uncommon|Rare|Epic|Legendary)$/.test(s.rarity)) return s.rarity;
    return s.grade === 'High-Grade' ? 'Rare' : 'Common';
  }
  U.actions.awRoll = function () { U.state.edit.awaken.roll = U.d20(); U.render(); };
  U.actions.awPick = function (el) {
    var e = U.state.edit, i = +el.getAttribute('data-i');
    var keep = { grade: e.ab.grade, stone: e.ab.stone, hg: e.ab.hg, template: e.ab.template, evo: e.ab.evo };
    e.ab = Object.assign(St.clone(L.blood[i]), keep);
    trimProps(e.ab); e.tab = 'build'; U.render();
  };

  function lockMatches(lock, i) {
    if (!lock) return true;
    var row = L.bloodLocks[i];
    return lock.split(/,| or /).map(function (s) { return s.replace(/\(.*\)/, '').trim(); }).filter(Boolean).some(function (t) {
      return row.split(' ').concat([L.blood[i].type]).some(function (w) { return t.indexOf(w) === 0 || w.indexOf(t.split(' ')[0]) === 0; });
    });
  }

  function awakenView(c, S, e) {
    var slot = e.slot, ess = colEssence(c, slot), isInnate = slot.slice(-1) === '1';
    var stoneOpts = '<option value="">' + (isInnate ? 'Innate: no stone' : 'Choose the stone') + '</option>' +
      ['Standard', 'High-Grade', 'Grave', 'Divine'].map(function (g) {
        return '<optgroup label="' + g + '">' + D.stones.filter(function (s) { return s.grade === g; }).map(function (s) {
          return '<option value="' + s.id + '"' + (e.awaken.stone === s.id ? ' selected' : '') + '>' + esc(s.name.replace('Awakening Stone of ', '')) + ' (' + s.rarity + (s.lock ? ', leans ' + s.lock : '') + ')</option>';
        }).join('') + '</optgroup>';
      }).join('');
    var stone = D.stones.filter(function (s) { return s.id === e.awaken.stone; })[0];
    var grade = A.GRADES[e.ab.grade], shift = grade.shift + (S.outworlder && grade.shift >= 0 && e.ab.grade !== 'Innate' && e.ab.grade !== 'Divine' ? 1 : 0);
    var html = '<div class="grid2"><div><label class="f"><span>Awakening stone</span><select data-input="awStone" data-key="awstone">' + stoneOpts + '</select></label>' +
      (stone ? '<p class="small">' + U.dot(stone.tag) + esc(stone.name) + ': ' + esc(stone.rarity) + (stone.provisional ? ' (grade provisional)' : '') + '. ' +
        (stone.lock ? 'Leans toward <b>' + esc(stone.lock) + '</b>. ' : 'No lean: a free roll. ') + (shift ? 'You may steer the result ' + shift + ' row' + (shift > 1 ? 's' : '') + ' either way.' : 'No steering.') +
        (stone.template ? ' Template: <b>' + esc(stone.template) + '</b>.' : '') + (stone.fixed ? ' Fixed ability: ' + esc(stone.fixed) + '.' : '') + '</p>' : '') +
      '</div><div><p class="small quiet" style="margin-top:0">Awakening: choose the essence (this is ' + esc(slot) + ', ' + esc(ess || 'empty') + '), hand the GM the stone, roll a d20 on that essence’s chart, steer within your stone’s reach, then name it.</p>' +
      '<div class="row"><button class="btn" data-act="awRoll">' + U.icon('d20') + ' Roll the awakening d20</button>' + (e.awaken.roll ? '<span class="chip on">Rolled ' + e.awaken.roll + '</span>' : '') + '</div></div></div>';

    if (ess === 'Blood' && c.options.gmView) {
      var roll = e.awaken.roll;
      var taken = Object.keys(c.abilities).filter(function (k) { return k.split('-')[0] === slot.split('-')[0] && k !== slot && c.abilities[k]; }).map(function (k) { return c.abilities[k].name; });
      html += '<hr class="rule"><h3>Blood capability chart</h3><p class="small quiet">GM material. ' + (roll ? 'Rows within reach of ' + roll + ' are lit; rows that match the stone’s lean are marked.' : 'Roll to light up the rows within reach.') + '</p><div class="ess-list" style="max-height:340px" data-scroll="chart">' +
        L.blood.map(function (b, i) {
          var row = i + 1, dist = roll ? Math.min(Math.abs(row - roll), 20 - Math.abs(row - roll)) : 99;
          var reach = roll && dist <= shift, lockOk = stone && stone.lock && lockMatches(stone.lock, i), dup = taken.indexOf(b.name) >= 0;
          var res = A.compute(b, S);
          return '<button class="ess-opt' + (reach ? ' picked' : '') + '" data-act="awPick" data-i="' + i + '"' + (dup ? ' disabled title="Already awakened in this essence"' : '') + '>' +
            '<b>' + row + '. ' + esc(b.name) + '</b>' + (lockOk ? ' <span class="chip on">matches lean</span>' : '') + (dup ? ' <span class="chip">taken</span>' : '') +
            '<span class="th">' + esc(b.type) + ' • ' + esc(res.costText) + ' • ' + esc(res.cdText) + '</span><span class="th">' + esc(trim(res.text, 90)) + '</span></button>';
        }).join('') + '</div>';
    } else {
      html += '<hr class="rule"><div class="sealed" style="border-color:var(--edge-strong);color:var(--text);background:rgba(127,227,242,.05)"><p style="margin:0 0 8px">Your GM reads what woke from the ' + esc(ess || 'essence') + ' chart. Build the card they describe in <b>Build the card</b>: type, cooldown and effects. The forge prices it and does the arithmetic.</p>' +
        '<p class="small quiet" style="margin:0">Only the Blood chart is written out in the rulebook so far; GMs write the rest from the chart template as players reach them.' + (ess === 'Blood' ? ' Turn on GM view in Rank & finish to roll on it here.' : '') + '</p>' +
        '<div class="row" style="margin-top:10px"><button class="btn primary" data-act="edTab" data-tab="build">Build the card</button><button class="btn" data-act="edTab" data-tab="library">Pick from the library</button></div></div>';
    }
    return html;
  }
  function trim(s, n) { return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }

  // ======================= library =======================
  function libraryView(c, S) {
    function list(src, arr, label) {
      return '<h3>' + label + '</h3><div class="ess-list" style="max-height:none;margin-bottom:16px">' + arr.map(function (x, i) {
        var ab = x.ab || x, res = A.compute(ab, S);
        return '<button class="ess-opt" data-act="loadLib" data-src="' + src + '" data-i="' + i + '"><b>' + esc(ab.name) + '</b>' + (x.from ? '<span class="rar">' + esc(x.from) + '</span>' : '') +
          '<span class="th">' + esc(ab.type) + ' • ' + esc(res.costText) + ' • ' + esc(res.cdText) + '</span><span class="th">' + esc(trim(res.text, 96)) + '</span></button>';
      }).join('') + '</div>';
    }
    return '<p class="small quiet" style="margin-top:0">Load a finished card, then rename or adjust it. Numbers are shown for this character. Your stone’s grade and properties carry over.</p>' +
      list('st', L.starterAbilities(), 'From the starter adventurers') + list('ex', L.examples, 'From the rulebook examples') +
      (c.options.gmView ? list('blood', L.blood, 'Blood capability chart (GM)') : '<p class="small faint">Turn on GM view in Rank & finish to see the Blood capability chart.</p>');
  }

  // ======================= build =======================
  function itemRow(it, i, ab) {
    var d = A.ITEMS[it.k]; if (!d) return '';
    var o = '';
    var b = function (f) { return 'data-root="edit" data-bind="items.' + i + '.' + f + '"'; };
    function num(f, min, max, step) { return '<input type="number" min="' + min + '" max="' + max + '" step="' + step + '" data-type="int" ' + b(f) + ' value="' + (it[f] || 0) + '" style="width:84px" aria-label="' + f + '">'; }
    function affSel(f) { return '<select ' + b(f) + '>' + A.AFF.map(function (a) { return '<option' + (it[f] === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select>'; }
    function txt(f, ph) { return '<input type="text" ' + b(f) + ' value="' + esc(it[f] || '') + '" placeholder="' + esc(ph) + '">'; }
    function statSel(f) { return '<select ' + b(f) + '>' + R.STATS.map(function (s) { return '<option' + (it[f] === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>'; }
    switch (it.k) {
      case 'dmg': case 'heal': case 'shield': o = num('x', 10, 125, 10) + '<span class="small quiet">APB</span>'; break;
      case 'rider': o = affSel('aff') + num('n', 1, 10, 1) + '<span class="small quiet">stacks</span>'; break;
      case 'areaPlus': case 'dmgBuff': case 'cleanse3': case 'dur': o = num('n', 1, 10, 1) + '<span class="small quiet">times</span>'; break;
      case 'buff': case 'debuff': o = num('pts', 1, 5, 1) + '<span class="small quiet">points on</span>' + txt('what', it.k === 'buff' ? 'Dodge' : 'its attack rolls'); break;
      case 'control': o = '<span class="small quiet">contest against</span>' + statSel('vs'); break;
      case 'react': o = txt('trigger', 'When you are attacked'); break;
      case 'passive':
        o = '<select ' + b('pick') + '>' + Object.keys(A.PASSIVE_PICKS).map(function (p) { return '<option value="' + p + '"' + (it.pick === p ? ' selected' : '') + '>' + A.PASSIVE_PICKS[p] + '</option>'; }).join('') + '</select>' +
          (it.pick === 'rmit' ? affSel('aff') : '') + (/^(sit|dmgcond|utility)$/.test(it.pick) ? txt('note', 'Describe the condition or power') : '');
        break;
      case 'transform': o = '<span class="small quiet">stats</span><select data-root="edit" data-bind="items.' + i + '.stats.0">' + R.STATS.map(function (s) { return '<option' + ((it.stats || [])[0] === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
        '<select data-root="edit" data-bind="items.' + i + '.stats.1">' + R.STATS.map(function (s) { return '<option' + ((it.stats || [])[1] === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>'; break;
      case 'aura': o = '<select ' + b('effect') + '>' + Object.keys(A.AURA_EFFECTS).map(function (k) { return '<option value="' + k + '"' + (it.effect === k ? ' selected' : '') + '>' + A.AURA_EFFECTS[k].replace(' {aura}', '').replace('{aura} ', '') + '</option>'; }).join('') + '</select>'; break;
      case 'amplify': case 'detonate': o = affSel('aff'); break;
      case 'elongate': o = affSel('aff') + num('n', 1, 6, 1) + '<span class="small quiet">Upkeeps</span>'; break;
    }
    return '<div class="item"><span class="lbl">' + esc(d.label) + '</span><span class="apb">' + d.apb(it) + '</span>' +
      '<button class="btn sm" data-act="rmItem" data-i="' + i + '" aria-label="Remove ' + esc(d.label) + '">×</button>' + (o ? '<div class="opts">' + o + '</div>' : '') + '</div>';
  }

  function buildView(c, S, e, res) {
    var ab = e.ab, T = A.TYPES[ab.type], b = function (f) { return 'data-root="edit" data-bind="' + f + '"'; };
    var typeSel = '<select ' + b('type') + '>' + A.TYPE_NAMES.map(function (t) { return '<option' + (ab.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>';
    var scalSel = '<select ' + b('scaling') + (ab.type === 'Passive' ? ' disabled' : '') + '>' + R.STATS.map(function (s) { return '<option' + (ab.scaling === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>';
    var cdSel = '<select data-type="int" ' + b('cd') + (T.cd ? '' : ' disabled') + '>' + A.CDS.map(function (n) { return '<option value="' + n + '"' + (ab.cd === n ? ' selected' : '') + '>' + (n === 1 ? 'At will (1)' : n + ' Rounds') + '</option>'; }).join('') + '</select>';
    var resSel = T.res === 'choose' ? '<select ' + b('resource') + '><option' + (ab.resource === 'SP' ? ' selected' : '') + '>SP</option><option' + (ab.resource === 'MP' ? ' selected' : '') + '>MP</option></select>' : '<input type="text" disabled value="' + (T.res === 'none' ? 'No cost' : T.res) + '">';
    var gradeSel = '<select ' + b('grade') + '>' + Object.keys(A.GRADES).map(function (g) { return '<option value="' + g + '"' + (ab.grade === g ? ' selected' : '') + '>' + A.GRADES[g].label + '</option>'; }).join('') + '</select>';
    var groups = {};
    Object.keys(A.ITEMS).forEach(function (k) { var g = A.ITEMS[k].group; (groups[g] = groups[g] || []).push(k); });
    var addSel = '<select data-input="addItem" data-key="additem"><option value="">Add an effect…</option>' + Object.keys(groups).map(function (g) {
      return '<optgroup label="' + g + '">' + groups[g].map(function (k) { var d = A.ITEMS[k]; return '<option value="' + k + '">' + esc(d.label) + ' — ' + d.apb(d.def) + ' APB</option>'; }).join('') + '</optgroup>';
    }).join('') + '</select>';

    var gr = A.GRADES[ab.grade], props = '';
    if (gr.hg) {
      props = '<h3>Stone properties</h3><p class="small quiet">' + ab.grade + ' stones add ' + gr.hg + ' High-Grade propert' + (gr.hg > 1 ? 'ies' : 'y') + ' (+10 APB each). Rolling the same one twice on an Epic stone doubles it.</p>' +
        ab.hg.map(function (h, i) {
          return '<div class="row" style="margin-bottom:8px"><select data-root="edit" data-bind="hg.' + i + '.k" style="flex:1"><option value="">Choose or roll</option>' + A.HG.map(function (x) { return '<option value="' + x.k + '"' + (h.k === x.k ? ' selected' : '') + '>' + x.d.join('–') + ' ' + x.k + ': ' + x.text + '</option>'; }).join('') + '</select>' +
            (h.k === 'Rider' ? '<select data-root="edit" data-bind="hg.' + i + '.aff" style="width:auto">' + A.AFF.map(function (a) { return '<option' + (h.aff === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select>' : '') +
            (h.k === 'Widened' ? '<select data-root="edit" data-bind="hg.' + i + '.opt" style="width:auto"><option value="radius"' + (h.opt !== 'targets' ? ' selected' : '') + '>Radius</option><option value="targets"' + (h.opt === 'targets' ? ' selected' : '') + '>Two targets</option></select>' : '') +
            '<button class="btn sm" data-act="rollHG" data-i="' + i + '">' + U.icon('d20') + ' Roll</button></div>';
        }).join('');
    }
    if (gr.template) {
      var t = A.templateByName(ab.template);
      props = '<h3>Grave template</h3><div class="row"><select data-root="edit" data-bind="template" style="flex:1"><option value="">Choose or roll</option>' + A.TEMPLATES.map(function (x) { return '<option value="' + x.k + '"' + (ab.template === x.k ? ' selected' : '') + '>' + x.d.join('–') + ' ' + x.k + ' (net ' + x.net + ' APB)</option>'; }).join('') + '</select>' +
        '<button class="btn sm" data-act="rollTpl">' + U.icon('d20') + ' Roll</button></div>' + (t ? '<p class="small">' + esc(t.power) + '. <span style="color:var(--warn)">Drawback: ' + esc(t.cost) + '.</span></p>' : '');
    }
    var evo = '';
    if (S.evoSlots > 0) {
      evo = '<h3>Evolutions</h3><p class="small quiet">One per rank reached above Iron: ' + S.evoSlots + ' at ' + R.RANKS[S.r] + '. Evolutions never raise damage.</p>' +
        ab.evo.map(function (ev, i) {
          return '<div class="row" style="margin-bottom:8px"><span class="chip">' + R.RANKS[i + 1] + '</span><select data-root="edit" data-bind="evo.' + i + '.k" style="flex:1">' + Object.keys(A.EVOLUTIONS).map(function (k) { return '<option' + (ev.k === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select>' +
            (ev.k === 'Rider' ? '<select data-root="edit" data-bind="evo.' + i + '.aff" style="width:auto">' + A.AFF.map(function (a) { return '<option' + (ev.aff === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select>' : '') +
            (ev.k === 'Rank Feature' ? '<input type="text" data-root="edit" data-bind="evo.' + i + '.note" value="' + esc(ev.note || '') + '" placeholder="Describe it">' : '') +
            '<button class="btn sm" data-act="rmEvo" data-i="' + i + '">×</button></div>';
        }).join('') + (ab.evo.length < S.evoSlots ? '<button class="btn sm" data-act="addEvo">Add an evolution</button>' : '');
    }
    return '<div class="grid2"><label class="f"><span>Ability name</span><input type="text" ' + b('name') + ' value="' + esc(ab.name) + '" placeholder="Name it"></label>' +
      '<label class="f"><span>Kind</span>' + typeSel + '</label>' +
      '<label class="f"><span>Uses stat</span>' + scalSel + '</label><label class="f"><span>Cooldown</span>' + cdSel + '</label>' +
      '<label class="f"><span>Pays with</span>' + resSel + '</label><label class="f"><span>Stone</span>' + gradeSel + '</label></div>' +
      '<label class="f"><span>Keywords</span><input type="text" ' + b('keywords') + ' value="' + esc(ab.keywords) + '" placeholder="' + esc(colEssence(c, e.slot) || 'Essence') + ', ranged"></label>' +
      '<h3>Effects</h3><p class="small quiet" style="margin-top:-6px">Spend exactly ' + gr.budget + ' Ability Power Budget (APB). Cooldown sets how hard each point hits.</p>' +
      '<div class="items">' + ab.items.map(function (it, i) { return itemRow(it, i, ab); }).join('') + '</div>' + addSel +
      (props ? '<hr class="rule">' + props : '') + (evo ? '<hr class="rule">' + evo : '') +
      '<hr class="rule"><label class="f"><span>Your own rules text (optional)</span><textarea ' + b('text') + ' placeholder="Leave empty to use the generated text. Tokens: {dmg} {heal} {shield} {aura} {exec} {summonHp} {summonAtk} {famHp} {famAtk} {weapon}">' + esc(ab.text) + '</textarea></label>';
  }

  function meter(res) {
    var cls = res.apbBase === res.apbBudget ? 'ok' : res.apbBase > res.apbBudget ? 'over' : 'under';
    var pal = ['#7fe3f2', '#e9cf7a', '#62d9a0', '#a98bff', '#ff9356', '#ec7489', '#6fa8ff', '#dfe4ee'];
    var items = U.state.edit.ab.items, max = Math.max(res.apbBudget, res.apbBase);
    var segs = items.map(function (it, i) { var d = A.ITEMS[it.k]; return d ? '<i style="width:' + (d.apb(it) / max * 100) + '%;background:' + pal[i % pal.length] + '"></i>' : ''; }).join('');
    return '<div class="apbmeter ' + cls + '"><span class="small quiet">APB</span><span class="track">' + segs + '</span><b>' + res.apbBase + ' / ' + res.apbBudget + '</b></div>' +
      (res.apbExtra ? '<p class="small quiet" style="margin:6px 0 0">Total power with stone and evolutions: ' + res.apbTotal + ' APB.</p>' : '');
  }

  U.cardHTML = function (ab, res, S, slot) {
    var tags = res.action === ab.type ? [ab.type] : [ab.type, res.action];
    if (ab.keywords) tags = tags.concat(ab.keywords.split(',').map(function (s) { return s.trim(); }).filter(Boolean));
    var facts = '<div><span>Cost</span><b>' + esc(res.costText) + '</b></div><div><span>Cooldown</span><b>' + esc(res.cdText) + '</b></div>' +
      '<div><span>Roll</span><b>' + (res.rolls && res.scaling ? 'd20 ' + R.sign(S.stat[res.scaling].cm + res.sit) : '—') + '</b></div>';
    var tiers = '';
    if (res.dmg) {
      tiers = '<div class="tiers">' + R.HIT_TIERS.map(function (t) {
        return '<div><b>' + (t.dm ? R.fmt(S.disp(R.applyDM(res.dmg, t.dm))) : '0') + '</b>' + t.label.replace(' Hit', '') + '</div>';
      }).join('') + '</div>';
    }
    return '<div class="card"><p class="small faint" style="margin:0">' + esc(slot || '') + (ab.stone ? ' • ' + esc(ab.stone) : '') + '</p><p class="ttl">' + esc(ab.name || 'Unnamed ability') + '</p>' +
      '<div class="tags">' + tags.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<div class="facts">' + facts + '</div><div class="body">' + esc(A.finalText(ab, res, S)) + '</div>' + tiers +
      (S.tickEngine && ab.type !== 'Passive' ? '<p class="small quiet" style="margin:8px 0 0">Cast time ' + res.castTime + ' Ticks.</p>' : '') + '</div>';
  };

  function editorView() {
    var c = St.char(), e = U.state.edit, S = R.computeSheet(c), res = A.compute(e.ab, S);
    var tab = e.tab, ess = colEssence(c, e.slot);
    var tabs = '<div class="seg" role="tablist">' + [['awaken', 'Awaken'], ['build', 'Build the card'], ['library', 'Library']].map(function (t) {
      return '<button data-act="edTab" data-tab="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</div>';
    var left = tab === 'awaken' ? awakenView(c, S, e) : tab === 'library' ? libraryView(c, S) : buildView(c, S, e, res);
    var hood = '<details class="hood"><summary>Under the hood</summary><div class="mono">' +
      (res.scaling ? 'Scaling ' + res.scaling + ': effective ' + R.fmt(res.E) + '\n' : '') +
      (res.C ? 'Cooldown ' + e.ab.cd + ' → coefficient per 100 APB ' + res.C + (res.coefMult !== 1 ? ' × ' + res.coefMult.toFixed(2) : '') + '\n' : '') +
      (res.dmg ? 'Damage = floor(' + res.coef + ' × ' + R.fmt(res.E) + ') = ' + R.fmt(res.dmg) + '\n' : '') +
      (res.heal ? 'Healing = floor(0.8 × C × APB/100 × E) = ' + R.fmt(res.heal) + '\n' : '') +
      (res.shield ? 'Shield = floor(C × APB/100 × E) = ' + R.fmt(res.shield) + '\n' : '') +
      (res.cost ? 'Cost = floor(κ × M) = ' + R.fmt(res.cost) + ' ' + res.resource + '\n' : '') +
      (res.cdTicks ? 'Bronze+ cooldown: 6 × ' + e.ab.cd + ' ÷ Tempo ' + S.tempo.toFixed(3) + ' = ' + res.cdTicks + ' Ticks\n' : '') +
      (S.B > 1 ? 'Shown ÷ ' + R.fmt(S.B) + ' (table scale)' : '') + '</div></details>';
    return '<div class="modal" role="dialog" aria-modal="true" aria-label="Ability forge"><div class="panel">' +
      '<button class="iconbtn x" data-act="closeModal" aria-label="Close">' + U.icon('close') + '</button>' +
      '<p class="quiet small" style="margin:0">' + esc(e.slot) + ' • ' + esc(ess || 'unbonded') + (e.slot.slice(-1) === '1' ? ' • innate ability' : '') + '</p><h2>' + (e.isNew ? 'Awaken an ability' : 'Edit ' + esc(e.ab.name)) + '</h2>' +
      tabs + '<div class="editor" style="margin-top:16px"><div>' + left + '</div><div><div style="position:sticky;top:0">' + U.cardHTML(e.ab, res, S, e.slot) +
      '<div style="margin-top:12px">' + meter(res) + '</div>' + (res.issues.length ? '<ul class="issues">' + res.issues.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + hood +
      '<div class="row" style="margin-top:16px"><button class="btn primary" data-act="edSave">' + (e.isNew ? 'Add to my sheet' : 'Save changes') + '</button>' +
      (!e.isNew ? '<button class="btn danger" data-act="edRemove">Remove from slot</button>' : '') + '<button class="btn" data-act="closeModal">Cancel</button></div></div></div></div></div></div>';
  }
})(window.EA = window.EA || {});
