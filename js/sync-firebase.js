/* Essence & Ascension — campaign sync
 * sync-firebase.js: the Firebase Realtime Database backend for sync.js.
 * Loads the bundled compat SDK on first use, so pages that never join a campaign never load it.
 *
 * Backend interface (shared with the test backend):
 *   init(cfg) -> Promise            signIn() -> Promise<uid>
 *   get(path) -> Promise<value>     set(path, v), update(path, obj), remove(path), push(path, v) -> Promise
 *   on(path, cb) -> off()           onLast(path, n, cb) -> off()      onConnected(cb) -> off()
 *   presence(path, value)           TS (server timestamp placeholder)
 */
(function (EA) {
  'use strict';
  var B = {}, app = null, db = null, auth = null;
  var FILES = ['js/vendor/firebase-app-compat.js', 'js/vendor/firebase-auth-compat.js', 'js/vendor/firebase-database-compat.js'];

  function load(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = ok; s.onerror = function () { fail(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }
  B.init = function (cfg) {
    if (app) return Promise.resolve();
    if (!cfg || !cfg.apiKey) return Promise.reject(new Error('The Firebase config is missing its apiKey.'));
    if (!cfg.databaseURL && cfg.projectId) cfg = Object.assign({}, cfg, { databaseURL: 'https://' + cfg.projectId + '-default-rtdb.firebaseio.com' });
    if (!cfg.databaseURL) return Promise.reject(new Error('The Firebase config has no databaseURL. Create the Realtime Database in the Firebase console, then copy the config again.'));
    var chain = window.firebase && window.firebase.database ? Promise.resolve() : FILES.reduce(function (p, f) { return p.then(function () { return load(f); }); }, Promise.resolve());
    return chain.then(function () {
      var fb = window.firebase;
      app = fb.apps.filter(function (a) { return a.name === 'ea'; })[0] || fb.initializeApp(cfg, 'ea');
      auth = app.auth(); db = app.database();
      B.TS = fb.database.ServerValue.TIMESTAMP;
    });
  };
  B.signIn = function () {
    return new Promise(function (ok, fail) {
      var off = auth.onAuthStateChanged(function (u) { if (u) { off(); ok(u.uid); } });
      if (!auth.currentUser) auth.signInAnonymously().catch(function (e) {
        off();
        fail(new Error(e && e.code === 'auth/operation-not-allowed' ? 'Anonymous sign-in is turned off. In the Firebase console open Authentication > Sign-in method and enable Anonymous.' : (e && e.message) || 'Sign-in failed.'));
      });
    });
  };
  function ref(p) { return db.ref(p); }
  B.get = function (p) { return ref(p).get().then(function (s) { return s.val(); }); };
  B.set = function (p, v) { return ref(p).set(v); };
  B.update = function (p, obj) { return ref(p).update(obj); };
  B.remove = function (p) { return ref(p).remove(); };
  B.push = function (p, v) { return ref(p).push(v); };
  function listen(q, cb, onErr) {
    var h = function (s) { cb(s.val()); };
    q.on('value', h, function (e) { if (onErr) onErr(e); });
    return function () { q.off('value', h); };
  }
  B.on = function (p, cb, onErr) { return listen(ref(p), cb, onErr); };
  B.onLast = function (p, n, cb, onErr) { return listen(ref(p).limitToLast(n), cb, onErr); };
  B.onConnected = function (cb) { return listen(ref('.info/connected'), function (v) { cb(!!v); }); };
  B.presence = function (p, value) { var r = ref(p); r.onDisconnect().remove(); return r.set(value); };
  B.offline = function () { if (db) db.goOffline(); };
  B.online = function () { if (db) db.goOnline(); };

  EA.syncBackends = EA.syncBackends || {};
  EA.syncBackends.firebase = B;
})(window.EA = window.EA || {});
