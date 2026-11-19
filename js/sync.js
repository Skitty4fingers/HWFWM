/* Essence & Ascension — campaign sync
 * sync.js: shares characters, the fight and rolls between the GM and players through a backend
 * (sync-firebase.js in production). Local storage stays the working copy; this layer diffs it
 * against what was last sent and writes only what changed, field by field.
 *
 * Database layout under campaigns/{cid}:
 *   meta      { name, gm, created, v }                         GM writes; members read
 *   members   { uid: { role, name, joined } }                  each member writes their own
 *   presence  { uid: { name, role, at } }                      removed on disconnect
 *   chars     { id: { owner, build: json, play: { key: json }, updated } }   owner or GM writes
 *   pub       { enc: json, at }                                GM writes the players' view of the fight
 *   rolls     { pushId: { uid, who, j: json, at } }            any member appends
 *   gm        { state: json, table: json }                     GM only (foes, encounter, notes, secret rolls)
 */
(function (EA) {
  'use strict';
  var U = EA.ui, R = EA.rules, St = EA.store, esc = U.esc, act = U.actions;
  var KEY = 'ea-sync-v1';
  var S = EA.sync = { status: 'off', error: '', cid: null, role: null, uid: null, meta: null, members: {}, presence: {}, chars: {}, owner: {}, pub: null, rolls: [] };
  var local = { cfg: null, active: null, activeGM: null, campaigns: {}, name: '' };
  function AK() { return EA.gm ? 'activeGM' : 'active'; }
  var B = null, offs = [], sent = {}, sentPub = null, sentGm = null, sentTable = null, pending = null, connected = false;

  // ---------- local settings ----------
  function loadLocal() { try { local = Object.assign(local, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* defaults */ } }
  function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(local)); } catch (e) { /* blocked */ } }
  S.config = function () { return EA.FIREBASE_CONFIG || local.cfg; };
  S.ready = function () { return !!(S.cid && S.uid && (S.status === 'online' || S.status === 'offline')); };
  S.isGM = function () { return S.ready() && S.role === 'gm'; };
  S.displayName = function () { return local.name || ''; };
  function backend() { return (EA.syncBackends || {})[window.EA_SYNC_BACKEND || 'firebase']; }
  function path(p) { return 'campaigns/' + S.cid + (p ? '/' + p : ''); }
  function newId() {
    var a = new Uint8Array(15), abc = 'abcdefghjkmnpqrstuvwxyz23456789', out = '';
    crypto.getRandomValues(a); for (var i = 0; i < a.length; i++) out += abc[a[i] % abc.length];
    return out;
  }
  function b64(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return JSON.parse(decodeURIComponent(escape(atob(s)))); }
  /** Read the config from the console snippet, a JSON object, or a bare object literal. */
  S.parseConfig = function (text) {
    var m = String(text || '').match(/\{[\s\S]*\}/); if (!m) throw new Error('Paste the firebaseConfig object from the Firebase console.');
    var js = m[0].replace(/\/\/.*$/gm, '').replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":').replace(/'([^']*)'/g, '"$1"').replace(/,\s*}/g, '}');
    var o = JSON.parse(js);
    if (!o.apiKey || !o.projectId) throw new Error('That config has no apiKey or projectId.');
    return o;
  };

  // ---------- encoding ----------
  function encodeChar(c) {
    var b = {}, play = {};
    Object.keys(c).forEach(function (k) { if (k !== 'play') b[k] = c[k]; });
    Object.keys(c.play || {}).forEach(function (k) { if (c.play[k] !== undefined) play[k] = JSON.stringify(c.play[k]); });
    return { build: JSON.stringify(b), play: play };
  }
  function decodeChar(v) {
    var c = JSON.parse(v.build || '{}'); c.play = {};
    Object.keys(v.play || {}).forEach(function (k) { try { c.play[k] = JSON.parse(v.play[k]); } catch (e) { /* skip */ } });
    if (!Object.keys(c.play).length) c.play = St.newPlay();
    return c;
  }
  function liveChar(id) { return St.roster[id] || S.chars[id] || null; }
  S.liveChar = liveChar;
  function canWrite(id) { return S.role === 'gm' || S.owner[id] === S.uid || (!S.owner[id] && St.roster[id]); }

  // ---------- outgoing ----------
  S.flushChar = function (c, updates) {
    if (!c || c.campaign !== S.cid || !canWrite(c.id)) return;
    var e = encodeChar(c), last = sent[c.id], base = 'chars/' + c.id;
    if (!last) { updates[base] = { owner: S.owner[c.id] || S.uid, build: e.build, play: e.play, updated: B.TS }; S.owner[c.id] = S.owner[c.id] || S.uid; sent[c.id] = { build: e.build, play: Object.assign({}, e.play) }; return; }
    var n = 0;
    if (e.build !== last.build) { updates[base + '/build'] = e.build; last.build = e.build; n++; }
    Object.keys(e.play).forEach(function (k) { if (e.play[k] !== last.play[k]) { updates[base + '/play/' + k] = e.play[k]; last.play[k] = e.play[k]; n++; } });
    Object.keys(last.play).forEach(function (k) { if (!(k in e.play)) { updates[base + '/play/' + k] = null; delete last.play[k]; n++; } });
    if (n) updates[base + '/updated'] = B.TS;
  };
  /** Public view of the fight for players: order, turn, the party's numbers, foes as a condition word. */
  S.pubEncounter = function () {
    var G = EA.gm; if (!G || !G.state.enc) return null;
    var e = G.state.enc, tm = G.tickMode(e), cur = e.started && !tm ? G.current(e) : null;
    var order = e.started || e.combatants.some(function (x) { return x.init != null; }) ? G.order(e) : e.combatants;
    function cond(x) {
      var Sx = G.sheet(x), f = Sx.pool.HP.dMax ? x.c.play.hp / Sx.pool.HP.dMax : 0;
      return x.c.play.hp <= 0 ? 'down' : f > 0.75 ? 'unhurt' : f > 0.5 ? 'hurt' : f > 0.25 ? 'bloodied' : 'near death';
    }
    return { name: e.name, started: e.started, tm: tm, round: e.round, tick: e.tick, current: cur ? cur.id : null,
      ready: tm && e.started ? G.readyNow(e).map(function (x) { return x.id; }) : [],
      combatants: order.map(function (x) { return { id: x.id, name: x.name, side: x.side, link: x.link || null, init: x.init, anchor: x.anchor, rd: x.rd, cond: cond(x), affs: x.side === 'foes' ? x.c.play.afflictions.map(function (a) { return a.type; }) : [] }; }),
      log: e.log.slice(0, 20) };
  };
  S.flush = function () {
    pending = null;
    if (!S.ready() || !B) return;
    var updates = {};
    St.list().forEach(function (c) { if (c.campaign === S.cid) S.flushChar(c, updates); });
    if (S.role === 'gm' && EA.gm) {
      Object.keys(S.chars).forEach(function (id) { S.flushChar(S.chars[id], updates); });
      var pub = JSON.stringify(S.pubEncounter());
      if (pub !== sentPub) { updates.pub = { enc: pub, at: B.TS }; sentPub = pub; }
      if (EA.gm) { var gs = JSON.stringify(EA.gm.state); if (gs !== sentGm) { updates['gm/state'] = gs; sentGm = gs; } }
      if (EA.tt) { var ts = JSON.stringify(EA.tt.state.gm); if (ts !== sentTable) { updates['gm/table'] = ts; sentTable = ts; } }
    }
    if (Object.keys(updates).length) B.update(path(), updates).catch(fail);
  };
  S.scheduleFlush = function () { if (!S.ready()) return; clearTimeout(pending); pending = setTimeout(S.flush, 300); };
  U.afterRenderHooks.push(S.scheduleFlush);
  window.addEventListener('pagehide', function () { if (pending) { clearTimeout(pending); S.flush(); } });

  // ---------- incoming ----------
  function applyChars(all) {
    all = all || {};
    var changed = false;
    Object.keys(all).forEach(function (id) {
      var v = all[id]; if (!v || !v.build) return;
      S.owner[id] = v.owner;
      var remotePlay = v.play || {}, c = liveChar(id), last = sent[id];
      if (!c) {
        c = decodeChar(v);
        if (v.owner === S.uid) St.roster[c.id] = c; else S.chars[id] = c;
        sent[id] = { build: v.build, play: Object.assign({}, remotePlay) };
        changed = true; return;
      }
      if (!last) last = sent[id] = { build: null, play: {} };
      var cur = encodeChar(c);
      if (v.build !== last.build) {
        if (last.build === null || cur.build === last.build) {
          var nb = JSON.parse(v.build);
          Object.keys(c).forEach(function (k) { if (k !== 'play' && !(k in nb)) delete c[k]; });
          Object.keys(nb).forEach(function (k) { if (k !== 'play') c[k] = nb[k]; });
          changed = true;
        }
        last.build = v.build;
      }
      c.play = c.play || {};
      var keys = {}; Object.keys(remotePlay).forEach(function (k) { keys[k] = 1; }); Object.keys(last.play).forEach(function (k) { keys[k] = 1; });
      Object.keys(keys).forEach(function (k) {
        var rv = remotePlay[k];
        if (rv === last.play[k]) return;
        if (cur.play[k] === last.play[k] || last.play[k] === undefined) {   // no unsent local change on this field
          if (rv === undefined) delete c.play[k]; else { try { c.play[k] = JSON.parse(rv); } catch (e) { /* skip */ } }
          changed = true;
        }
        if (rv === undefined) delete last.play[k]; else last.play[k] = rv;
      });
    });
    // removed from the campaign
    Object.keys(S.chars).forEach(function (id) { if (!all[id]) { delete S.chars[id]; delete sent[id]; changed = true; } });
    St.list().forEach(function (c) {
      if (c.campaign === S.cid && sent[c.id] && !all[c.id]) { c.campaign = null; delete sent[c.id]; changed = true; U.toast((c.name || 'A character') + ' is no longer in the campaign.'); }
    });
    if (changed) { St.save(); relink(); U.render(); }
  }
  function relink() {
    var G = EA.gm; if (!G || !G.state.enc) return;
    G.state.enc.combatants.forEach(function (x) { if (x.link) { var c = liveChar(x.link); if (c) x.c = c; } });
  }
  S.relink = relink;
  function fail(e) {
    var msg = (e && e.message) || String(e);
    if (/permission/i.test(msg)) msg = 'The database refused access. Check that the rules from database.rules.json are published, and that this link is for a campaign that still exists.';
    S.error = msg; U.toast(msg); U.render();
  }

  // ---------- connect ----------
  function teardown() { offs.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); offs = []; sent = {}; sentPub = sentGm = sentTable = null; S.chars = {}; S.owner = {}; S.members = {}; S.presence = {}; S.rolls = []; S.pub = null; S.meta = null; }
  function start() {
    B = backend();
    if (!B) return Promise.reject(new Error('The sync backend did not load.'));
    var cfg = S.config(); if (!cfg) return Promise.reject(new Error('No Firebase config yet.'));
    S.status = 'connecting'; S.error = ''; U.render();
    return B.init(cfg).then(function () { return B.signIn(); }).then(function (uid) { S.uid = uid; return uid; });
  }
  function subscribe(role) {
    S.role = role;
    var gm = role === 'gm';
    var first = gm ? Promise.all([B.get(path('gm/state')), B.get(path('gm/table'))]) : Promise.resolve([null, null]);
    return first.then(function (got) {
      if (gm && EA.gm) {
        if (got[0]) { try { var gs = JSON.parse(got[0]); EA.gm.state.foes = gs.foes || {}; EA.gm.state.party = gs.party || {}; EA.gm.state.enc = gs.enc || EA.gm.newEncounter(); sentGm = got[0]; EA.gm.save(); } catch (e) { /* keep local */ } }
        if (got[1] && EA.tt) { try { EA.tt.state.gm = Object.assign(EA.tt.state.gm, JSON.parse(got[1])); sentTable = got[1]; EA.tt.save(); } catch (e) { /* keep local */ } }
      }
      offs.push(B.onConnected(function (on) { connected = on; S.status = on ? 'online' : 'offline'; if (on) B.presence(path('presence/' + S.uid), { name: local.name || (gm ? 'GM' : 'Player'), role: role, at: B.TS }); U.render(); }));
      offs.push(B.on(path('meta'), function (v) { S.meta = v; if (v) { local.campaigns[S.cid] = { name: v.name, role: v.gm === S.uid ? 'gm' : 'player' }; saveLocal(); } U.render(); }, fail));
      offs.push(B.on(path('members'), function (v) { S.members = v || {}; U.render(); }, fail));
      offs.push(B.on(path('presence'), function (v) { S.presence = v || {}; U.render(); }, fail));
      offs.push(B.on(path('chars'), applyChars, fail));
      offs.push(B.on(path('pub'), function (v) { try { S.pub = v && v.enc ? JSON.parse(v.enc) : null; } catch (e) { S.pub = null; } U.render(); }, fail));
      offs.push(B.onLast(path('rolls'), 60, function (v) {
        var list = Object.keys(v || {}).map(function (k) { var r = v[k]; try { return Object.assign({ key: k, uid: r.uid, who: r.who, at: r.at }, JSON.parse(r.j)); } catch (e) { return null; } }).filter(Boolean);
        S.rolls = list.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
        U.render();
      }, fail));
      S.status = connected ? 'online' : 'offline';
      relink(); S.scheduleFlush(); U.render();
    });
  }
  S.connect = function (cid, role) {
    teardown(); S.cid = cid;
    return start().then(function () { return B.get(path('members/' + S.uid)).catch(function () { return null; }); }).then(function (m) {
      if (!m) throw new Error('This device is not a member of that campaign. Use the invite link again.');
      local[AK()] = cid; saveLocal();
      return subscribe(EA.gm ? (m.role || role) : 'player');
    }).catch(function (e) { S.status = 'error'; fail(e); });
  };
  S.create = function (name) {
    teardown();
    return start().then(function () {
      S.cid = newId();
      var up = {};
      up.meta = { name: name || 'Campaign', gm: S.uid, created: B.TS, v: 1 };
      up['members/' + S.uid] = { role: 'gm', name: local.name || 'GM', joined: B.TS };
      return B.update(path(), up);
    }).then(function () {
      local[AK()] = S.cid; local.campaigns[S.cid] = { name: name, role: 'gm' }; saveLocal();
      return subscribe('gm');
    }).then(function () { U.toast('Campaign created. Share the invite link with your players.'); })
      .catch(function (e) { S.status = 'error'; S.cid = null; fail(e); });
  };
  S.join = function (cid, name, charIds) {
    teardown(); S.cid = cid;
    if (name) { local.name = name; saveLocal(); }
    return start().then(function () {
      return B.get(path('members/' + S.uid)).catch(function () { return null; });
    }).then(function (m) {
      if (m) return m;
      return B.set(path('members/' + S.uid), { role: 'player', name: local.name || 'Player', joined: B.TS }).then(function () { return { role: 'player' }; });
    }).then(function (m) {
      local[AK()] = cid; saveLocal();
      (charIds || []).forEach(function (id) { if (St.roster[id]) St.roster[id].campaign = cid; });
      St.save();
      return subscribe(EA.gm ? m.role : 'player');
    }).then(function () { U.toast('Joined ' + ((S.meta && S.meta.name) || 'the campaign') + '.'); })
      .catch(function (e) { S.status = 'error'; fail(e); });
  };
  S.disconnect = function () {
    if (B && S.uid && S.cid) B.remove(path('presence/' + S.uid)).catch(function () { /* offline */ });
    teardown(); S.cid = null; S.uid = null; S.status = 'off'; local[AK()] = null; saveLocal(); U.render();
  };
  S.bring = function (c, on) {
    if (on) { c.campaign = S.cid; St.save(); S.scheduleFlush(); U.render(); return; }
    var id = c.id; c.campaign = null; delete sent[id]; St.save();
    if (S.ready()) B.remove(path('chars/' + id)).catch(fail);
    U.render();
  };
  var origRemove = St.remove;
  St.remove = function (id) {
    var c = St.roster[id];
    if (c && c.campaign && c.campaign === S.cid && S.ready()) B.remove(path('chars/' + id)).catch(function () { /* offline */ });
    origRemove(id);
  };
  S.inviteLink = function () {
    var base = location.href.replace(/#.*$/, '').replace(/[^/]*$/, '');
    return base + 'adventurer.html#join=' + S.cid + (EA.FIREBASE_CONFIG ? '' : '&cfg=' + b64(S.config()));
  };

  // ---------- rolls ----------
  /** Share a roll with the table. r is a table-tools roll object, optionally with meta. */
  S.shareRoll = function (r, who) {
    if (!S.ready()) return;
    var j = Object.assign({}, r); delete j.at;
    B.push(path('rolls'), { uid: S.uid, who: who || local.name || (S.role === 'gm' ? 'GM' : 'Player'), j: JSON.stringify(j), at: B.TS }).catch(fail);
  };
  S.clearRolls = function () { if (S.isGM()) B.remove(path('rolls')).catch(fail); };
  S.gmRun = function (c) {
    return !!(S.ready() && c && c.campaign === S.cid && S.pub && S.pub.started && S.pub.combatants.some(function (x) { return x.link === c.id; }));
  };
  S.myCombatant = function (c) { return S.pub && c ? S.pub.combatants.filter(function (x) { return x.link === c.id; })[0] : null; };

  // ---------- UI ----------
  U.syncChip = function () {
    var st = S.status, a = local[AK()], name = S.meta ? S.meta.name : (a && local.campaigns[a] ? local.campaigns[a].name : '');
    var label = st === 'off' ? 'Play offline' : st === 'connecting' ? 'Connecting…' : st === 'error' ? 'Campaign: problem' : (name || 'Campaign') + (st === 'offline' ? ' (reconnecting)' : '');
    return '<button class="syncchip s-' + st + '" data-act="syncOpen" title="Campaign and sharing"><i></i>' + esc(label) + '</button>';
  };
  function membersHTML() {
    var ids = Object.keys(S.members);
    if (!ids.length) return '<p class="small quiet">Nobody has joined yet.</p>';
    return '<ul class="xlist">' + ids.map(function (id) {
      var m = S.members[id], on = !!S.presence[id];
      return '<li><span class="pdot' + (on ? ' on' : '') + '"></span>' + esc(m.name || 'Unnamed') + ' <span class="small quiet">' + (m.role === 'gm' ? 'GM' : 'player') + (id === S.uid ? ', this device' : '') + (on ? '' : ', away') + '</span></li>';
    }).join('') + '</ul>';
  }
  function charsHTML() {
    var mine = St.list();
    if (!mine.length) return '<p class="small quiet">You have no characters on this device yet. Make one in the Forge, then bring it here.</p>';
    return mine.map(function (c) {
      var inIt = c.campaign === S.cid;
      return '<div class="spread" style="margin-bottom:6px"><span>' + esc(c.name || 'Unnamed') + ' <span class="small quiet">' + R.rankName(c.rank, c.rs) + (c.campaign && !inIt ? ', in another campaign' : '') + '</span></span>' +
        '<button class="btn sm' + (inIt ? '' : ' primary') + '" data-act="syncBring" data-id="' + c.id + '" data-on="' + (inIt ? 0 : 1) + '">' + (inIt ? 'Take out' : 'Bring to the table') + '</button></div>';
    }).join('');
  }
  function syncModal() {
    var gmPage = !!EA.gm, st = S.status, cfg = S.config(), body = '';
    var nameRow = '<label class="f"><span>Your name at the table</span><input type="text" data-input="syncName" data-key="syncname" value="' + esc(local.name) + '" placeholder="' + (gmPage ? 'GM' : 'Your name') + '"></label>';
    if (!cfg) {
      body = '<p>Paste your Firebase web app config. It is in the Firebase console under Project settings, Your apps, SDK setup and configuration.</p>' +
        '<textarea data-input="syncCfg" data-key="synccfg" placeholder="const firebaseConfig = { apiKey: ..., ... }" style="min-height:140px">' + esc(U.state.syncCfg || '') + '</textarea>' +
        '<div class="row" style="margin-top:10px"><button class="btn primary" data-act="syncSaveCfg">Save config</button></div>';
    } else if (S.cid && st !== 'error') {
      var gm = S.role === 'gm';
      body = '<p class="quiet small" style="margin:0">' + (gm ? 'You are the GM' : 'You are a player') + ' • ' + (st === 'online' ? 'connected' : st === 'offline' ? 'offline, changes will sync when you reconnect' : 'connecting') + '</p>' +
        (gm ? '<label class="f" style="margin-top:12px"><span>Invite link for your players</span><input type="text" readonly value="' + esc(S.inviteLink()) + '" data-key="synclink" onfocus="this.select()"></label><div class="row"><button class="btn sm primary" data-act="syncCopy">Copy the link</button><span class="small quiet">Anyone with this link can join as a player.</span></div>' : '') +
        nameRow + '<h3>At the table</h3>' + membersHTML() +
        (!gm || St.list().length ? '<h3>Your characters</h3>' + charsHTML() : '') +
        (gm ? '<p class="small quiet">Players’ characters appear on your Party and Play pages as they bring them. In a fight, damage and afflictions you apply land on their sheets.</p>' : '<p class="small quiet">Your GM sees the characters you bring, and changes made by either of you reach the other within a second.</p>') +
        '<hr class="rule"><div class="row">' + (gm ? '<button class="btn sm" data-act="syncClearRolls">Clear the shared rolls</button>' : '') + '<button class="btn sm danger" data-act="syncLeave">Disconnect this device</button></div>';
    } else {
      var known = Object.keys(local.campaigns).filter(function (k) { return gmPage ? local.campaigns[k].role === 'gm' : true; });
      body = (S.error ? '<p class="small" style="color:var(--bad)">' + esc(S.error) + '</p>' : '') + nameRow +
        (gmPage ? '<h3>Start a campaign</h3><div class="row"><input type="text" data-input="syncNewName" data-key="syncnew" value="' + esc(U.state.syncNewName || '') + '" placeholder="Campaign name" style="flex:1;min-width:180px"><button class="btn primary" data-act="syncCreate">Create</button></div><p class="small quiet">Your foes, encounter, notes and trackers move into the campaign. Only you can read them.</p>'
          : '<h3>Join a campaign</h3><div class="row"><input type="text" data-input="syncJoinLink" data-key="syncjoin" value="' + esc(U.state.syncJoinLink || '') + '" placeholder="Paste the invite link from your GM" style="flex:1;min-width:200px"><button class="btn primary" data-act="syncJoinPaste">Join</button></div>') +
        (known.length ? '<h3>Reconnect</h3>' + known.map(function (k) { return '<div class="spread" style="margin-bottom:6px"><span>' + esc(local.campaigns[k].name || k) + '</span><button class="btn sm" data-act="syncReconnect" data-cid="' + k + '">Connect</button></div>'; }).join('') : '');
    }
    return '<div class="modal" style="width:min(620px,100%)" role="dialog" aria-modal="true" aria-label="Campaign"><div class="panel"><button class="iconbtn x" data-act="closeModal" aria-label="Close">' + U.icon('close') + '</button>' +
      '<h2>' + esc(S.meta ? S.meta.name : 'Campaign') + '</h2>' + body + '</div></div>';
  }
  function joinModal() {
    var j = U.state.syncPendingJoin, mine = St.list();
    return '<div class="modal" style="width:min(560px,100%)" role="dialog" aria-modal="true" aria-label="Join a campaign"><div class="panel"><button class="iconbtn x" data-act="closeModal" aria-label="Close">' + U.icon('close') + '</button>' +
      '<h2>Join the campaign</h2><p class="lede">Your GM invited you. Choose a name and the characters to bring to the table. You can bring or take out characters later.</p>' +
      '<label class="f"><span>Your name at the table</span><input type="text" data-input="syncName" data-key="syncname" value="' + esc(local.name) + '" placeholder="Your name"></label>' +
      (mine.length ? mine.map(function (c) { var on = j.chars[c.id]; return '<label class="small" style="display:block;margin-bottom:6px"><input type="checkbox" data-act="syncJoinPick" data-id="' + c.id + '"' + (on ? ' checked' : '') + '> ' + esc(c.name || 'Unnamed') + ' <span class="quiet">' + R.rankName(c.rank, c.rs) + '</span></label>'; }).join('') : '<p class="small quiet">No characters on this device yet. Join now and bring one after you make it.</p>') +
      '<div class="row" style="margin-top:14px"><button class="btn primary" data-act="syncJoinGo">Join</button><button class="btn" data-act="closeModal">Not now</button></div></div></div>';
  }
  act.syncOpen = function () { U.openModal(syncModal); };
  act.syncName = function (el) { local.name = el.value.slice(0, 40); saveLocal(); };
  act.syncCfg = function (el) { U.state.syncCfg = el.value; };
  act.syncSaveCfg = function () { try { local.cfg = S.parseConfig(U.state.syncCfg); saveLocal(); U.toast('Config saved.'); U.render(); } catch (e) { U.toast(e.message); } };
  act.syncNewName = function (el) { U.state.syncNewName = el.value; };
  act.syncCreate = function () { S.create((U.state.syncNewName || '').trim() || 'Campaign').then(function () { U.render(); }); };
  act.syncCopy = function () {
    var link = S.inviteLink();
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { U.toast('Invite link copied.'); }, function () { U.toast('Select the link and copy it.'); });
    else U.toast('Select the link and copy it.');
  };
  act.syncLeave = function () { S.disconnect(); U.closeModal(); U.toast('Disconnected. Your local copies stay on this device.'); };
  act.syncReconnect = function (el) { var cid = el.getAttribute('data-cid'); S.connect(cid, local.campaigns[cid].role); };
  act.syncBring = function (el) { var c = St.roster[el.getAttribute('data-id')]; if (c) S.bring(c, el.getAttribute('data-on') === '1'); };
  act.syncClearRolls = function () { S.clearRolls(); U.toast('Shared rolls cleared.'); };
  act.syncJoinLink = function (el) { U.state.syncJoinLink = el.value; };
  act.syncJoinPaste = function () {
    var parsed = parseJoin(U.state.syncJoinLink || '');
    if (!parsed) return U.toast('That does not look like an invite link.');
    if (parsed.cfg && !EA.FIREBASE_CONFIG) { local.cfg = parsed.cfg; saveLocal(); }
    U.state.syncPendingJoin = { cid: parsed.cid, chars: {} }; U.openModal(joinModal);
  };
  act.syncJoinPick = function (el) { var j = U.state.syncPendingJoin, id = el.getAttribute('data-id'); j.chars[id] = !j.chars[id]; U.render(); };
  act.syncJoinGo = function () {
    var j = U.state.syncPendingJoin; U.closeModal();
    S.join(j.cid, local.name, Object.keys(j.chars).filter(function (k) { return j.chars[k]; }));
  };
  function parseJoin(text) {
    var m = String(text).match(/join=([a-z0-9]{10,40})(?:&cfg=([A-Za-z0-9_-]+))?/);
    if (!m) { var bare = String(text).trim(); return /^[a-z0-9]{10,40}$/.test(bare) ? { cid: bare } : null; }
    var out = { cid: m[1] };
    if (m[2]) { try { out.cfg = unb64(m[2]); } catch (e) { /* ignore */ } }
    return out;
  }

  // ---------- shared panels ----------
  function rollRow(r, gm) {
    var who = '<b class="who">' + esc(r.who || '?') + '</b>';
    var body = EA.tt ? EA.tt.rollHTML(Object.assign({}, r, { at: r.at ? new Date(r.at).toTimeString().slice(0, 5) : '' }), gm) : esc(r.total);
    var resolve = gm && r.meta && r.meta.char && r.meta.slot && EA.gm && EA.gm.state.enc.combatants.some(function (x) { return x.link === r.meta.char; }) ?
      '<button class="btn sm primary" data-act="syncResolve" data-key="' + esc(r.key) + '">Resolve</button>' : '';
    return '<div class="feedrow">' + who + body + resolve + '</div>';
  }
  S.feedHTML = function (gm, n) {
    if (!S.ready()) return '';
    var list = S.rolls.slice(0, n || 25);
    return '<section class="panel"><div class="spread"><h3 style="margin:0">Table feed</h3><span class="small quiet">' + Object.keys(S.presence).length + ' online</span></div>' +
      '<p class="small quiet" style="margin:4px 0 8px">' + (gm ? 'Everyone’s rolls. Resolve an ability roll to apply it without charging its cost twice.' : 'Rolls from everyone at the table.') + '</p>' +
      '<div class="thist" data-scroll="feed">' + (list.length ? list.map(function (r) { return rollRow(r, gm); }).join('') : '<p class="small quiet">No rolls yet.</p>') + '</div></section>';
  };
  /** The player's view of a GM-run fight. */
  S.tableHTML = function (c) {
    if (!S.ready()) return '';
    var e = S.pub, me = S.myCombatant(c);
    var fight = '';
    if (e && e.combatants.length) {
      var now = !e.started ? 'The GM is setting up ' + esc(e.name || 'a fight') + '.' : e.tm ? 'Round ' + e.round + ', Tick ' + e.tick + '.' : 'Round ' + e.round + '.';
      var mine = me && e.started ? (e.tm ? (e.ready.indexOf(me.id) >= 0 ? '<span class="chip on">You are ready for a Major</span>' : '<span class="chip">Next Major at Tick ' + me.rd + '</span>') : (e.current === me.id ? '<span class="chip on">Your turn</span>' : '<span class="chip">Waiting</span>')) : '';
      fight = '<p style="margin:6px 0">' + now + ' ' + mine + '</p><ol class="order">' + e.combatants.map(function (x) {
        var cur = e.started && (e.tm ? e.ready.indexOf(x.id) >= 0 : e.current === x.id);
        var live = x.link ? liveChar(x.link) : null, hp = '';
        if (live && live.play) { var Sx = R.computeSheet(live); hp = '<span class="small quiet">' + R.fmt(live.play.hp) + ' / ' + R.fmt(Sx.pool.HP.dMax) + '</span>'; }
        else if (x.side === 'foes') hp = '<span class="small quiet">' + esc(x.cond) + (x.affs.length ? ', ' + esc(x.affs.map(function (a) { return a.replace(' (status)', ''); }).join(', ')) : '') + '</span>';
        return '<li class="' + x.side + (cur ? ' now' : '') + (x.cond === 'down' ? ' down' : '') + (me && x.id === me.id ? ' me' : '') + '"><span>' + (x.init != null ? '<b>' + x.init + '</b> ' : '') + esc(x.name) + '</span>' + hp + '</li>';
      }).join('') + '</ol>';
    } else fight = '<p class="small quiet" style="margin:6px 0">No fight yet.</p>';
    return '<section class="panel tablepanel"><div class="spread"><h3 style="margin:0">' + esc(S.meta ? S.meta.name : 'The table') + '</h3><span class="small quiet">' + Object.keys(S.presence).length + ' online</span></div>' + fight +
      (c.campaign !== S.cid ? '<div class="row" style="margin-top:8px"><span class="small quiet">' + esc(c.name || 'This character') + ' is not at the table.</span><button class="btn sm primary" data-act="syncBring" data-id="' + c.id + '" data-on="1">Bring to the table</button></div>' : '') + '</section>';
  };
  act.syncResolve = function (el) {
    var r = S.rolls.filter(function (x) { return x.key === el.getAttribute('data-key'); })[0]; if (!r || !EA.gm) return;
    var e = EA.gm.state.enc, x = e.combatants.filter(function (y) { return y.link === r.meta.char; })[0]; if (!x) return;
    if (U.gmOpenAct) U.gmOpenAct(x, r.meta.slot, r.natural, r.meta.edge || 0, true);
  };

  // dice-tray rolls go to the table too (the GM's Secret roll keeps theirs private)
  if (EA.tt) EA.tt.onPush = function (ns, r) {
    if (!S.ready()) return;
    if (ns === 'player') { var c = St.char(); if (!c || c.campaign !== S.cid) return; S.shareRoll(r, c.name || local.name || 'Player'); }
    else if (S.role === 'gm') S.shareRoll(r, local.name || 'GM');
  };

  // ---------- boot ----------
  loadLocal();
  /** An invite link in the address bar: join (or reconnect) instead of routing. */
  function handleJoinHash() {
    var h = location.hash || '';
    if (!/^#join=/.test(h)) return false;
    var parsed = parseJoin(h);
    try { history.replaceState(null, '', location.pathname + location.search + '#home'); } catch (e) { /* ignore */ }
    U.state.route = 'home';
    if (!parsed) return false;
    if (parsed.cfg && !EA.FIREBASE_CONFIG) { local.cfg = parsed.cfg; saveLocal(); }
    if (local.active === parsed.cid && local.campaigns[parsed.cid]) { if (S.cid !== parsed.cid) S.connect(parsed.cid, 'player'); U.render(); return true; }
    U.state.syncPendingJoin = { cid: parsed.cid, chars: {} };
    if (St.char()) U.state.syncPendingJoin.chars[St.char().id] = true;
    setTimeout(function () { U.openModal(joinModal); }, 50);
    return true;
  }
  window.addEventListener('hashchange', function () { if (!EA.gm) setTimeout(handleJoinHash, 0); });
  S.boot = function () {
    if (!EA.gm && handleJoinHash()) return;
    var a = local[AK()];
    if (a && local.campaigns[a]) S.connect(a, EA.gm ? 'gm' : 'player');
  };
})(window.EA = window.EA || {});
