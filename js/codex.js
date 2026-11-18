/* Essence & Ascension — codex
 * codex.js: drill into any entity. Resolves references like "essence:Blood" or "monster:cb-ratlings"
 * into a page of lore, rules and links, shows it in a drawer with back navigation, and powers search.
 *
 * Reference kinds:
 *   essence:Name  conf:Name  family:FAMILY  rarity:Common  stone:AS-001  grade:Standard  hg:Honed  tpl:Void
 *   monster:<foe id>  mab:<foe id>:<slot>  char:<char id>  cab:<char id>:<slot>  ability:<library name>
 *   aff:Bleed  kw:Area  rank:0  stat:Power  heritage:native
 * Audience: 'gm' sees everything; 'player' hides discovery material (confluence trios, stone leans, bestiary).
 */
(function (EA) {
  'use strict';
  var U = EA.ui, R = EA.rules, A = EA.abilities, D = EA.data, Lr = EA.lore, esc = U.esc;
  var C = EA.codex = { audience: 'player', stack: [] };
  function gm() { return C.audience === 'gm'; }

  // ---------- small helpers ----------
  var KIND = { essence: 'Essence', conf: 'Confluence', family: 'Essence family', rarity: 'Rarity', stone: 'Awakening stone', grade: 'Stone grade', hg: 'High-Grade property', tpl: 'Grave mutation',
    monster: 'Creature', mab: 'Creature ability', char: 'Adventurer', cab: 'Ability', ability: 'Ability', aff: 'Affliction', kw: 'Keyword', rank: 'Rank', stat: 'Stat', heritage: 'Heritage' };
  C.kindName = function (k) { return KIND[k] || k; };
  /** A link to an entity. */
  U.xref = function (ref, label, cls) { return '<button type="button" class="xref' + (cls ? ' ' + cls : '') + '" data-act="codex" data-ref="' + esc(ref) + '">' + esc(label) + '</button>'; };
  function links(arr) { return arr.length ? '<div class="xlinks">' + arr.join('') + '</div>' : ''; }
  function sec(h, html) { return html ? { h: h, html: html } : null; }
  function p(t) { return t ? '<p>' + esc(t) + '</p>' : ''; }
  function kv(rows) { return '<dl class="kv">' + rows.filter(Boolean).map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>'; }
  function shortStone(s) { return s.name.replace('Divine Awakening Stone of ', '').replace('Awakening Stone of ', ''); }
  function stoneLoreKey(s) { return s.grade === 'Divine' ? shortStone(s) + '_divine' : shortStone(s); }
  function derivedName(fam) { return D.derived[fam] ? D.derived[fam][0] : null; }
  function derivedFamily(name) { var f = null; Object.keys(D.derived).forEach(function (k) { if (D.derived[k][0] === name) f = k; }); return f; }
  function essLinks(names) { return names.map(function (n) { return U.xref('essence:' + n, n); }).join(', '); }
  function roster() { return (EA.store && EA.store.roster) || {}; }

  function allFoes() {
    var out = [];
    if (EA.bestiary) out = out.concat(EA.bestiary.list);
    if (EA.gm && EA.gm.state) out = out.concat(Object.keys(EA.gm.state.foes).map(function (k) { return EA.gm.state.foes[k]; }));
    return out;
  }
  function findFoe(id) { return (EA.gm && EA.gm.foeById && EA.gm.foeById(id)) || null; }
  function findChar(id) {
    var c = roster()[id]; if (c) return c;
    if (EA.gm && EA.gm.state && EA.gm.state.party[id]) return EA.gm.state.party[id];
    return null;
  }
  function libAbility(name) {
    var Lb = EA.library, pools = [Lb.blood, Lb.examples];
    Lb.starters.forEach(function (s) { pools.push(Object.keys(s.abilities || {}).map(function (k) { return s.abilities[k]; })); });
    for (var i = 0; i < pools.length; i++) for (var j = 0; j < pools[i].length; j++) if (pools[i][j].name === name) return pools[i][j];
    return null;
  }
  function libSource(name) {
    var Lb = EA.library, src = null;
    Lb.blood.forEach(function (b, i) { if (b.name === name) src = 'Blood capability chart, row ' + (i + 1); });
    Lb.examples.forEach(function (b) { if (b.name === name) src = 'Rulebook example'; });
    Lb.starters.forEach(function (s) { Object.keys(s.abilities || {}).forEach(function (k) { if (s.abilities[k].name === name) src = 'Starter adventurer ' + s.name; }); });
    return src;
  }
  function sheetFor(c) { return R.computeSheet(Object.assign({}, c, { options: Object.assign({}, c.options, { tableScale: true, partyRank: c.rank }) })); }

  // keyword refs found in an ability's items
  function abilityKeywords(ab) {
    var k = [];
    (ab.items || []).forEach(function (i) {
      var m = { area: 'Area', execute: 'Execute', drain: 'Drain', amplify: 'Amplify', elongate: 'Elongate', detonate: 'Detonate', trigger: 'Trigger', react: 'Reaction', control: 'Control', shield: 'Shield', cleanse3: 'Cleanse', cleanseInst: 'Cleanse', rider: 'Rider' }[i.k];
      if (m && k.indexOf(m) < 0) k.push(m);
    });
    if (ab.type === 'Reaction' && k.indexOf('Reaction') < 0) k.push('Reaction');
    return k;
  }
  function abilityAffs(ab) {
    var a = [];
    (ab.items || []).forEach(function (i) { if (i.aff && a.indexOf(i.aff) < 0) a.push(i.aff); });
    (ab.hg || []).forEach(function (h) { if (h.k === 'Rider' && h.aff && a.indexOf(h.aff) < 0) a.push(h.aff); });
    return a;
  }

  // every ability known to the codex, for "who uses this" lists
  function everyAbility() {
    var out = [];
    allFoes().forEach(function (f) { Object.keys(f.abilities || {}).forEach(function (s) { out.push({ ref: 'mab:' + f.id + ':' + s, ab: f.abilities[s], owner: f.name }); }); });
    EA.library.blood.concat(EA.library.examples).forEach(function (ab) { out.push({ ref: 'ability:' + ab.name, ab: ab, owner: libSource(ab.name) }); });
    return out;
  }

  // ---------- ability page (shared by mab, cab, ability) ----------
  function abilityPage(ab, S, opts) {
    var res = A.compute(ab, S);
    var flavor = ab.flavor || (Lr.monsterAbility && Lr.monsterAbility[ab.name]) || (Lr.ability && Lr.ability[ab.name]) || '';
    var tiers = res.dmg ? '<div class="tiers">' + R.HIT_TIERS.map(function (t) { return '<div><b>' + (t.dm ? R.fmt(S.disp(R.applyDM(res.dmg, t.dm))) : '0') + '</b>' + t.label.replace(' Hit', '') + '</div>'; }).join('') + '</div>' : '';
    var facts = kv([
      ['Kind', esc(ab.type)],
      res.scaling ? ['Uses', U.xref('stat:' + res.scaling, res.scaling) + (res.rolls ? ', d20 ' + R.sign(S.stat[res.scaling].cm + res.sit) : '')] : null,
      ['Cost', esc(res.costText)], ['Cooldown', esc(res.cdText)],
      ab.grade && ab.grade !== 'Common' && ab.grade !== 'Innate' ? ['Stone grade', esc(A.GRADES[ab.grade] ? A.GRADES[ab.grade].label : ab.grade)] : null
    ]);
    var kws = abilityKeywords(ab).map(function (k) { return U.xref('kw:' + k, k, 'chipx'); });
    var affs = abilityAffs(ab).map(function (a) { return U.xref('aff:' + a, a.replace(' (status)', ''), 'chipx'); });
    var props = (ab.hg || []).filter(function (h) { return h.k; }).map(function (h) { return U.xref('hg:' + h.k, h.k, 'chipx'); });
    if (ab.template) props.push(U.xref('tpl:' + ab.template, ab.template + ' mutation', 'chipx'));
    return {
      quote: flavor,
      blocks: [
        sec('What it does', '<p class="rules">' + esc(A.finalText(ab, res, S)) + '</p>' + tiers + (S.B > 1 ? '<p class="small faint">At ' + R.RANKS[S.tableRank] + ' table scale.</p>' : '')),
        sec('Card', facts),
        sec('Keywords and afflictions', links(kws.concat(affs))),
        sec('Stone properties', links(props)),
        opts && opts.source ? sec('Source', opts.source) : null
      ]
    };
  }

  // ---------- resolvers ----------
  var RES = {};
  RES.essence = function (n) {
    var e = D.essenceByName[n]; if (!e) return null;
    var fam = Lr.family[e.family] || { title: e.family };
    var blocks = [
      sec('Theme', p(e.theme)),
      gm() ? sec('Family', '<p>' + U.xref('family:' + e.family, fam.title) + '. ' + esc(fam.lore || '') + '</p>') : null,
      sec('Rarity', '<p>' + U.xref('rarity:' + e.rarity, e.rarity) + '. ' + esc(Lr.rarity[e.rarity] || '') + '</p>')
    ];
    if (gm()) {
      var confs = [];
      Object.keys(D.confluenceNames).forEach(function (cn) {
        D.confluenceNames[cn].trios.forEach(function (k) {
          var parts = k.split(', ');
          if (parts.indexOf(n) >= 0) confs.push('<li>' + U.xref('conf:' + cn, cn) + ' <span class="quiet small">with ' + essLinks(parts.filter(function (x) { return x !== n; })) + '</span></li>');
        });
      });
      blocks.push(sec('Known confluences (GM)', confs.length ? '<ul class="xlist">' + confs.join('') + '</ul>' : '<p class="quiet small">No recorded trio includes it. An uncovered trio resolves by family; with two or more ' + esc(fam.title) + ' essences that is ' + U.xref('conf:' + derivedName(e.family), derivedName(e.family)) + '.</p>'));
      var drops = allFoes().filter(function (f) { var m = Lr.monster[f.id]; return m && m.drops && m.drops.indexOf(n) >= 0; });
      if (drops.length) blocks.push(sec('Creatures that may drop it (GM)', links(drops.map(function (f) { return U.xref('monster:' + f.id, f.name, 'chipx'); }))));
      var st = D.stones.filter(function (s) { return shortStone(s).replace(/^the /, '') === n; });
      if (st.length) blocks.push(sec('Matching stone', links(st.map(function (s) { return U.xref('stone:' + s.id, s.name, 'chipx'); }))));
    }
    return { title: n, sub: e.rarity + (gm() ? ' • ' + fam.title : ''), tag: e.tag, color: U.FAMILY_COLOR[e.family], quote: Lr.essence[n], blocks: blocks };
  };
  /** Confluences a player may read about: those their own revealed characters carry. */
  function playerKnows(n) {
    return Object.keys(roster()).some(function (id) { var c = roster()[id]; if (!c.confluence || !c.confluence.revealed) return false; var cf = R.computeSheet(c).confluence; return cf && cf.name === n; });
  }
  RES.conf = function (n) {
    if (!gm() && !playerKnows(n)) return null;
    var fam = derivedFamily(n);
    if (fam) {
      var members = D.essences.filter(function (e) { return e.family === fam; });
      return { title: n, sub: 'Family confluence • ' + (Lr.family[fam] ? Lr.family[fam].title : fam), tag: 'derived', color: U.FAMILY_COLOR[fam], quote: Lr.derived[n],
        blocks: [sec('Theme', p(D.derived[fam][1])),
          gm() ? sec('How it forms', '<p>When a trio has no recorded confluence, the Uncovered Trio Procedure looks at families. A trio led by ' + U.xref('family:' + fam, Lr.family[fam] ? Lr.family[fam].title : fam) + ' essences forms ' + esc(n) + '.</p>') : null,
          gm() ? sec('Family essences', '<p class="small">' + essLinks(members.map(function (e) { return e.name; })) + '</p>') : null] };
    }
    var c = D.confluenceNames[n]; if (!c) return null;
    var blocks = [sec('Theme', p(c.theme))];
    if (c.restrictedAll) blocks.push(sec('Restricted', '<p>The Adventure Society restricts this confluence. Those found carrying it can expect a kill contract.</p>'));
    if (gm()) {
      blocks.push(sec('Known trios (GM)', '<ul class="xlist">' + c.trios.map(function (k) {
        var m = D.confluenceMap[k], mine = m && m.name === n;
        return '<li>' + U.dot(mine ? m.tag : 'unverified') + essLinks(k.split(', ')) + (m && m.restricted ? ' <span class="chip bad">restricted</span>' : '') + (!mine && m ? ' <span class="quiet small">(usually resolves to ' + U.xref('conf:' + m.name, m.name) + ')</span>' : '') + '</li>';
      }).join('') + '</ul>'));
    }
    var canon = c.trios.some(function (k) { return D.confluenceMap[k] && D.confluenceMap[k].name === n && D.confluenceMap[k].tag === 'canon'; });
    return { title: n, sub: 'Confluence' + (c.restrictedAll ? ' • restricted' : ''), tag: canon ? 'canon' : 'unverified', color: 'var(--gold)', quote: Lr.confluence[n], blocks: blocks };
  };
  RES.family = function (f) {
    var fam = Lr.family[f]; if (!fam || !gm()) return null;
    var members = D.essences.filter(function (e) { return e.family === f; });
    var dn = derivedName(f);
    return { title: fam.title + ' essences', sub: members.length + ' essences', tag: 'derived', color: U.FAMILY_COLOR[f], blocks: [
      sec('About', p(fam.lore)),
      dn ? sec('Family confluence', '<p>' + U.xref('conf:' + dn, dn) + ': ' + esc(Lr.derived[dn] || '') + '</p>') : null,
      sec('Essences', '<p class="small">' + essLinks(members.map(function (e) { return e.name; })) + '</p>')] };
  };
  RES.rarity = function (r) {
    if (!Lr.rarity[r]) return null;
    var members = D.essences.filter(function (e) { return e.rarity === r; });
    return { title: r, sub: 'Rarity • ' + members.length + ' essences', tag: 'house', blocks: [sec('About', p(Lr.rarity[r])), sec('Essences', '<p class="small">' + essLinks(members.map(function (e) { return e.name; })) + '</p>'),
      gm() ? sec('Loot roll', '<p class="small">d20: 1–10 Common, 11–15 Uncommon, 16–18 Rare, 19 Epic, 20 roll again (1–15 Epic, 16–20 Legendary).</p>') : null] };
  };
  RES.stone = function (id) {
    var s = D.stones.filter(function (x) { return x.id === id; })[0]; if (!s) return null;
    var short = shortStone(s), essName = short.replace(/^the /, '');
    var blocks = [sec('Grade', '<p>' + U.xref('grade:' + s.grade, s.grade) + '. ' + esc(Lr.grade[s.grade] || '') + '</p>'), sec('Rarity', p(s.rarity))];
    if (gm()) {
      blocks.push(sec('Leans toward (GM)', s.lock ? p(s.lock + '. After the player picks a row, move to the nearest row of this kind if the chosen row is not one.') : p('Free roll: no lean.')));
      if (s.template) blocks.push(sec('Grave mutation', '<p>' + U.xref('tpl:' + s.template, s.template) + '</p>'));
      if (s.fixed) blocks.push(sec('Fixed ability', p(s.fixed)));
      if (s.provisional) blocks.push(sec('Note', p('Grade is provisional: the records are thin.')));
    }
    if (D.essenceByName[essName]) blocks.push(sec('Matching essence', '<p>' + U.xref('essence:' + essName, essName) + '</p>'));
    return { title: s.name, sub: s.rarity + ' • ' + s.grade, tag: s.tag, color: s.grade === 'Grave' ? '#ff6f7f' : s.grade === 'Divine' ? 'var(--gold)' : s.grade === 'High-Grade' ? '#a98bff' : 'var(--glow)', quote: Lr.stone[stoneLoreKey(s)], blocks: blocks };
  };
  RES.grade = function (g) {
    if (!Lr.grade[g]) return null;
    var st = D.stones.filter(function (s) { return s.grade === g; });
    return { title: g + ' stones', sub: st.length + ' stones', tag: 'house', blocks: [sec('About', p(Lr.grade[g])),
      g === 'High-Grade' ? sec('Properties', links(A.HG.map(function (h) { return U.xref('hg:' + h.k, h.k, 'chipx'); }))) : null,
      g === 'Grave' ? sec('Mutations', links(A.TEMPLATES.map(function (t) { return U.xref('tpl:' + t.k, t.k, 'chipx'); }))) : null,
      gm() ? sec('Stones', links(st.map(function (s) { return U.xref('stone:' + s.id, shortStone(s), 'chipx'); }))) : null] };
  };
  RES.hg = function (k) {
    var h = A.HG.filter(function (x) { return x.k === k; })[0]; if (!h) return null;
    return { title: k, sub: 'High-Grade property • d20 ' + h.d.join('–'), tag: 'derived', quote: Lr.hg[k], blocks: [sec('Effect', p(h.text + (h.dbl ? '; rolled twice on an Epic stone: ' + h.dbl : '') + '.')), sec('Comes from', '<p>' + U.xref('grade:High-Grade', 'High-Grade stones') + '</p>')] };
  };
  RES.tpl = function (k) {
    var t = A.TEMPLATES.filter(function (x) { return x.k === k; })[0]; if (!t) return null;
    var st = D.stones.filter(function (s) { return s.template === k; });
    return { title: k, sub: 'Grave mutation • d20 ' + t.d.join('–'), tag: 'derived', color: '#ff6f7f', quote: Lr.template[k], blocks: [
      sec('Power', p(t.power + '.')), sec('Drawback', p(t.cost + '.')), sec('Net value', p(t.net + ' APB')),
      st.length && gm() ? sec('Named on', links(st.map(function (s) { return U.xref('stone:' + s.id, s.name, 'chipx'); }))) : null] };
  };
  RES.monster = function (id) {
    var f = findFoe(id); if (!f || (!gm() && f.canon)) return null;
    var lore = Lr.monster[id] || (f.copiedFrom && Lr.monster[f.copiedFrom]) || {};
    var S = sheetFor(f), G = EA.gm;
    var abl = G.kitSlots(f).map(function (s) { return U.xref('mab:' + f.id + ':' + s, f.abilities[s].name, 'chipx'); });
    var stats = kv([
      ['Rank', U.xref('rank:' + f.rank, G.rankLabel(f))], ['Threat', esc(G.TIERS[f.hpMult || 1]) + (f.hpMult !== 1 ? ', Health ×' + f.hpMult : '')],
      ['Health / Mana / Stamina', R.fmt(S.pool.HP.dMax) + ' / ' + R.fmt(S.pool.MP.dMax) + ' / ' + R.fmt(S.pool.SP.dMax)],
      ['Defense: strikes / spells / areas', R.sign(S.def.strike) + ' / ' + R.sign(S.def.spell) + ' / ' + R.sign(S.def.area)],
      ['Basic Attack', R.fmt(S.disp(S.basic.dmg)) + ' damage, ' + U.xref('stat:' + S.basic.stat, S.basic.stat)]
    ]);
    var loot = [L_core(f), lore.loot].filter(Boolean).map(function (t) { return t.replace(/\.$/, ''); }).join('. ') + '.';
    var acts = [];
    if (U.state.route && EA.gm) acts.push('<button class="btn sm primary" data-act="gmAddFoe" data-id="' + f.id + '">Add to the encounter</button>');
    if (f.canon && EA.bestiary) acts.push('<button class="btn sm" data-act="gmCanonCopy" data-id="' + f.id + '">Copy to your foes</button>');
    return { title: f.name, sub: G.rankLabel(f) + ' • ' + G.tierName(f.hpMult) + (f.archetype ? ' • ' + f.archetype : ''), tag: f.canon ? 'unverified' : 'house', color: '#ff6f7f',
      quote: lore.q, actions: acts.join(''),
      blocks: [
        sec('About', p(lore.lore || f.desc)),
        sec('Where it is found', p(lore.where)),
        sec('Running it', p(lore.tactics)),
        sec('Numbers', stats + '<p class="small faint">At ' + R.RANKS[f.rank] + ' table scale.</p>'),
        sec('Abilities', links(abl)),
        sec('Loot', '<p>' + esc(loot) + '</p>' + (lore.drops && lore.drops.length ? '<p class="small">Essences it may drop: ' + essLinks(lore.drops.filter(function (n) { return D.essenceByName[n]; })) + '</p>' : '')),
        f.canon ? sec('Sources', '<p class="small quiet">' + U.dot('unverified') + 'Name and rank from the novels. ' + U.dot('derived') + 'Lore, stats and kit written for the game.</p>') : null
      ] };
  };
  function L_core(f) { var c = Lr.coreFor(f); return c ? c.charAt(0).toUpperCase() + c.slice(1) : ''; }
  RES.mab = function (key) {
    var i = key.lastIndexOf(':'), id = key.slice(0, i), slot = key.slice(i + 1), f = findFoe(id);
    if (!f || !f.abilities[slot] || (!gm() && f.canon)) return null;
    var ab = f.abilities[slot], pg = abilityPage(ab, sheetFor(f), { source: '<p>' + U.xref('monster:' + f.id, f.name) + '</p>' });
    return { title: ab.name, sub: ab.type + ' • ' + f.name, tag: f.canon ? 'derived' : 'house', color: '#ff6f7f', quote: pg.quote, blocks: pg.blocks };
  };
  RES.ability = function (name) {
    var ab = libAbility(name); if (!ab) return null;
    var S = R.computeSheet({ heritage: 'native', rank: 0, rs: 0, stats: { Power: 14, Speed: 14, Spirit: 14, Recovery: 14 }, essences: [], abilities: {}, options: { tableScale: true }, confluence: {} });
    var src = libSource(name), pg = abilityPage(ab, S, { source: '<p>' + esc(src || 'Library') + '. Numbers shown for an Iron 0 adventurer with 14 in every stat.</p>' + (src && src.indexOf('Blood') === 0 ? '<p>' + U.xref('essence:Blood', 'Blood essence') + '</p>' : '') });
    return { title: name, sub: ab.type + (src ? ' • ' + src : ''), tag: src && src.indexOf('Starter') === 0 ? 'house' : 'derived', quote: pg.quote, blocks: pg.blocks };
  };
  RES.char = function (id) {
    var c = findChar(id); if (!c) return null;
    var S = R.computeSheet(c), cf = S.confluence;
    var abl = A.SLOTS.filter(function (s) { return c.abilities[s]; }).map(function (s) { return U.xref('cab:' + c.id + ':' + s, c.abilities[s].name, 'chipx'); });
    var stats = R.STATS.map(function (k) { return [U.xref('stat:' + k, k), R.sign(S.stat[k].cm) + ' <span class="quiet small">(' + S.stat[k].raw + ')</span>']; });
    return { title: c.name || 'Unnamed adventurer', sub: R.rankName(c.rank, c.rs) + ' • ' + (Lr.heritage[c.heritage] ? Lr.heritage[c.heritage].title : c.heritage), tag: 'house', color: 'var(--glow)', quote: c.concept || c.notes || '',
      blocks: [
        sec('Heritage and rank', '<p>' + U.xref('heritage:' + c.heritage, Lr.heritage[c.heritage] ? Lr.heritage[c.heritage].title : c.heritage) + ' • ' + U.xref('rank:' + c.rank, R.rankName(c.rank, c.rs)) + '</p>'),
        sec('Essences', '<p>' + essLinks(c.essences.filter(Boolean)) + (cf && (c.confluence.revealed || gm()) ? ' → ' + U.xref('conf:' + cf.name, cf.name) : '') + '</p>'),
        sec('Stats', kv(stats)),
        sec('Pools', kv([['Health', R.fmt(S.pool.HP.dMax) + ' (+' + S.pool.HP.dReg + ')'], ['Mana', R.fmt(S.pool.MP.dMax) + ' (+' + S.pool.MP.dReg + ')'], ['Stamina', R.fmt(S.pool.SP.dMax) + ' (+' + S.pool.SP.dReg + ')']])),
        sec('Abilities', links(abl))
      ] };
  };
  RES.cab = function (key) {
    var i = key.lastIndexOf(':'), id = key.slice(0, i), slot = key.slice(i + 1), c = findChar(id);
    if (!c || !c.abilities[slot]) return null;
    var ab = c.abilities[slot], S = R.computeSheet(c), pg = abilityPage(ab, S, { source: '<p>' + U.xref('char:' + c.id, c.name || 'Adventurer') + ' • slot ' + esc(slot) + (ab.stone ? ' • ' + esc(ab.stone) : '') + '</p>' });
    return { title: ab.name || 'Unnamed ability', sub: ab.type + ' • ' + (c.name || 'Adventurer'), tag: 'house', color: 'var(--glow)', quote: pg.quote, blocks: pg.blocks };
  };
  RES.aff = function (n) {
    var a = Lr.affliction[n], info = R.AFFLICTIONS[n]; if (!a || !info) return null;
    var users = everyAbility().filter(function (x) { return abilityAffs(x.ab).indexOf(n) >= 0 && (gm() || x.ref.indexOf('mab:') !== 0); }).slice(0, 24);
    return { title: n.replace(' (status)', ''), sub: '', tag: 'house', color: '#f0b35a', quote: a.q, blocks: [
      sec('About', p(a.lore)), sec('Rules', p(a.rules)),
      sec('At a glance', kv([['Resisted with', U.xref('stat:' + info.resist, info.resist)], ['Lasts', info.duration + ' Upkeeps'], ['Stack cap', String(info.cap)]])),
      sec('Abilities that apply it', links(users.map(function (x) { return U.xref(x.ref, x.ab.name, 'chipx'); }))),
      sec('Related', links([U.xref('kw:Rider', 'Rider', 'chipx'), U.xref('kw:Amplify', 'Amplify', 'chipx'), U.xref('kw:Detonate', 'Detonate', 'chipx'), U.xref('kw:Elongate', 'Elongate', 'chipx'), U.xref('kw:Cleanse', 'Cleanse', 'chipx')]))] };
  };
  RES.kw = function (k) {
    var t = Lr.keyword[k]; if (!t) return null;
    var users = everyAbility().filter(function (x) { return abilityKeywords(x.ab).indexOf(k) >= 0 && (gm() || x.ref.indexOf('mab:') !== 0); }).slice(0, 24);
    return { title: k, sub: '', tag: 'house', blocks: [sec('Rules', p(t)), sec('Abilities with it', links(users.map(function (x) { return U.xref(x.ref, x.ab.name, 'chipx'); })))] };
  };
  RES.rank = function (r) {
    r = +r; var l = Lr.rank[r]; if (!l) return null;
    var M0 = R.M(r, 0), M9 = R.M(r, 9);
    var foes = gm() && EA.bestiary ? EA.bestiary.list.filter(function (f) { return f.rank === r && !f.normal; }) : [];
    var norm = gm() && r === 0 && EA.bestiary ? EA.bestiary.list.filter(function (f) { return f.normal; }) : [];
    return { title: R.RANKS[r], sub: 'Rank ' + (r + 1) + ' of 5', tag: 'house', color: 'var(--gold)', quote: l.q, blocks: [
      sec('About', p(l.lore)), sec('At the table', p(l.rules)),
      sec('Numbers', kv([['Rank multiplier', M0.toFixed(2) + ' at Step 0 to ' + M9.toFixed(2) + ' at Step 9'], ['Check bonus from rank', '+' + (10 * r) + ' plus Step'], ['Table scale', 'numbers ÷ ' + R.fmt(Math.pow(4, r))]])),
      foes.length ? sec('Creatures of this rank (GM)', links(foes.map(function (f) { return U.xref('monster:' + f.id, f.name, 'chipx'); }))) : null,
      norm.length ? sec('Below Iron: Normal rank (GM)', links(norm.map(function (f) { return U.xref('monster:' + f.id, f.name, 'chipx'); }))) : null,
      sec('Other ranks', links(R.RANKS.map(function (n, i) { return i === r ? '' : U.xref('rank:' + i, n, 'chipx'); })))] };
  };
  RES.stat = function (k) {
    var s = Lr.stat[k]; if (!s) return null;
    return { title: k, sub: '', tag: 'house', blocks: [sec('About', p(s.lore)), sec('Rules', p(s.rules)), sec('Other stats', links(R.STATS.filter(function (x) { return x !== k; }).map(function (x) { return U.xref('stat:' + x, x, 'chipx'); })))] };
  };
  RES.heritage = function (h) {
    var x = Lr.heritage[h]; if (!x) return null;
    return { title: x.title, sub: '', tag: 'house', blocks: [sec('About', p(x.lore)), sec('Rules', p(x.rules)), sec('The other heritage', '<p>' + U.xref('heritage:' + (h === 'native' ? 'outworlder' : 'native'), h === 'native' ? 'Outworlder' : 'Native') + '</p>')] };
  };

  C.resolve = function (ref) {
    var i = ref.indexOf(':'), k = ref.slice(0, i), v = ref.slice(i + 1);
    var fn = RES[k]; if (!fn) return null;
    var e = fn(v); if (e) e.kind = k;
    return e;
  };

  // ---------- search index ----------
  C.index = function () {
    var out = [];
    function add(ref, title, kind, text) { out.push({ ref: ref, title: title, kind: kind, text: (title + ' ' + (text || '')).toLowerCase() }); }
    D.essences.forEach(function (e) { add('essence:' + e.name, e.name, 'essence', e.theme + ' ' + e.family + ' ' + e.rarity + ' ' + (Lr.essence[e.name] || '')); });
    Object.keys(D.confluenceNames).forEach(function (n) { if (gm() || playerKnows(n)) add('conf:' + n, n, 'conf', D.confluenceNames[n].theme + ' ' + (Lr.confluence[n] || '')); });
    Object.keys(D.derived).forEach(function (f) { var n = D.derived[f][0]; if (gm() || playerKnows(n)) add('conf:' + n, n, 'conf', D.derived[f][1]); });
    if (gm()) Object.keys(Lr.family).forEach(function (f) { add('family:' + f, Lr.family[f].title + ' essences', 'family', Lr.family[f].lore); });
    Object.keys(Lr.rarity).forEach(function (r) { add('rarity:' + r, r, 'rarity', ''); });
    if (gm()) {
      D.stones.forEach(function (s) { add('stone:' + s.id, s.name, 'stone', s.rarity + ' ' + s.grade + ' ' + s.lock + ' ' + (Lr.stone[stoneLoreKey(s)] || '')); });
      A.HG.forEach(function (h) { add('hg:' + h.k, h.k, 'hg', h.text); });
      A.TEMPLATES.forEach(function (t) { add('tpl:' + t.k, t.k, 'tpl', t.power + ' ' + t.cost); });
    }
    Object.keys(Lr.grade).forEach(function (g) { add('grade:' + g, g + ' stones', 'grade', Lr.grade[g]); });
    Object.keys(Lr.affliction).forEach(function (a) { add('aff:' + a, a.replace(' (status)', ''), 'aff', Lr.affliction[a].lore); });
    Object.keys(Lr.keyword).forEach(function (k) { add('kw:' + k, k, 'kw', Lr.keyword[k]); });
    R.RANKS.forEach(function (n, i) { add('rank:' + i, n, 'rank', Lr.rank[i].lore); });
    R.STATS.forEach(function (k) { add('stat:' + k, k, 'stat', Lr.stat[k].lore); });
    Object.keys(Lr.heritage).forEach(function (h) { add('heritage:' + h, Lr.heritage[h].title, 'heritage', ''); });
    if (gm()) EA.library.blood.concat(EA.library.examples).forEach(function (ab) { add('ability:' + ab.name, ab.name, 'ability', (Lr.ability[ab.name] || '') + ' ' + libSource(ab.name)); });
    Object.keys(roster()).forEach(function (id) {
      var c = roster()[id]; add('char:' + id, c.name || 'Unnamed adventurer', 'char', c.essences.join(' '));
      Object.keys(c.abilities || {}).forEach(function (s) { add('cab:' + id + ':' + s, c.abilities[s].name || 'Unnamed ability', 'cab', (c.name || '') + ' ' + (c.abilities[s].flavor || '')); });
    });
    if (gm()) {
      allFoes().forEach(function (f) {
        var l = Lr.monster[f.id] || {};
        add('monster:' + f.id, f.name, 'monster', (f.desc || '') + ' ' + (l.lore || '') + ' ' + (l.where || '') + ' ' + EA.gm.rankLabel(f));
        Object.keys(f.abilities || {}).forEach(function (s) { add('mab:' + f.id + ':' + s, f.abilities[s].name, 'mab', f.name + ' ' + (Lr.monsterAbility[f.abilities[s].name] || '')); });
      });
      if (EA.gm.state) Object.keys(EA.gm.state.party).forEach(function (id) { var c = EA.gm.state.party[id]; add('char:' + id, c.name || 'Unnamed adventurer', 'char', 'imported'); });
    }
    return out;
  };
  C.search = function (q, kind) {
    q = (q || '').toLowerCase().trim();
    var words = q.split(/\s+/).filter(Boolean);
    return C.index().filter(function (x) {
      if (kind && x.kind !== kind && !(kind === 'ability' && (x.kind === 'mab' || x.kind === 'cab'))) return false;
      return words.every(function (w) { return x.text.indexOf(w) >= 0; });
    }).sort(function (a, b) {
      var at = a.title.toLowerCase(), bt = b.title.toLowerCase();
      var as = at.indexOf(q) === 0 ? 0 : at.indexOf(q) >= 0 ? 1 : 2, bs = bt.indexOf(q) === 0 ? 0 : bt.indexOf(q) >= 0 ? 1 : 2;
      return as - bs || at.localeCompare(bt);
    });
  };

  // ---------- page HTML (used by the drawer and the codex view) ----------
  C.pageHTML = function (e) {
    if (!e) return '<p class="quiet">Nothing is recorded under that name.</p>';
    return '<article class="codex-page" style="--entity:' + (e.color || 'var(--glow)') + '">' +
      '<p class="ckind">' + U.dot(e.tag || 'derived') + esc(C.kindName(e.kind)) + (e.sub ? ' • ' + esc(e.sub) : '') + '</p>' +
      '<h2 class="ctitle">' + esc(e.title) + '</h2>' +
      (e.quote ? '<blockquote class="cquote">' + esc(e.quote) + '</blockquote>' : '') +
      (e.actions ? '<div class="row" style="margin:0 0 14px">' + e.actions + '</div>' : '') +
      e.blocks.filter(Boolean).map(function (b) { return '<section class="cblock"><h4>' + esc(b.h) + '</h4>' + b.html + '</section>'; }).join('') +
      '</article>';
  };

  // ---------- drawer ----------
  U.codexHTML = function () {
    if (!C.stack.length) return '';
    var ref = C.stack[C.stack.length - 1], e = C.resolve(ref);
    var crumbs = C.stack.length > 1 ? '<button class="btn sm" data-act="codexBack">← ' + esc((C.resolve(C.stack[C.stack.length - 2]) || {}).title || 'Back') + '</button>' : '<span></span>';
    return '<div class="codex-scrim" data-act="codexScrim"><aside class="codex-drawer' + (C.animate ? ' enter' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(e ? e.title : 'Codex') + '" data-scroll="codex">' +
      '<div class="codex-head">' + crumbs + '<button class="iconbtn" data-act="codexClose" aria-label="Close">' + U.icon('close') + '</button></div>' +
      C.pageHTML(e) + '</aside></div>';
  };
  U.actions.codex = function (el, ev) {
    if (ev) ev.stopPropagation();
    var ref = el.getAttribute('data-ref');
    C.animate = !C.stack.length;
    if (C.stack[C.stack.length - 1] !== ref) C.stack.push(ref);
    if (C.stack.length > 30) C.stack.shift();
    U.render();
    setTimeout(function () { C.animate = false; var d = document.querySelector('.codex-drawer'); if (d) { d.scrollTop = 0; d.focus({ preventScroll: true }); } }, 30);
  };
  U.actions.codexBack = function () { C.stack.pop(); U.render(); setTimeout(function () { var d = document.querySelector('.codex-drawer'); if (d) d.scrollTop = 0; }, 30); };
  U.actions.codexClose = function () { C.stack = []; U.render(); };
  U.actions.codexScrim = function (el, ev) { if (ev && ev.target === el) { C.stack = []; U.render(); } };
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && C.stack.length) { ev.stopImmediatePropagation(); C.stack = []; U.render(); } }, true);

  // ---------- search view (route "codex") ----------
  U.state.codexQ = ''; U.state.codexKind = '';
  var KIND_FILTERS = [['', 'Everything'], ['essence', 'Essences'], ['conf', 'Confluences', 1], ['stone', 'Stones', 1], ['monster', 'Creatures', 1], ['ability', 'Abilities'], ['aff', 'Afflictions'], ['kw', 'Keywords'], ['rank', 'Ranks']];
  C.viewHTML = function () {
    var q = U.state.codexQ, k = U.state.codexKind;
    var filters = KIND_FILTERS.filter(function (f) { return gm() || !f[2]; }).map(function (f) { return '<button class="chip' + (k === f[0] ? ' on' : '') + '" data-act="codexKind" data-k="' + f[0] + '">' + f[1] + '</button>'; }).join(' ');
    var res = C.search(q, k), shown = res.slice(0, 200);
    var groups = {};
    shown.forEach(function (x) { (groups[x.kind] = groups[x.kind] || []).push(x); });
    var order = ['rank', 'essence', 'family', 'rarity', 'conf', 'stone', 'grade', 'hg', 'tpl', 'monster', 'mab', 'ability', 'char', 'cab', 'aff', 'kw', 'stat', 'heritage'];
    var html = order.filter(function (g) { return groups[g]; }).map(function (g) {
      return '<section class="cgroup"><h3>' + esc(C.kindName(g)) + ' <span class="quiet small">' + groups[g].length + '</span></h3><div class="xlinks">' + groups[g].map(function (x) { return U.xref(x.ref, x.title, 'chipx'); }).join('') + '</div></section>';
    }).join('');
    return '<section class="panel"><h2>Codex</h2><p class="lede">' + (gm() ? 'Every essence, confluence, stone, creature, ability, affliction and rule, with its lore.' : 'Essences, ranks, stats, afflictions, keywords and your own adventurers and abilities, with their lore. Your GM holds the rest.') + ' Select any name to open it; every page links onward.</p>' +
      '<div class="row"><input type="search" data-key="codexq" data-input="codexQ" value="' + esc(q) + '" placeholder="Search names, themes and lore" style="flex:1;min-width:220px" aria-label="Search the codex"></div>' +
      '<div class="row" style="margin:12px 0 4px">' + filters + '</div><p class="small quiet">' + res.length + ' entr' + (res.length === 1 ? 'y' : 'ies') + (res.length > shown.length ? ', first ' + shown.length + ' shown' : '') + '</p>' +
      (html || '<p class="quiet">Nothing matches that search.</p>') + '</section>';
  };
  U.actions.codexQ = function (el) { U.state.codexQ = el.value; U.render(); };
  U.actions.codexKind = function (el) { U.state.codexKind = el.getAttribute('data-k'); U.render(); };
})(window.EA = window.EA || {});
