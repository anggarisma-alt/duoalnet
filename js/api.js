'use strict';
/**
 * DUO AL NET — Lapisan API (js/api.js)
 * fetch → GAS REST (/exec) dengan timeout, retry, reqId idempoten, SWR cache perangkat, warm-up ping.
 * Content-Type text/plain agar tidak memicu CORS preflight.
 */

// ── Pengukur performa: ketik Perf.table() di Console browser ──
const Perf = {
  rows: [],
  add(action, total, server) {
    this.rows.push({ action: action, total: total, server: server == null ? null : server, net: server != null ? total - server : null, at: Date.now() });
    if (this.rows.length > 200) this.rows.shift();
  },
  table() { console.table(this.rows.slice(-30)); }
};

// ── Cache perangkat (per user + versi skema) ──
const LS_PREFIX = 'duoalnet:v2:';
function userKey(k) { return 'u:' + (typeof S !== 'undefined' && S.user ? S.user.id_user : 'anon') + ':' + k; }
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }
const Store = {
  get(k, d) { try { const v = localStorage.getItem(LS_PREFIX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) {
    const s = JSON.stringify(v);
    try { localStorage.setItem(LS_PREFIX + k, s); }
    catch (e) { // kuota penuh → buang cache user lain, coba sekali lagi
      try { Object.keys(localStorage).filter(x => x.indexOf(LS_PREFIX + 'u:') === 0 && x.indexOf(LS_PREFIX + userKey('')) !== 0).forEach(x => localStorage.removeItem(x)); localStorage.setItem(LS_PREFIX + k, s); } catch (e2) { /* tetap jalan tanpa cache */ }
    }
  },
  del(k) { try { localStorage.removeItem(LS_PREFIX + k); } catch (e) {} },
  /** Hapus semua cache DATA milik user aktif (dipanggil setelah menulis / logout) */
  clearData() {
    try { const pre = LS_PREFIX + userKey('d:'); Object.keys(localStorage).filter(x => x.indexOf(pre) === 0).forEach(x => localStorage.removeItem(x)); } catch (e) {}
  }
};

// ── Fetch dengan timeout + retry ──
const READ_ACTIONS = /^(me|ping|batch|dashboard|laporan|.+\.(list|data|riwayat|get))$/;
function waitOnline(ms) {
  return new Promise(r => {
    if (navigator.onLine !== false) return r();
    const t = setTimeout(done, ms);
    function done() { clearTimeout(t); removeEventListener('online', done); r(); }
    addEventListener('online', done);
  });
}
async function apiOnce(action, data, timeout, reqId) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeout), t0 = performance.now();
  try {
    const res = await fetch(GAS_URL, { method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: (typeof S !== 'undefined' && S.token) || '', reqId: reqId, data: data || {} }) });
    const text = await res.text();
    try { const j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms); if (j.sys && typeof applySys === 'function') applySys(j.sys); return j; }
    catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429, message: 'Server membalas HTTP ' + res.status + ' (bukan JSON). Periksa URL & deployment Apps Script.' }; }
  } catch (err) {
    return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi terputus.' };
  } finally { clearTimeout(timer); }
}
/** Mengembalikan objek respons mentah {success, data, message, ...}; tidak pernah melempar. */
async function rawApi(action, data, opt) {
  opt = opt || {};
  if (typeof GAS_URL === 'undefined' || GAS_URL.indexOf('GANTI') >= 0) return { success: false, network: true, message: 'GAS_URL belum diisi di js/config.js.' };
  const isRead = READ_ACTIONS.test(action);
  const reqId = isRead ? '' : (opt.reqId || (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random()));
  const tries = isRead ? 3 : 2; // tulis aman di-retry karena reqId sama (idempoten di server)
  let res;
  for (let i = 0; i < tries; i++) {
    if (i) { await new Promise(r => setTimeout(r, 1200 * i)); if (navigator.onLine === false) await waitOnline(15000); }
    res = await apiOnce(action, data, isRead ? (i ? 40000 : 25000) : 90000, reqId);
    if (res.success || !res.retryable) break;
  }
  if (!res.success && res.data && res.data.code === 'AUTH' && action !== 'login' && typeof sessionExpired === 'function' && S.user) sessionExpired(res.message);
  return res;
}
/** Versi praktis: mengembalikan data atau melempar Error. Tulis sukses → bersihkan cache data. */
async function api(action, data, opt) {
  const res = await rawApi(action, data, opt);
  if (!res.success) { const e = new Error(res.message || 'Terjadi kesalahan.'); e.res = res; throw e; }
  if (!READ_ACTIONS.test(action)) Store.clearData();
  return res.data;
}

/** SWR: tampilkan cache perangkat seketika; segarkan di latar bila sudah lewat batas kesegaran. */
async function getData(action, payload, opt) {
  opt = opt || {};
  payload = payload || {};
  const key = userKey('d:' + action + (Object.keys(payload).length ? ':' + hashStr(JSON.stringify(payload)) : ''));
  const c = Store.get(key, null), fresh = opt.fresh == null ? 60000 : opt.fresh;
  if (c) {
    if (opt.force || Date.now() - c.t >= fresh) {
      rawApi(action, payload).then(res => {
        if (!res.success) return;
        const h = hashStr(JSON.stringify(res.data));
        Store.set(key, { t: Date.now(), h: h, data: res.data });
        if (h !== c.h && opt.onFresh) opt.onFresh(res.data);
      });
    }
    return c.data;
  }
  const data = await api(action, payload);
  Store.set(key, { t: Date.now(), h: hashStr(JSON.stringify(data)), data: data });
  return data;
}

/** Bangunkan server GAS (cold start) tanpa menunggu hasilnya */
function warmUpServer() {
  if (typeof GAS_URL === 'undefined' || GAS_URL.indexOf('GANTI') >= 0) return;
  fetch(GAS_URL + '?ping=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
}
