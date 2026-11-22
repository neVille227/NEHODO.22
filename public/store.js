/* NEHODO.22 — stockage des plans
   - Visiteurs : lecture de plans-data.js
   - Admin (même navigateur) : plans enregistrés dans IndexedDB, utilisés en priorité une fois modifiés */
(function () {
  'use strict';
  var DB_NAME = 'nehodo22', DB_VERSION = 1;
  var dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('IndexedDB indisponible')); return; }
      var rq = indexedDB.open(DB_NAME, DB_VERSION);
      rq.onupgradeneeded = function () {
        var db = rq.result;
        if (!db.objectStoreNames.contains('plans')) db.createObjectStore('plans', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      };
      rq.onsuccess = function () { resolve(rq.result); };
      rq.onerror = function () { reject(rq.error); };
    });
    return dbp;
  }

  function tx(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode), s = t.objectStore(store), out = fn(s);
        t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : undefined); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  function idbAll() { return tx('plans', 'readonly', function (s) { return s.getAll(); }); }
  function touched() { return tx('meta', 'readonly', function (s) { return s.get('touched'); }); }
  function markTouched() { return tx('meta', 'readwrite', function (s) { return s.put(true, 'touched'); }); }

  function base() { return (window.NEHODO_PLANS || []).slice(); }

  var Store = {
    /* liste utilisée par le site */
    list: function () {
      return touched().then(function (t) { return t ? idbAll() : base(); }).catch(function () { return base(); });
    },
    /* ouvre l'espace admin : copie plans-data.js dans le navigateur la première fois */
    adminList: function () {
      return touched().then(function (t) {
        if (t) return idbAll();
        var b = base();
        if (!b.length) return b;
        return Store.replaceAll(b).then(function () { return b; });
      });
    },
    put: function (plan) { return markTouched().then(function () { return tx('plans', 'readwrite', function (s) { return s.put(plan); }); }); },
    remove: function (id) { return markTouched().then(function () { return tx('plans', 'readwrite', function (s) { return s.delete(id); }); }); },
    replaceAll: function (arr) {
      return markTouched().then(function () {
        return tx('plans', 'readwrite', function (s) { s.clear(); arr.forEach(function (p) { s.put(p); }); });
      });
    }
  };
  window.NehodoStore = Store;
})();
