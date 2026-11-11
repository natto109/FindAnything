/* =====================================================================
   Find Number — Multiplayer network layer (ใช้ร่วมกัน: หน้าจอแสดงผล + มือถือผู้เล่น)
   ---------------------------------------------------------------------
   ตั้งค่า Firebase ตรงนี้ที่เดียว
   - ใช้ Realtime Database ของโปรเจกต์ deecrab-game00
   - ข้อมูลเกมทั้งหมดอยู่ใต้ path /findNumber (ต้องเพิ่ม rules ให้ path นี้)
   - ถ้ามี config เต็ม (apiKey ฯลฯ) จาก Firebase Console วางแทนได้เลย
   ทดสอบในเครื่องเดียวโดยไม่ต่อ Firebase: เติม ?mock=1 ท้าย URL ทั้งสองหน้า
   ===================================================================== */
window.FN_FIREBASE = {
  projectId: "deecrab-game00",
  databaseURL: "https://deecrab-game00-default-rtdb.asia-southeast1.firebasedatabase.app"
};
window.FN_ROOT = "findNumber";

window.FNNet = {
  async connect() {
    const mock = new URLSearchParams(location.search).get('mock') === '1';
    return mock ? this._mock() : this._firebase();
  },

  async _firebase() {
    const V = '10.12.2';
    const fa = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
    const fd = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`);
    const app = fa.initializeApp(window.FN_FIREBASE, 'fn-' + Math.random().toString(36).slice(2));
    const db = fd.getDatabase(app);
    const R = p => fd.ref(db, window.FN_ROOT + (p ? '/' + p : ''));
    const api = {
      offset: 0,
      now() { return Date.now() + this.offset; },
      on(p, cb) { return fd.onValue(R(p), s => cb(s.val())); },
      get(p) { return fd.get(R(p)).then(s => s.val()); },
      set(p, v) { return fd.set(R(p), v); },
      update(p, o) { return fd.update(R(p), o); },
      remove(p) { return fd.remove(R(p)); }
    };
    fd.onValue(fd.ref(db, '.info/serverTimeOffset'), s => { api.offset = s.val() || 0; });
    return api;
  },

  /* In-browser mock (same browser, many tabs) for testing without Firebase */
  _mock() {
    const KEY = 'fnmock.tree';
    const ch = ('BroadcastChannel' in window) ? new BroadcastChannel('fnmock') : null;
    let tree = {};
    try { tree = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    const subs = [];
    const split = p => (window.FN_ROOT + (p ? '/' + p : '')).split('/').filter(Boolean);
    const getAt = parts => { let n = tree; for (const k of parts) { if (n == null || typeof n !== 'object') return null; n = n[k]; } return n === undefined ? null : n; };
    const clean = v => (v == null ? null : JSON.parse(JSON.stringify(v)));
    const setAt = (parts, v) => {
      if (!parts.length) { tree = v || {}; return; }
      let n = tree;
      for (let i = 0; i < parts.length - 1; i++) { if (n[parts[i]] == null || typeof n[parts[i]] !== 'object') n[parts[i]] = {}; n = n[parts[i]]; }
      const last = parts[parts.length - 1];
      if (v == null) delete n[last]; else n[last] = clean(v);
    };
    const notify = () => subs.forEach(s => { const v = clean(getAt(s.parts)); const j = JSON.stringify(v); if (j !== s.last) { s.last = j; s.cb(v); } });
    const commit = () => { localStorage.setItem(KEY, JSON.stringify(tree)); if (ch) ch.postMessage(1); notify(); };
    const reload = () => { try { tree = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {} notify(); };
    if (ch) ch.onmessage = reload;
    window.addEventListener('storage', e => { if (e.key === KEY) reload(); });
    const api = {
      offset: 0, mock: true,
      now() { return Date.now(); },
      on(p, cb) { const s = { parts: split(p), cb, last: undefined }; subs.push(s); setTimeout(() => { const v = clean(getAt(s.parts)); s.last = JSON.stringify(v); cb(v); }, 0); return () => subs.splice(subs.indexOf(s), 1); },
      async get(p) { return clean(getAt(split(p))); },
      async set(p, v) { setAt(split(p), v); commit(); },
      async update(p, o) { const base = split(p); for (const k in o) setAt(base.concat(k.split('/').filter(Boolean)), o[k]); commit(); },
      async remove(p) { setAt(split(p), null); commit(); }
    };
    return Promise.resolve(api);
  }
};

/* ---------- shared helpers (board generation must match on every phone) ---------- */
window.FNCore = {
  rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
  shuffle(arr, r) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  /* sequence of targets everyone must find (same for all players) */
  sequence(cfg) {
    let seq = Array.from({ length: cfg.count }, (_, i) => i + 1);
    if (cfg.mode === 'reverse') seq.reverse();
    if (cfg.mode === 'command') seq = this.shuffle(seq, this.rng(cfg.seed ^ 0x5bd1e995)).slice(0, Math.min(cfg.rounds || 10, cfg.count));
    return seq;
  },
  imgUrl(name) { return 'img/' + encodeURIComponent(name); },
  esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
};
