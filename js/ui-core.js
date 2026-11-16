/* Essence & Ascension — Character Forge
 * ui-core.js: rendering loop, event delegation, data binding, modal, toast, dice, icons.
 */
(function (EA) {
  'use strict';
  var U = {};
  U.actions = {};      // name -> function(el, ev)
  U.views = {};        // route -> function() returns html
  U.modal = null;      // function() returns html, or null
  U.state = { route: 'home', step: 0, dieAnim: false };

  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  U.attr = U.esc;

  U.FAMILY_COLOR = {
    ARCANE: '#a98bff', ELEMENT: '#ff9356', BEAST: '#d4b04a', WARD: '#8fc2e6', WEAPON: '#dfe4ee', TOOL: '#c39a72',
    LIFE: '#62d9a0', BODY: '#ec7489', MOTION: '#7fe3f2', SHADOW: '#b27cf0', COSMIC: '#6fa8ff', MIXED: '#e9cf7a'
  };
  U.essColor = function (name) {
    var e = EA.data.essenceByName[name];
    return e ? U.FAMILY_COLOR[e.family] : 'var(--glow)';
  };
  U.dot = function (tag) {
    var t = { canon: 'From the novels', unverified: 'From the novels, details unconfirmed', derived: 'Invented to fill a gap', house: 'Game rule' }[tag] || '';
    return '<span class="dot dot-' + tag + '" title="' + t + '" aria-label="' + t + '"></span>';
  };

  U.icon = function (n) {
    var p = {
      save: '<path d="M5 3h11l3 3v15H5z M8 3v6h8V3 M8 21v-7h8v7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
      print: '<path d="M7 9V3h10v6 M7 17H4v-7h16v7h-3 M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
      people: '<circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6 M16 5.5a3 3 0 010 5.8 M18 14.5c1.8.8 3 2.8 3 5.5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
      close: '<path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.8"/>',
      d20: '<path d="M12 2l9 5.2v9.6L12 22l-9-5.2V7.2z M12 2l-5 9h10z M7 11l5 11 5-11 M3 7.2L7 11 M21 7.2L17 11 M3 16.8L7 11 M21 16.8L17 11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>',
      upload: '<path d="M12 16V4 M7 9l5-5 5 5 M4 20h16" fill="none" stroke="currentColor" stroke-width="1.7"/>',
      copy: '<rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" fill="none" stroke="currentColor" stroke-width="1.6"/>'
    }[n] || '';
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>';
  };

  // ---------- binding helpers ----------
  U.get = function (obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj); };
  U.set = function (obj, path, val) {
    var ks = path.split('.'), last = ks.pop();
    var o = ks.reduce(function (o2, k) { if (o2[k] == null) o2[k] = {}; return o2[k]; }, obj);
    o[last] = val;
  };

  // ---------- render loop with focus preservation ----------
  var raf = null;
  U.render = function () {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = null; U.renderNow(); });
  };
  U.renderNow = function () {
    var app = document.getElementById('app');
    var ae = document.activeElement, fkey = null, s0 = null, s1 = null;
    if (ae && ae !== document.body) {
      fkey = ae.getAttribute('data-key') || ae.getAttribute('data-bind');
      try { s0 = ae.selectionStart; s1 = ae.selectionEnd; } catch (e) { /* number inputs */ }
    }
    var scrolls = {};
    document.querySelectorAll('[data-scroll]').forEach(function (el) { scrolls[el.getAttribute('data-scroll')] = el.scrollTop; });
    var view = U.views[U.state.route] || U.views.home;
    app.innerHTML = view() + (U.modal ? '<div class="scrim" data-scroll="scrim" data-act="scrimClose">' + U.modal() + '</div>' : '') +
      (U.state.toast ? '<div class="toast" role="status">' + U.esc(U.state.toast) + '</div>' : '');
    document.querySelectorAll('[data-scroll]').forEach(function (el) {
      var k = el.getAttribute('data-scroll'); if (scrolls[k] != null) el.scrollTop = scrolls[k];
    });
    if (fkey) {
      var sel = '[data-key="' + fkey.replace(/"/g, '\\"') + '"],[data-bind="' + fkey.replace(/"/g, '\\"') + '"]';
      var el = app.querySelector(sel);
      if (el) {
        el.focus({ preventScroll: true });
        try { if (s0 != null) el.setSelectionRange(s0, s1); } catch (e) { /* ignore */ }
      }
    }
    if (U.afterRender) U.afterRender();
  };

  U.toast = function (msg) {
    U.state.toast = msg; U.render();
    clearTimeout(U._tt);
    U._tt = setTimeout(function () { U.state.toast = null; U.render(); }, 2600);
  };
  U.openModal = function (fn) { U.modal = fn; U.render(); };
  U.closeModal = function () { U.modal = null; U.render(); };

  // ---------- dice ----------
  U.d20 = function () {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint32Array(1), lim = Math.floor(4294967296 / 20) * 20;
      do { crypto.getRandomValues(a); } while (a[0] >= lim);
      return (a[0] % 20) + 1;
    }
    return 1 + Math.floor(Math.random() * 20);
  };
  U.dieSVG = function () {
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,3 93,27 93,73 50,97 7,73 7,27" fill="rgba(26,142,161,.25)" stroke="#7fe3f2" stroke-width="2"/>' +
      '<polygon points="50,18 80,66 20,66" fill="none" stroke="rgba(127,227,242,.55)" stroke-width="1.5"/>' +
      '<path d="M50 3L50 18M93 27L80 66M7 27L20 66M50 97L80 66M50 97L20 66M93 73L80 66M7 73L20 66" stroke="rgba(127,227,242,.35)" stroke-width="1.2"/></svg>';
  };

  // ---------- events ----------
  function onClick(ev) {
    var el = ev.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'scrimClose') { if (ev.target === el) U.closeModal(); return; }
    var fn = U.actions[act];
    if (fn) { ev.preventDefault(); fn(el, ev); }
  }
  function coerce(el) {
    var t = el.getAttribute('data-type');
    if (el.type === 'checkbox') return el.checked;
    if (t === 'int') { var v = parseInt(el.value, 10); return isNaN(v) ? 0 : v; }
    if (t === 'intnull') { return el.value === '' ? null : parseInt(el.value, 10); }
    return el.value;
  }
  function onInput(ev) {
    var el = ev.target;
    var bind = el.getAttribute('data-bind');
    if (bind) {
      var root = el.getAttribute('data-root') || 'char';
      var obj = root === 'char' ? EA.store.char() : U.roots[root] && U.roots[root]();
      if (!obj) return;
      U.set(obj, bind, coerce(el));
      if (root === 'char') EA.store.touch();
      if (U.onBind) U.onBind(root, bind);
      U.render();
      return;
    }
    var act = el.getAttribute('data-input');
    if (act && U.actions[act]) U.actions[act](el, ev);
  }
  U.roots = {};
  U.init = function () {
    document.addEventListener('click', onClick);
    document.addEventListener('input', function (ev) { if (ev.target.type !== 'checkbox' && ev.target.tagName !== 'SELECT') onInput(ev); });
    document.addEventListener('change', function (ev) { if (ev.target.type === 'checkbox' || ev.target.tagName === 'SELECT' || ev.target.type === 'file') onInput(ev); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && U.modal) U.closeModal(); });
  };

  // ---------- starfield (static, drawn once per resize) ----------
  U.stars = function () {
    var cv = document.getElementById('stars'); if (!cv) return;
    var ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    function draw() {
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      ctx.clearRect(0, 0, cv.width, cv.height);
      var n = Math.floor(innerWidth * innerHeight / 5200), seed = 7;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      for (var i = 0; i < n; i++) {
        var x = rnd() * cv.width, y = rnd() * cv.height, r = (rnd() * rnd() * 1.6 + 0.3) * dpr, a = 0.25 + rnd() * 0.6;
        ctx.fillStyle = rnd() > 0.92 ? 'rgba(233,207,122,' + a + ')' : 'rgba(200,235,255,' + a + ')';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    draw();
    var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(draw, 200); });
  };

  EA.ui = U;
})(window.EA = window.EA || {});
