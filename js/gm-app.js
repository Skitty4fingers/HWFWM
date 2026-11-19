/* Essence & Ascension — GM desk
 * gm-app.js: boot and hash routing (#encounter, #foes, #party, #awaken, #reference).
 */
(function (EA) {
  'use strict';
  var U = EA.ui, St = EA.store, G = EA.gm;
  var ROUTES = ['play', 'encounter', 'foes', 'party', 'awaken', 'reference', 'codex'];
  function fromHash() { var h = (location.hash || '').replace('#', ''); return ROUTES.indexOf(h) >= 0 ? h : 'play'; }
  document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('gm');
    St.load(); G.load();
    EA.codex.audience = 'gm';
    U.init(); U.stars();
    U.state.route = fromHash();
    window.addEventListener('hashchange', function () { U.modal = null; EA.codex.stack = []; U.state.route = fromHash(); U.render(); });
    window.addEventListener('storage', function (ev) { if (ev.key === 'ea-forge-v1') { St.load(); U.render(); } });
    U.renderNow();
    if (EA.sync) EA.sync.boot();
  });
})(window.EA = window.EA || {});
