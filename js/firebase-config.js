/* Essence & Ascension — campaign sync
 * firebase-config.js: your Firebase web app config. Paste it here once and commit, and every
 * campaign link works without carrying the config. Leave it null to paste it in the app instead
 * (it then travels inside the invite link).
 *
 * Firebase console > Project settings > Your apps > Web app > SDK setup and configuration > Config.
 * It must include databaseURL (create the Realtime Database first). This config is not a secret:
 * access is controlled by database.rules.json.
 *
 * Example:
 * EA.FIREBASE_CONFIG = {
 *   apiKey: "AIza...",
 *   authDomain: "your-project.firebaseapp.com",
 *   databaseURL: "https://your-project-default-rtdb.firebaseio.com",
 *   projectId: "your-project",
 *   appId: "1:1234567890:web:abcdef"
 * };
 */
(function (EA) {
  'use strict';
  EA.FIREBASE_CONFIG = EA.FIREBASE_CONFIG || {
    apiKey: 'AIzaSyBVWZ0EqqoGT7dX6MqNzPvB8PfsYzQIuHM',
    authDomain: 'hwfwm-54ecc.firebaseapp.com',
    // Default address for a Realtime Database created in us-central1. If you created it in another
    // region, copy the URL shown at the top of the Realtime Database page here instead.
    databaseURL: 'https://hwfwm-54ecc-default-rtdb.firebaseio.com',
    projectId: 'hwfwm-54ecc',
    storageBucket: 'hwfwm-54ecc.firebasestorage.app',
    messagingSenderId: '72184661974',
    appId: '1:72184661974:web:b88040a353ed3bba444677'
  };
})(window.EA = window.EA || {});
