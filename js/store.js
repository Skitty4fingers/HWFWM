/* Essence & Ascension — Character Forge
 * store.js: character model, roster persistence (localStorage), import and export.
 */
(function (EA) {
  'use strict';
  var KEY = 'ea-forge-v1';
  var R = EA.rules;

  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function newPlay() {
    return {
      init: false, inCombat: false, round: 1, tick: 1, rd: 1, anchor: 1, topInit: null, initRoll: null,
      hp: 0, mp: 0, sp: 0, temp: 0, tempLeft: 0, deathMarks: 0, lastMax: null, scale: 1,
      ap: 3, carry: 0, exerted: false, majorUsed: false, reactionUsed: false, freeMove: false, freeMinor: false, surged: false,
      cd: {}, readyAt: {}, effects: [], auras: {}, afflictions: [], affOrder: 0,
      strain: 0, press: false, suppress: false, domain: false, collapse: 0, hollow: false,
      log: []
    };
  }

  function newCharacter() {
    return {
      v: 1, id: uid(), name: '', player: '', concept: '', heritage: 'native',
      rank: 0, rs: 0,
      stats: { Power: 13, Speed: 13, Spirit: 14, Recovery: 14 },
      rawBonus: { Power: 0, Speed: 0, Spirit: 0, Recovery: 0 },
      basicStat: 'Power',
      essences: ['', '', ''],
      confluence: { revealed: false, override: '', shiftRoll: null, choice: '' },
      abilities: {},
      options: { tableScale: true, partyRank: null, canonPace: false, gmView: false, shifting: false },
      notes: '', gear: '',
      play: newPlay(),
      updated: Date.now()
    };
  }

  function fromStarter(i) {
    var s = EA.library.starters[i], c = newCharacter();
    c.name = s.name; c.concept = s.concept; c.heritage = s.heritage; c.stats = clone(s.stats);
    c.essences = s.essences.slice(); c.basicStat = s.basicStat; c.abilities = clone(s.abilities);
    c.confluence.revealed = true;
    return c;
  }

  function migrate(c) {
    var base = newCharacter();
    Object.keys(base).forEach(function (k) { if (c[k] === undefined) c[k] = base[k]; });
    c.options = Object.assign(base.options, c.options || {});
    c.confluence = Object.assign(base.confluence, c.confluence || {});
    c.play = Object.assign(newPlay(), c.play || {});
    c.rawBonus = Object.assign(base.rawBonus, c.rawBonus || {});
    return c;
  }

  var S = { roster: {}, current: null, listeners: [] };

  S.load = function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        S.roster = d.roster || {};
        Object.keys(S.roster).forEach(function (id) { migrate(S.roster[id]); });
        S.current = d.current && S.roster[d.current] ? d.current : null;
      }
    } catch (e) { S.storageBroken = true; }
  };
  var saveTimer = null;
  function write() {
    saveTimer = null;
    try { localStorage.setItem(KEY, JSON.stringify({ roster: S.roster, current: S.current })); }
    catch (e) { S.storageBroken = true; }
  }
  S.save = function () { clearTimeout(saveTimer); saveTimer = setTimeout(write, 250); };
  S.flush = function () { if (saveTimer) { clearTimeout(saveTimer); write(); } };
  window.addEventListener('pagehide', S.flush);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') S.flush(); });
  S.char = function () { return S.current ? S.roster[S.current] : null; };
  S.add = function (c) { S.roster[c.id] = c; S.current = c.id; S.save(); return c; };
  S.select = function (id) { if (S.roster[id]) { S.current = id; S.save(); } };
  S.remove = function (id) { delete S.roster[id]; if (S.current === id) S.current = null; S.save(); };
  S.duplicate = function (id) { var c = clone(S.roster[id]); c.id = uid(); c.name = (c.name || 'Unnamed') + ' (copy)'; return S.add(c); };
  S.touch = function () { var c = S.char(); if (c) c.updated = Date.now(); S.save(); };
  S.list = function () {
    return Object.keys(S.roster).map(function (k) { return S.roster[k]; }).sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
  };

  S.exportJSON = function (c) {
    var out = clone(c); out.exported = new Date().toISOString(); out.app = 'Essence & Ascension Character Forge';
    return JSON.stringify(out, null, 2);
  };
  S.importJSON = function (text) {
    var c = JSON.parse(text);
    if (!c || typeof c !== 'object' || !c.stats || !c.essences) throw new Error('That file is not a Character Forge character.');
    delete c.exported; delete c.app;
    c.id = uid();
    R.STATS.forEach(function (k) { c.stats[k] = Math.max(1, Math.min(30, parseInt(c.stats[k], 10) || 10)); });
    return S.add(migrate(c));
  };

  S.newCharacter = newCharacter;
  S.fromStarter = fromStarter;
  S.newPlay = newPlay;
  S.clone = clone;
  EA.store = S;
})(window.EA = window.EA || {});
