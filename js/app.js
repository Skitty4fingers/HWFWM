/* Essence & Ascension — Character Forge
 * app.js: boot and hash routing (#home, #forge, #play, #sheet).
 */
(function (EA) {
  'use strict';
  var U = EA.ui, St = EA.store;
  var ROUTES = ['home', 'forge', 'play', 'sheet', 'codex'];

  function fromHash() {
    var h = (location.hash || '').replace('#', '');
    if (ROUTES.indexOf(h) >= 0 && (h === 'home' || h === 'codex' || St.char())) return h;
    return St.char() ? 'forge' : 'home';
  }

  document.addEventListener('DOMContentLoaded', function () {
    St.load();
    U.init();
    U.stars();
    U.state.route = fromHash();
    window.addEventListener('hashchange', function () { U.modal = null; if (EA.codex) EA.codex.stack = []; U.state.route = fromHash(); U.render(); });
    U.renderNow();
    if (EA.sync) EA.sync.boot();
  });
})(window.EA = window.EA || {});

/* keep the active build step in view when the step rail scrolls sideways (narrow screens) */
(function (EA) {
  'use strict';
  EA.ui.afterRender = function () {
    var ol = document.querySelector('.steps ol'), cur = ol && ol.querySelector('[aria-current="step"]');
    if (ol && cur && ol.scrollWidth > ol.clientWidth) ol.scrollLeft = Math.max(0, cur.parentElement.offsetLeft - 24);
  };
})(window.EA = window.EA || {});
