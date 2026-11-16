/* Essence & Ascension — Character Forge
 * ui-sheet.js: the printable character sheet, plus save, share and import.
 */
(function (EA) {
  'use strict';
  var U = EA.ui, R = EA.rules, A = EA.abilities, St = EA.store, D = EA.data;
  var esc = U.esc;

  function sheetHTML(c) {
    var S = R.computeSheet(c), cf = S.confluence, showCf = cf && (c.confluence.revealed || c.options.gmView);
    var stats = R.STATS.map(function (k) {
      var s = S.stat[k];
      return '<div class="sh-stat"><span class="sh-lbl">' + k + '</span><b>' + R.sign(s.cm) + '</b><span class="sh-sub">score ' + s.raw + ' • stat ' + R.sign(s.sm) + ' • rank +' + s.rankMod + '</span></div>';
    }).join('');
    function pool(k) {
      var p = S.pool[k];
      return '<div class="sh-pool sh-' + k + '"><div class="sh-ph"><span>' + p.label + '</span><span>Maximum <b>' + R.fmt(p.dMax) + '</b></span></div>' +
        '<div class="sh-track"></div><div class="sh-pf">Regain <b>' + p.dReg + '</b> each Upkeep • uses ' + p.stat + '</div></div>';
    }
    var ess = [0, 1, 2].map(function (i) {
      var n = c.essences[i], e = n && D.essenceByName[n];
      return '<div class="sh-ess"><span class="sh-lbl">Essence ' + (i + 1) + '</span><b>' + esc(n || '—') + '</b><span class="sh-sub">' + (e ? e.rarity + ' • ' + esc(e.theme) : '') + '</span></div>';
    }).join('') + '<div class="sh-ess sh-conf"><span class="sh-lbl">Confluence</span><b>' + esc(showCf ? cf.name : cf ? 'Ask your GM' : '—') + '</b><span class="sh-sub">' + (showCf ? esc(cf.theme) + (cf.restricted ? ' • restricted' : '') : '') + '</span></div>';

    var cols = ['E1', 'E2', 'E3', 'C'];
    var heads = [c.essences[0], c.essences[1], c.essences[2], showCf ? cf.name : 'Confluence'];
    var grid = cols.map(function (col, ci) {
      var cells = [1, 2, 3, 4, 5].map(function (row) {
        var slot = col + '-' + row, ab = c.abilities[slot];
        if (!ab) return '<div class="sh-ab sh-empty"><span class="sh-slot">' + slot + '</span>' + (row > S.rowsOpen ? '<span class="sh-sub">opens at ' + R.ROW_GATE[row - 1] + '</span>' : '<span class="sh-sub">open slot</span>') + '<div class="sh-lines"></div></div>';
        var res = A.compute(ab, S);
        var tiers = res.dmg ? '<div class="sh-tiers">' + R.HIT_TIERS.slice(1).map(function (t) { return '<span>' + t.label.replace(' Hit', '') + ' <b>' + R.fmt(S.disp(R.applyDM(res.dmg, t.dm))) + '</b></span>'; }).join('') + '</div>' : '';
        return '<div class="sh-ab"><span class="sh-slot">' + slot + (row === 1 ? ' • innate' : '') + '</span><b class="sh-an">' + esc(ab.name) + '</b>' +
          '<div class="sh-am">' + esc(ab.type) + (res.action !== ab.type ? ' • ' + esc(res.action) : '') + '<br>' + esc(res.costText) + ' • ' + esc(res.cdText) + (res.rolls && res.scaling ? ' • d20 ' + R.sign(S.stat[res.scaling].cm + res.sit) : '') + '</div>' +
          '<p class="sh-at">' + esc(A.finalText(ab, res, S)) + '</p>' + tiers + '</div>';
      }).join('');
      return '<div class="sh-col"><div class="sh-colh">' + esc(heads[ci] || (ci < 3 ? 'Essence ' + (ci + 1) : 'Confluence')) + '</div>' + cells + '</div>';
    }).join('');

    var turn = S.tickEngine ?
      '<div><span class="sh-lbl">Tick engine</span><b>' + S.majorRecovery + '</b><span class="sh-sub">Ticks between Majors • Tempo ' + S.tempo.toFixed(3) + ' • Surge ' + S.dExert + ' SP</span></div>' :
      '<div><span class="sh-lbl">Action Points</span><b>3</b><span class="sh-sub">per turn • Exert ' + S.dExert + ' SP for +1</span></div>';
    var aura = S.aura.available ? '<div><span class="sh-lbl">Aura</span><b>' + R.sign(S.aura.AO) + '</b><span class="sh-sub">output • defense ' + R.sign(S.aura.AD) + ' • ' + S.aura.radius + ' m • Strain max ' + S.aura.strainMax + '</span></div>' : '';
    var traits = S.outworlder ? '<div class="sh-box"><h4>Outworlder</h4><p>Spoils of the Fallen: one extra item a session after a worthy fight. Anomalous Soul: steer every awakening one step further. Foreign Mind: +2 edge against mind magic. Outsider: −2 on local customs and reading people' + (c.rank >= 1 ? ' (ended at Bronze)' : ' until Bronze') + '.</p></div>' : '';
    var passives = A.list(c).filter(function (x) { return x.ab.type === 'Passive'; });

    var p1 = '<section class="sheet sh-page">' +
      '<header class="sh-band"><div class="sh-id"><span class="sh-lbl" style="color:#9fe9f5">Essence &amp; Ascension • adventurer</span><h1>' + esc(c.name || 'Unnamed adventurer') + '</h1>' +
      (c.concept ? '<p class="sh-concept">' + esc(c.concept) + '</p>' : '') +
      '<p class="sh-meta"><span>' + esc(S.rankName) + '</span><span>' + (S.outworlder ? 'Outworlder' : 'Native') + '</span>' + (c.player ? '<span>Player: ' + esc(c.player) + '</span>' : '') + '</p></div>' +
      '<div class="sh-sig">' + EA.sigil(c.essences, showCf ? cf : null, { small: true, sealed: !showCf, progress: S.P }) + '</div></header>' +
      '<div class="sh-stats">' + stats + '</div>' +
      '<div class="sh-pools">' + pool('HP') + pool('MP') + pool('SP') + '</div>' +
      '<div class="sh-row3"><div class="sh-box"><h4>Temporary Health</h4><div class="sh-track sh-small"></div></div>' +
      '<div class="sh-box"><h4>Death Marks</h4><div class="sh-marks"><i></i><i></i><i></i></div><p class="sh-sub">Downed at 0 Health. Any healing clears them.</p></div>' +
      '<div class="sh-box"><h4>Strain / notes</h4><div class="sh-track sh-small"></div></div></div>' +
      '<div class="sh-combat"><div><span class="sh-lbl">Defense vs strikes</span><b>' + R.sign(S.def.strike) + '</b><span class="sh-sub">' + S.def.strikeName + '</span></div>' +
      '<div><span class="sh-lbl">vs spells</span><b>' + R.sign(S.def.spell) + '</b><span class="sh-sub">' + S.def.spellName + '</span></div>' +
      '<div><span class="sh-lbl">vs areas</span><b>' + R.sign(S.def.area) + '</b><span class="sh-sub">Dodge</span></div>' +
      '<div><span class="sh-lbl">Initiative</span><b>' + R.sign(S.init) + '</b><span class="sh-sub">d20 + this</span></div>' +
      '<div><span class="sh-lbl">Move</span><b>' + S.move + ' m</b><span class="sh-sub">per Move</span></div>' + turn + aura + '</div>' +
      '<div class="sh-ess-row">' + ess + '</div>' +
      '<div class="sh-row2"><div class="sh-box"><h4>Always available</h4><p><b>Basic Attack</b> (' + S.basic.stat + ', Major, no cost): ' + R.fmt(S.disp(S.basic.dmg)) + ' damage, d20 ' + R.sign(S.stat[S.basic.stat].cm) + '.<br><b>Mana Dart</b> (Spirit, Major, ' + S.disp(S.basic.dartCost) + ' MP): ' + R.fmt(S.disp(S.basic.dart)) + ' damage, d20 ' + R.sign(S.stat.Spirit.cm) + '.<br>' +
      '<b>Defend</b>: +2 to all defenses until your next turn. <b>Resist</b> Bleed ' + R.sign(S.stat.Power.cm) + ', Poison ' + R.sign(S.stat.Recovery.cm) + ', Necrosis and Doom ' + R.sign(S.stat.Spirit.cm) + '.</p>' +
      (passives.length ? '<p><b>Always on:</b> ' + passives.map(function (x) { return esc(x.ab.name); }).join(', ') + ' (already counted).</p>' : '') + '</div>' +
      '<div class="sh-box"><h4>Results</h4><p class="sh-small-p">Miss 0 • Graze ½ • Hit full • Solid ×1¼ • Strong ×1½ • Devastating ×2. Natural 20: one step better. Natural 1: one step worse. Edges and penalties total at most ±5.</p></div></div>' +
      traits + '<div class="sh-box sh-notes"><h4>Notes, gear and contracts</h4>' + (c.notes ? '<p>' + esc(c.notes).replace(/\n/g, '<br>') + '</p>' : '') + '<div class="sh-lines"></div></div>' +
      '<footer class="sh-foot">' + (S.B > 1 ? 'Numbers at ' + R.RANKS[S.tableRank] + ' table scale (÷' + R.fmt(S.B) + '). ' : '') + 'Essence &amp; Ascension • unofficial fan work inspired by <i>He Who Fights with Monsters</i> by Travis Deverell (Shirtaloon).</footer></section>';
    var p2 = '<section class="sheet sh-page"><header class="sh-band sh-band-thin"><h2>' + esc(c.name || 'Unnamed adventurer') + ' • abilities</h2><span>' + esc(S.rankName) + '</span></header>' +
      '<div class="sh-grid">' + grid + '</div><footer class="sh-foot">Damage values shown are before the hit result; the row beneath each attack lists every result. Cooldowns ' + (S.tickEngine ? 'in Ticks.' : 'in Rounds.') + '</footer></section>';
    return p1 + p2;
  }
  EA.sheetHTML = sheetHTML;

  U.views.sheet = function () {
    var c = St.char(); if (!c) return U.views.home();
    var framed = window.self !== window.top;
    return U.topbar() + '<main class="wrap"><section class="panel"><div class="spread"><div><h2 style="margin:0">Character sheet</h2><p class="quiet" style="margin:4px 0 0">Two pages: everything about you, then your abilities. Print it, or choose Save as PDF in the print dialog.</p></div>' +
      '<div class="row"><button class="btn primary" data-act="print">' + U.icon('print') + ' Print or save as PDF</button><button class="btn" data-act="exportOpen">' + U.icon('save') + ' Save a copy</button></div></div>' +
      (framed ? '<p class="small" style="color:var(--warn);margin:10px 0 0">This preview runs inside another page that blocks printing. Open the forge on its own page (for example your GitHub Pages site) to print.</p>' : '') + '</section>' +
      '<div class="sheet-stage" style="margin-top:18px">' + sheetHTML(c) + '</div></main>' +
      '<div class="print-only">' + sheetHTML(c) + '</div>';
  };

  U.actions.print = function () {
    try { window.print(); } catch (e) { U.toast('Printing is blocked here. Open the forge on its own page to print.'); }
  };

  // ---------- save, share, import ----------
  function exportModal() {
    var c = St.char(), json = St.exportJSON(c);
    return '<div class="modal" style="width:min(720px,100%)" role="dialog" aria-modal="true" aria-label="Save or share"><div class="panel"><button class="iconbtn x" data-act="closeModal" aria-label="Close">' + U.icon('close') + '</button>' +
      '<h2>Save or share ' + esc(c.name || 'this adventurer') + '</h2><p class="lede">Characters live in this browser. Download a file to keep a copy, move to another device, or hand the build to your GM.</p>' +
      '<div class="row"><button class="btn primary" data-act="download">' + U.icon('save') + ' Download character file</button><button class="btn" data-act="copyJSON">' + U.icon('copy') + ' Copy to clipboard</button></div>' +
      '<label class="f" style="margin-top:16px"><span>Character data</span><textarea readonly style="min-height:160px;font:12px/1.5 var(--mono)">' + esc(json) + '</textarea></label>' +
      '<hr class="rule"><h3>Load a character</h3><label class="f"><span>Paste character data</span><textarea data-key="paste" data-input="pasteJSON" placeholder="Paste the contents of a character file">' + esc(U.state.paste || '') + '</textarea></label>' +
      '<div class="row"><button class="btn" data-act="importPaste">Load pasted character</button><label class="btn" for="importFile2">' + U.icon('upload') + ' Choose a file</label><input id="importFile2" type="file" accept=".json,application/json" class="sr" data-input="importFile"></div></div></div>';
  }
  U.actions.exportOpen = function () { U.openModal(exportModal); };
  U.actions.download = function () {
    var c = St.char(), blob = new Blob([St.exportJSON(c)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (c.name || 'adventurer').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.ea-character.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    U.toast('Download started. If nothing happens, use Copy instead.');
  };
  U.actions.copyJSON = function () {
    var text = St.exportJSON(St.char());
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { U.toast('Copied.'); }, function () { U.toast('Copy was blocked. Select the text and copy it instead.'); });
    else U.toast('Copy is not available here. Select the text and copy it instead.');
  };
  U.actions.pasteJSON = function (el) { U.state.paste = el.value; };
  U.actions.importPaste = function () {
    try { St.importJSON(U.state.paste || ''); U.state.paste = ''; U.closeModal(); U.state.route = 'forge'; U.state.step = 4; U.toast('Loaded ' + (St.char().name || 'character') + '.'); }
    catch (e) { U.toast(e.message && /JSON/.test(e.message) ? 'That text is not character data.' : e.message); }
  };
})(window.EA = window.EA || {});
