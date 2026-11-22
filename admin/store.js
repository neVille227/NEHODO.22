/* NEHODO.22admin — stockage des plans dans ce navigateur (IndexedDB) */
(function () {
  'use strict';
  var DB_NAME = 'nehodo22admin', DB_VERSION = 1;
  var dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('IndexedDB indisponible')); return; }
      var rq = indexedDB.open(DB_NAME, DB_VERSION);
      rq.onupgradeneeded = function () {
        var db = rq.result;
        if (!db.objectStoreNames.contains('plans')) db.createObjectStore('plans', { keyPath: 'id' });
      };
      rq.onsuccess = function () { resolve(rq.result); };
      rq.onerror = function () { reject(rq.error); };
    });
    return dbp;
  }

  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction('plans', mode), s = t.objectStore('plans'), out = fn(s);
        t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : undefined); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  window.AdminStore = {
    list: function () { return tx('readonly', function (s) { return s.getAll(); }); },
    put: function (plan) { return tx('readwrite', function (s) { return s.put(plan); }); },
    remove: function (id) { return tx('readwrite', function (s) { return s.delete(id); }); },
    replaceAll: function (arr) {
      return tx('readwrite', function (s) { s.clear(); arr.forEach(function (p) { s.put(p); }); });
    }
  };
})();
