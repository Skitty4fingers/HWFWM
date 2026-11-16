/* Essence & Ascension — Character Forge
 * sigil.js: the soul constellation. Three chosen essences on a triangle; the confluence condenses at the centre.
 */
(function (EA) {
  'use strict';
  var U = EA.ui;

  function nodePos(i) {
    var a = -Math.PI / 2 + i * (2 * Math.PI / 3);
    return [200 + 118 * Math.cos(a), 200 + 118 * Math.sin(a)];
  }

  /** essences: [name|''] x3, conf: {name,..}|null, opts: {condense, sealed, small} */
  EA.sigil = function (essences, conf, opts) {
    opts = opts || {};
    var esc = U.esc, parts = [];
    var filled = essences.filter(Boolean).length;
    parts.push('<defs>' +
      '<radialGradient id="sg-core" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6d6"/><stop offset=".35" stop-color="#e9cf7a"/><stop offset="1" stop-color="#c9a227" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="sg-halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#7fe3f2" stop-opacity=".28"/><stop offset="1" stop-color="#7fe3f2" stop-opacity="0"/></radialGradient>' +
      '<filter id="sg-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>');
    parts.push('<circle cx="200" cy="200" r="190" fill="url(#sg-halo)"/>');
    // orbit rings: rank steps are tick marks on the outer ring
    parts.push('<circle cx="200" cy="200" r="176" fill="none" stroke="rgba(127,227,242,.22)" stroke-width="1"/>');
    parts.push('<circle cx="200" cy="200" r="118" fill="none" stroke="rgba(127,227,242,.14)" stroke-width="1" stroke-dasharray="2 6"/>');
    for (var t = 0; t < 50; t++) {
      var a = -Math.PI / 2 + t * (2 * Math.PI / 50), big = t % 10 === 0;
      var r1 = big ? 168 : 172, r2 = 180;
      var on = opts.progress != null && t <= opts.progress;
      parts.push('<line x1="' + (200 + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (200 + r1 * Math.sin(a)).toFixed(1) + '" x2="' + (200 + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (200 + r2 * Math.sin(a)).toFixed(1) +
        '" stroke="' + (on ? '#e9cf7a' : 'rgba(127,227,242,.35)') + '" stroke-width="' + (big ? 2 : 1) + '"/>');
    }
    var pos = [0, 1, 2].map(nodePos);
    // threads between essences and into the core
    for (var i = 0; i < 3; i++) {
      var p = pos[i], q = pos[(i + 1) % 3];
      var both = essences[i] && essences[(i + 1) % 3];
      parts.push('<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] + '" stroke="' + (both ? 'rgba(127,227,242,.55)' : 'rgba(127,227,242,.15)') + '" stroke-width="1.2"/>');
      if (essences[i]) parts.push('<line class="thread" x1="' + p[0] + '" y1="' + p[1] + '" x2="200" y2="200" stroke="' + U.essColor(essences[i]) + '" stroke-opacity=".7" stroke-width="1.6"/>');
    }
    // core
    if (filled === 3 && !opts.sealed && conf) {
      parts.push('<g class="core" filter="url(#sg-glow)"><circle cx="200" cy="200" r="46" fill="url(#sg-core)"/><circle cx="200" cy="200" r="17" fill="#fff9e6"/>' +
        '<path d="M200 168 L206 194 L232 200 L206 206 L200 232 L194 206 L168 200 L194 194 Z" fill="#c9a227" opacity=".85"/></g>');
      if (!opts.small) parts.push('<text x="200" y="272" text-anchor="middle" font-family="Marcellus SC, serif" font-size="21" fill="#e9cf7a" stroke="#0e1340" stroke-width="6" paint-order="stroke" stroke-linejoin="round">' + esc(conf.name) + '</text>');
    } else {
      parts.push('<circle cx="200" cy="200" r="26" fill="none" stroke="rgba(233,207,122,.55)" stroke-dasharray="3 5" stroke-width="1.4"/>');
      if (!opts.small) parts.push('<text x="200" y="206" text-anchor="middle" font-family="Spectral, serif" font-style="italic" font-size="15" fill="rgba(233,207,122,.75)">' + (filled === 3 ? 'sealed' : (3 - filled) + ' to go') + '</text>');
    }
    // essence nodes
    for (var j = 0; j < 3; j++) {
      var n = essences[j], c = n ? U.essColor(n) : 'rgba(127,227,242,.5)', pp = pos[j];
      if (n) {
        parts.push('<g filter="url(#sg-glow)"><circle cx="' + pp[0] + '" cy="' + pp[1] + '" r="24" fill="' + c + '" fill-opacity=".22" stroke="' + c + '" stroke-width="2"/>' +
          '<circle cx="' + pp[0] + '" cy="' + pp[1] + '" r="7" fill="' + c + '"/></g>');
        if (!opts.small) {
          var ly = j === 0 ? pp[1] - 36 : pp[1] + 46;
          parts.push('<text x="' + pp[0] + '" y="' + ly + '" text-anchor="middle" font-family="Marcellus SC, serif" font-size="20" fill="#e7eaf6" stroke="#0e1340" stroke-width="5" paint-order="stroke" stroke-linejoin="round">' + esc(n) + '</text>');
        }
      } else {
        parts.push('<circle cx="' + pp[0] + '" cy="' + pp[1] + '" r="20" fill="rgba(11,15,46,.6)" stroke="' + c + '" stroke-dasharray="3 4" stroke-width="1.4"/>' +
          '<text x="' + pp[0] + '" y="' + (pp[1] + 6) + '" text-anchor="middle" font-family="Marcellus SC, serif" font-size="16" fill="rgba(127,227,242,.7)">' + (j + 1) + '</text>');
      }
    }
    var cls = 'sigil' + (opts.condense ? ' condense' : '');
    var label = 'Soul constellation: ' + (essences.filter(Boolean).join(', ') || 'no essences yet') + (conf && filled === 3 && !opts.sealed ? '; confluence ' + conf.name : '');
    return '<svg class="' + cls + '" viewBox="0 0 400 400" role="img" aria-label="' + esc(label) + '">' + parts.join('') + '</svg>';
  };

  EA.mark = function () {
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="#7fe3f2" stroke-opacity=".5"/>' +
      '<path d="M20 5 L33 27.5 L7 27.5 Z" fill="none" stroke="#7fe3f2" stroke-width="1.3"/>' +
      '<circle cx="20" cy="5" r="2.6" fill="#ff9356"/><circle cx="33" cy="27.5" r="2.6" fill="#62d9a0"/><circle cx="7" cy="27.5" r="2.6" fill="#a98bff"/>' +
      '<circle cx="20" cy="20" r="4.2" fill="#e9cf7a"/></svg>';
  };
})(window.EA = window.EA || {});
