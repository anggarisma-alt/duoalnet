/**
 * ============================================================
 * DUO AL NET — Frontend inti (js/core.js)
 * SPA statis di GitHub Pages. Router hash (#/halaman), data via REST (js/api.js).
 * ============================================================
 */
'use strict';

// ════════════════════════════════════════════════════════
// BAGIAN 1: STATE, KONSTANTA, UTILITAS
// ════════════════════════════════════════════════════════
const S = { token: null, user: null, settings: {}, kategori: [], page: null, nav: 0, data: {}, ui: {}, charts: {},
  printer: { dev: null, char: null, name: '' } };

const NAV = {
  Admin: [ { id: 'dashboard', i: 'bi-grid-1x2', l: 'Dashboard' }, { id: 'bayar', i: 'bi-receipt', l: 'Bayar' }, { id: 'pelanggan', i: 'bi-people', l: 'Pelanggan' }, { id: 'odp', i: 'bi-diagram-3', l: 'ODP' }, { id: 'lainnya', i: 'bi-three-dots', l: 'Lainnya' } ],
  Owner: [ { id: 'dashboard', i: 'bi-grid-1x2', l: 'Dashboard' }, { id: 'laporan', i: 'bi-graph-up-arrow', l: 'Laporan' }, { id: 'lainnya', i: 'bi-three-dots', l: 'Lainnya' } ],
  Kasir: [ { id: 'bayar', i: 'bi-receipt', l: 'Bayar' }, { id: 'cetakulang', i: 'bi-printer', l: 'Cetak Ulang' }, { id: 'pengaturan', i: 'bi-sliders', l: 'Setelan' }, { id: 'lainnya', i: 'bi-three-dots', l: 'Lainnya' } ]
};
const TITLES = { dashboard: 'Dashboard', bayar: 'Pembayaran', pelanggan: 'Data Pelanggan', odp: 'Titik ODP', cetakulang: 'Cetak Ulang Struk', pengeluaran: 'Pengeluaran', laporan: 'Laporan Keuangan', pengaturan: 'Pengaturan Printer & Struk', user: 'Kelola User' };
const isAdminLvl = () => !!S.user && (S.user.hak_akses === 'Admin' || S.user.hak_akses === 'Super Admin');
const isSuper = () => !!S.user && S.user.hak_akses === 'Super Admin';
/** Saklar sistem (diatur Super Admin). Super Admin selalu melihat fitur-fiturnya. */
const massalOn = () => S.settings.bayar_massal !== '0' || isSuper();
const generateOn = () => S.settings.tampil_generate_tagihan !== '0' || isSuper();
/** Sinkronisasi saklar sistem: server menyertakan status terbaru di setiap jawaban; S.sys menyimpan yang terbaru. */
const WA_AKTIVASI = { tampil: '0895-2785-0069', intl: '6289527850069' };
/** Pemberitahuan saat tagihan otomatis dihentikan. Pengguna biasa diarahkan menghubungi WA; Super Admin ke Kontrol Sistem. */
function autoBillNotice(style) {
  const isi = isSuper()
    ? '<strong>Tagihan otomatis sedang dihentikan.</strong> Nyalakan kembali di Lainnya → Kontrol Sistem.'
    : '<strong>Tagihan otomatis sedang dihentikan.</strong> Hubungi WA : <a href="https://wa.me/' + WA_AKTIVASI.intl + '" target="_blank" rel="noopener" style="color:inherit;font-weight:700;text-decoration:underline">' + WA_AKTIVASI.tampil + '</a> untuk aktivasi kembali.';
  return '<div class="alert-x alert-warn" style="' + (style || '') + '"><i class="bi bi-pause-circle-fill"></i><div>' + isi + '</div></div>';
}
const SYS_KEYS = ['tagihan_otomatis', 'tampil_generate_tagihan', 'bayar_massal', 'cetak_ulang_massal'];
const MIN_BACKEND = '2.1';
function mergeSettings(s) { S.settings = Object.assign({}, s, S.sys || {}); } // data lama (cache) tidak boleh menimpa saklar yang lebih baru
function applySys(sys) {
  if (!S.user || !sys) return;
  let changed = false;
  S.sys = S.sys || {};
  SYS_KEYS.forEach(k => {
    if (sys[k] === undefined) return;
    S.sys[k] = sys[k];
    if (S.settings[k] !== sys[k]) { S.settings[k] = sys[k]; changed = true; }
    if (S.ui && S.ui.setSaved) S.ui.setSaved[k] = sys[k];
  });
  if (changed) onSysChanged();
}
function onSysChanged() {
  if (S.page === 'sistem') return; // Super Admin yang mengubahnya sendiri
  toast('Pengaturan sistem diperbarui.', 'warn');
  if (document.querySelector('.modal.show') || S.page === 'pengaturan') return; // jangan mengganggu formulir yang sedang dibuka
  if (S.page === 'bayar' && S.ui.bayar) {
    if (!massalOn()) { const tb = $('#bayarTabs'); if (tb) tb.remove(); if (S.ui.bayar.tab === 'massal') { S.ui.bayar.tab = 'satuan'; renderBayar(); } return; }
    if (S.ui.bayar.sel) return; // sedang memproses pelanggan; tampil lengkap saat membuka ulang
  }
  go(S.page, { noPush: true });
}
function syncSys(force) {
  if (!S.user) return;
  const now = Date.now();
  if (!force && now - (S.sysAt || 0) < 8000) return;
  S.sysAt = now; rawApi('sys.get', {}); // jawabannya membawa `sys` → applySys
}
function verLess(a, b) { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0); } return false; }
function checkBackend(v) {
  const b = $('#verBanner'); if (!b) return;
  if (verLess(v || '1.0', MIN_BACKEND)) { b.style.display = ''; b.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i><div><strong>Backend Apps Script belum diperbarui</strong> (versi ' + esc(v || 'lama') + ', dibutuhkan ' + MIN_BACKEND + '). Tempel <code>Kode.gs</code> terbaru lalu <em>Deploy → Manage deployments → ✏️ → New version → Deploy</em>. Sebelum itu saklar sistem tidak akan berfungsi.</div>'; }
  else b.style.display = 'none';
}
const cetakMassalOn = () => S.settings.cetak_ulang_massal !== '0' || isSuper();
const autoBillOn = () => S.settings.tagihan_otomatis !== '0';
const PAGE_ROLES = { dashboard: ['Admin', 'Owner'], bayar: ['Admin', 'Kasir'], pelanggan: ['Admin'], odp: ['Admin'], cetakulang: ['Admin', 'Kasir'], pengeluaran: ['Admin'], laporan: ['Admin', 'Owner'], pengaturan: ['Admin', 'Kasir'], user: ['Admin'] };
Object.keys(PAGE_ROLES).forEach(k => { if (PAGE_ROLES[k].indexOf('Admin') >= 0) PAGE_ROLES[k].push('Super Admin'); });
PAGE_ROLES.sistem = ['Super Admin'];
NAV['Super Admin'] = NAV.Admin;
TITLES.sistem = 'Kontrol Sistem';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
function esc(v) { return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function rp(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
function rpShort(n) { n = Number(n) || 0; return n >= 1e6 ? 'Rp ' + (n / 1e6).toFixed(2).replace('.', ',') + 'jt' : rp(n); }
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function bulanLabel(b) { const m = String(b).match(/^(\d{4})-(\d{2})/); return m ? BLN[+m[2] - 1] + ' ' + m[1] : b; }
function bulanShort(b) { const m = String(b).match(/^(\d{4})-(\d{2})/); return m ? BLN[+m[2] - 1].slice(0, 3) + ' ' + m[1].slice(2) : b; }
function tglID(s) { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : s; }
function tglPanjang(s) { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return s; const d = new Date(+m[1], +m[2] - 1, +m[3]); return ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getDay()] + ', ' + (+m[3]) + ' ' + BLN[+m[2] - 1] + ' ' + m[1]; }
function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function initials(n) { const p = String(n).trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
function debounce(fn, ms) { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms || 200); }; }
function digits(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function numInput(v) { return Number(digits(v)) || 0; }

/** Tombol sibuk: cegah klik ganda + tampilkan spinner */
async function withBusy(btn, fn) {
  if (!btn || btn.disabled) return;
  const old = btn.innerHTML; btn.disabled = true;
  btn.innerHTML = '<span class="spinner-inline"></span> Memproses...';
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = old; }
}

// ════════════════════════════════════════════════════════
// BAGIAN 2: UI HELPER (toast, modal, tema)
// ════════════════════════════════════════════════════════
function toast(msg, type) {
  const ico = { ok: 'bi-check-circle-fill', err: 'bi-x-octagon-fill', warn: 'bi-exclamation-triangle-fill' }[type || 'ok'] || 'bi-info-circle-fill';
  const el = document.createElement('div');
  el.className = 'toast-x ' + (type || 'ok'); el.setAttribute('role', 'status');
  el.innerHTML = '<i class="bi ' + ico + '"></i><span>' + esc(msg) + '</span>';
  $('#toastWrap').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, type === 'err' ? 5500 : 3200);
}
let _onHide = null;
function openModal(o) {
  const el = $('#appModal');
  $('#appModalTitle').textContent = o.title || '';
  $('#appModalBody').innerHTML = o.body || '';
  const f = $('#appModalFooter'); f.innerHTML = o.footer || ''; f.style.display = o.footer ? '' : 'none';
  $('#appModalDialog').className = 'modal-dialog modal-dialog-centered modal-dialog-scrollable' + (o.size ? ' modal-' + o.size : '');
  _onHide = o.onHide || null;
  bootstrap.Modal.getOrCreateInstance(el).show();
}
function closeModal() { const m = bootstrap.Modal.getInstance($('#appModal')); if (m) m.hide(); }
document.addEventListener('hidden.bs.modal', () => { const cb = _onHide; _onHide = null; if (cb) cb(); });
/** Konfirmasi (promise<boolean>) */
function confirmBox(title, msg, okLabel, danger) {
  return new Promise(resolve => {
    let done = false;
    const fin = v => { if (!done) { done = true; resolve(v); } };
    openModal({ title: title, body: '<p class="mb-0">' + msg + '</p>',
      footer: '<button class="btn-s btn-sm" data-bs-dismiss="modal">Batal</button><button class="' + (danger ? 'btn-d' : 'btn-p') + ' btn-sm" id="cfmOk">' + esc(okLabel || 'Ya, lanjut') + '</button>',
      onHide: () => fin(false) });
    $('#cfmOk').onclick = () => { fin(true); closeModal(); };
  });
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const ic = $('#themeIcon'); if (ic) ic.className = 'bi ' + (t === 'dark' ? 'bi-sun' : 'bi-moon-stars');
  const mc = document.querySelector('meta[name=theme-color]'); if (mc) mc.content = t === 'dark' ? '#06122B' : '#F3F7FE';
}
function toggleDarkMode() {
  const n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(n); try { localStorage.setItem('dan_theme', n); } catch (e) {}
  if (S.page === 'dashboard') renderCharts();
}
function skeleton() {
  return '<div class="page"><div class="skel" style="height:140px;margin-top:8px"></div><div class="grid-kpi mt-3"><div class="skel" style="height:130px"></div><div class="skel" style="height:130px"></div></div><div class="skel mt-3" style="height:180px"></div></div>';
}
function emptyBox(icon, msg) { return '<div class="empty"><i class="bi ' + icon + '"></i>' + esc(msg) + '</div>'; }
function chipStatusBayar(p) { return p ? '<span class="badge-x b-ok"><i class="bi bi-check-circle"></i> Lunas</span>' : '<span class="badge-x b-bad"><i class="bi bi-clipboard2-x"></i> Belum Lunas</span>'; }
function odpBadge(o) {
  if (o.persen >= 100) return '<span class="badge-x b-bad"><i class="bi bi-exclamation-triangle"></i> Penuh 100%</span>';
  if (o.persen >= 80) return '<span class="badge-x b-warn">' + o.persen + '% Hampir Penuh</span>';
  return '<span class="badge-x b-ok"><i class="bi bi-circle-fill" style="font-size:7px"></i> ' + o.persen + '% ' + (o.persen < 40 ? 'Tersedia' : 'Normal') + '</span>';
}
function barClass(p) { return p >= 100 ? 'bad' : p >= 80 ? 'warn' : 'ok'; }

// ════════════════════════════════════════════════════════
// BAGIAN 3: AUTENTIKASI & SHELL
// ════════════════════════════════════════════════════════
function hideLoading() { const o = $('#loadingOverlay'); if (o) { o.style.opacity = '0'; setTimeout(() => { o.style.display = 'none'; }, 300); } }

/** Avatar berwarna: warna ditentukan dari inisial (konsisten untuk orang yang sama) */
const AVA_COLORS = ['#2563EB', '#0891B2', '#6366F1', '#DB2777', '#D97706', '#16A34A', '#9333EA'];
function paintAvatars() {
  $$('.ava:not([data-p])').forEach(el => {
    el.dataset.p = '1';
    if (el.querySelector('i')) return; // avatar ikon tetap biru merek
    let h = 0; const t = el.textContent;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    el.style.setProperty('--ava-fg', AVA_COLORS[h % AVA_COLORS.length]);
  });
}
document.addEventListener('DOMContentLoaded', () => {
  new MutationObserver(paintAvatars).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', () => { if (S.user) { const p = pageFromHash(); if (p) go(p, { noPush: true }); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') S.hiddenAt = Date.now(); else { if (S.hiddenAt && Date.now() - S.hiddenAt > 120000) warmUpServer(); syncSys(true); } });
  let th = 'light';
  try { th = localStorage.getItem('dan_theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) {}
  applyTheme(th);
  let tk = null; try { tk = localStorage.getItem('dan_token'); } catch (e) {}
  if (!tk) { showLogin(); return; }
  S.token = tk; warmUpServer();
  rawApi('me').then(r => {
    if (r.success) afterLogin(r.data);
    else { if (!(r.data && r.data.code === 'AUTH')) { showLogin(); toast(r.message || 'Tidak dapat terhubung ke server.', 'err'); } }
  });
});

function showLogin() {
  S.token = null; S.user = null;
  $('#appHeader').style.display = 'none'; $('#mainNav').style.display = 'none';
  $('#mainContent').classList.add('no-nav');
  $('#app-container').innerHTML =
    '<div class="login-wrap"><div class="login-bg" aria-hidden="true"><i style="--d:0s"></i><i style="--d:2s"></i><i style="--d:4s"></i><i style="--d:6s"></i></div>' +
    '<div class="login-card">' +
    '<img class="login-logo" src="img/logo.webp" alt="DUO AL NET" width="250" height="154">' +
    '<p class="login-tag">Kelola pelanggan, tagihan, dan struk dalam satu aplikasi.</p>' +
    '<form id="loginForm" autocomplete="on" onsubmit="handleLogin(event)">' +
    '<div class="fld"><label for="lgNama">Nama user</label><input class="inp" id="lgNama" name="username" autocomplete="username" autocapitalize="none" required></div>' +
    '<div class="fld"><label for="lgPass">Password</label><div class="search-box"><input class="inp" style="padding-left:14px" id="lgPass" name="password" type="password" autocomplete="current-password" required>' +
    '<button type="button" class="icon-btn clr" aria-label="Tampilkan password" onclick="const i=$(\'#lgPass\');i.type=i.type===\'password\'?\'text\':\'password\';this.firstChild.className=\'bi \'+(i.type===\'password\'?\'bi-eye\':\'bi-eye-slash\')"><i class="bi bi-eye"></i></button></div></div>' +
    '<button class="btn-p btn-block" style="min-height:52px" type="submit"><i class="bi bi-box-arrow-in-right"></i> Masuk</button>' +
    (GAS_URL.indexOf('GANTI') >= 0 ? '<div class="alert-x alert-bad mt-3"><i class="bi bi-exclamation-triangle-fill"></i><div><strong>GAS_URL belum diisi.</strong> Buka <code>js/config.js</code> dan isi URL /exec Apps Script.</div></div>' : '') +
    '</form></div></div>';
  hideLoading();
}
async function handleLogin(ev) {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type=submit]');
  const nama = $('#lgNama').value, pw = $('#lgPass').value;
  await withBusy(btn, async () => {
    const r = await rawApi('login', { nama: nama, password: pw });
    if (r.success) afterLogin(r.data); else toast(r.message, 'err');
  });
}
function pageFromHash() {
  const m = location.hash.match(/^#\/(\w+)/), p = m && m[1];
  return p && PAGE_ROLES[p] && S.user && PAGE_ROLES[p].indexOf(S.user.hak_akses) >= 0 ? p : null;
}
function afterLogin(d) {
  S.token = d.token; S.user = d.user; S.settings = d.settings; S.kategori = d.kategori || [];
  S.sys = {}; SYS_KEYS.forEach(k => { if (d.settings[k] !== undefined) S.sys[k] = d.settings[k]; });
  S.sysAt = Date.now(); // saklar baru saja diterima bersama login
  checkBackend(d.versi);
  if (!S.sysTimer) S.sysTimer = setInterval(() => { if (document.visibilityState !== 'hidden') syncSys(true); }, 45000);
  try { localStorage.setItem('dan_token', d.token); } catch (e) {}
  // Data layar pertama datang bersama login → simpan ke cache perangkat (tanpa panggilan kedua)
  if (d.boot && d.boot.data) Store.set(userKey('d:' + d.boot.action), { t: Date.now(), h: hashStr(JSON.stringify(d.boot.data)), data: d.boot.data });
  $('#appHeader').style.display = 'flex'; $('#mainNav').style.display = 'flex';
  $('#mainContent').classList.remove('no-nav');
  $('#roleChip').textContent = d.user.hak_akses;
  $('#avatarBtn').textContent = initials(d.user.nama_user);
  S.nav = 0; S.data = {}; S.ui = {};
  go(pageFromHash() || (d.user.hak_akses === 'Kasir' ? 'bayar' : 'dashboard'), { noPush: false });
  hideLoading();
  prefetchIdle();
  if (d.pwDefault) setTimeout(() => ubahPasswordSaya(true), 700); // paksa pengingat selama password bawaan belum diganti
}
/** Prefetch menu yang sering dibuka dalam SATU panggilan saat browser idle */
function prefetchIdle() {
  const calls = isAdminLvl() ? ['bayar.data', 'pelanggan.list', 'odp.list', 'keluar.list'] : S.user.hak_akses === 'Kasir' ? ['struk.riwayat'] : [];
  if (!calls.length) return;
  const run = () => rawApi('batch', { calls: calls.map(a => ({ action: a })) }).then(res => {
    if (!res.success) return;
    Object.keys(res.data).forEach(a => { const r = res.data[a]; if (r && r.success) Store.set(userKey('d:' + a), { t: Date.now(), h: hashStr(JSON.stringify(r.data)), data: r.data }); });
  });
  (window.requestIdleCallback || setTimeout)(run, 1500);
}
function sessionExpired(msg) {
  try { localStorage.removeItem('dan_token'); } catch (e) {}
  showLogin(); toast(msg || 'Sesi berakhir.', 'warn');
}
function handleLogout() {
  closeModal();
  const t = S.token;
  try { localStorage.removeItem('dan_token'); } catch (e) {}
  rawApi('logout', {}).catch(() => {});
  Store.clearData();
  Object.values(S.charts).forEach(c => c.destroy()); S.charts = {};
  showLogin();
}

function renderNav() {
  const items = NAV[S.user.hak_akses] || [];
  $('#mainNav').innerHTML = items.map(n =>
    '<button class="nav-item ' + (S.page === n.id ? 'active' : '') + '" onclick="' + (n.id === 'lainnya' ? 'openMenuSheet()' : "go('" + n.id + "')") + '" aria-label="' + n.l + '"' + (S.page === n.id ? ' aria-current="page"' : '') + '><i class="bi ' + n.i + '"></i><span>' + n.l + '</span></button>').join('');
}
async function go(page, opts) {
  if (!S.user) return;
  if (PAGE_ROLES[page].indexOf(S.user.hak_akses) < 0) { toast('Anda tidak punya akses ke halaman ini.', 'err'); return; }
  if (S.page === 'pengaturan' && page !== 'pengaturan' && S.ui.setSaved) S.settings = Object.assign({}, S.ui.setSaved); // buang draf pengaturan yang belum disimpan
  if (!(opts && opts.noPush) && pageFromHash() !== page) { try { history.pushState({ p: page }, '', '#/' + page); } catch (e) {} }
  syncSys(false);
  const my = ++S.nav; S.page = page;
  closeModal(); renderNav();
  $('#pageTitle').textContent = TITLES[page] || '';
  const c = $('#app-container'); c.innerHTML = skeleton(); window.scrollTo(0, 0);
  try {
    const r = await PAGES[page]();
    if (my !== S.nav) return;
    c.innerHTML = '<div class="page">' + r.html + '</div>';
    if (r.after) r.after();
  } catch (e) {
    if (my !== S.nav) return;
    c.innerHTML = '<div class="card-x mt-3 text-center"><i class="bi bi-wifi-off" style="font-size:36px;color:var(--bad)"></i><p class="mt-2 mb-3">' + esc(e.message) + (/tidak dikenal/i.test(e.message) ? '<br><small class="text-3">Backend Apps Script belum diperbarui. Tempel <code>Kode.gs</code> terbaru lalu Deploy → Manage deployments → ✏️ → New version.</small>' : '') + '</p><button class="btn-p" onclick="go(\'' + page + '\')"><i class="bi bi-arrow-clockwise"></i> Coba lagi</button></div>';
  }
}
function openMenuSheet() {
  const r = S.user.hak_akses;
  const it = (ico, label, fn) => '<button class="sheet-item" onclick="' + fn + '"><span class="ico"><i class="bi ' + ico + '"></i></span>' + label + '</button>';
  let h = '<div class="d-flex align-items-center gap-3 mb-3"><div class="ava">' + esc(initials(S.user.nama_user)) + '</div><div><div class="fw-bold">' + esc(S.user.nama_user) + '</div><span class="chip">' + r + '</span></div></div>';
  if (isSuper()) h += it('bi-shield-lock', 'Kontrol Sistem', "go('sistem')");
  if (isAdminLvl()) h += it('bi-printer', 'Cetak Ulang Struk', "go('cetakulang')") + it('bi-wallet2', 'Pengeluaran', "go('pengeluaran')") + it('bi-graph-up-arrow', 'Laporan Keuangan', "go('laporan')") + it('bi-sliders', 'Pengaturan Printer & Struk', "go('pengaturan')") + it('bi-person-gear', 'Kelola User', "go('user')");
  h += it('bi-key', 'Ubah Password Saya', 'ubahPasswordSaya()') + it('bi-moon-stars', 'Ganti Mode Gelap / Terang', 'toggleDarkMode()') + it('bi-box-arrow-right', '<span class="text-bad">Keluar</span>', 'handleLogout()');
  openModal({ title: 'Menu', body: h });
}
function ubahPasswordSaya(peringatan) {
  openModal({ title: 'Ubah Password',
    body: (peringatan === true ? '<div class="alert-x alert-warn mb-3"><i class="bi bi-shield-exclamation"></i><div><strong>Password bawaan masih dipakai.</strong> Ganti sekarang agar akun Anda aman. Password lama: <code>Superuser</code>.</div></div>' : '') + '<div class="fld"><label>Password Lama</label><input class="inp" type="password" id="pwLama" autocomplete="current-password"></div><div class="fld"><label>Password Baru (min. 6 karakter)</label><input class="inp" type="password" id="pwBaru" autocomplete="new-password"></div>',
    footer: '<button class="btn-s btn-sm" data-bs-dismiss="modal">Batal</button><button class="btn-p btn-sm" id="pwSave">Simpan</button>' });
  $('#pwSave').onclick = e => withBusy(e.currentTarget, async () => {
    try { await api('akun.ubahPassword', { lama: $('#pwLama').value, baru: $('#pwBaru').value }); toast('Password berhasil diubah.'); closeModal(); }
    catch (er) { toast(er.message, 'err'); }
  });
}

// ════════════════════════════════════════════════════════
// BAGIAN 4: STRUK — MODEL, PRATINJAU, ESC/POS
// ════════════════════════════════════════════════════════
/** Jumlah kolom karakter per baris, mengikuti lebar kertas & kepadatan huruf (Font A / Font B ESC/POS) */
function rcptW() {
  const w80 = S.settings.lebar_kertas === '80', kecil = S.settings.font_density === 'kecil';
  return w80 ? (kecil ? 64 : 48) : (kecil ? 42 : 32);
}
function wrapText(t, w) {
  t = String(t);
  if (t.length <= w) return [t];
  const out = []; let line = '';
  t.split(/\s+/).forEach(word => {
    while (word.length > w) { if (line) { out.push(line); line = ''; } out.push(word.slice(0, w)); word = word.slice(w); }
    if ((line + ' ' + word).trim().length > w) { out.push(line); line = word; } else line = (line + ' ' + word).trim();
  });
  if (line) out.push(line);
  return out;
}
const BLN_STRUK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sept', 'Okt', 'Nov', 'Des'];
function periodeStruk(b) { const m = String(b).match(/^(\d{4})-(\d{2})/); return m ? BLN_STRUK[+m[2] - 1] + '_' + m[1].slice(2) : String(b); }

/**
 * Model struk → array baris {t, a:'l'|'c', b:bold}. Dipakai pratinjau HTML, cetak browser, teks unduhan, dan ESC/POS.
 * Tata letak: judul tengah · garis · "Label    : nilai" (titik dua sejajar) · garis · penutup tengah.
 * Semua lebar (garis, kolom label, pembungkus nilai) dihitung dari lebar kertas.
 */
function buildReceipt(r) {
  const W = rcptW(), s = S.settings, L = [];
  const add = (t, a, b) => L.push({ t: String(t), a: a || 'l', b: !!b });
  const sep = () => add('-'.repeat(W));
  const LW = Math.max(9, Math.round(W * 0.25));   // lebar kolom label (sebelum ':')
  const VW = W - LW - 2;                          // lebar kolom nilai (setelah ': ')
  const row = (label, value) => {
    const parts = wrapText(String(value), VW);
    parts.forEach((ln, i) => add(i ? ' '.repeat(LW + 2) + ln : String(label).padEnd(LW) + ': ' + ln));
  };
  const block = (text, bold) => { // teks multi-baris di tengah; baris kosong dipertahankan
    const lines = String(text || '').split('\n').map(x => x.replace(/\s+$/, ''));
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    lines.forEach(x => { if (!x.trim()) add('', 'c'); else wrapText(x.trim() === x ? x : x.trim(), W).forEach(y => add(y, 'c', bold)); });
  };
  block(s.header_1, false);
  block(s.header_2, false);
  sep();
  if (r.cetak_ulang && s.watermark_ulang === '1') add('*** CETAK ULANG ***', 'c', true);
  row('Trx_Id', r.no_struk);
  row('Tgl Byr', tglID(r.tanggal).slice(0, 10));
  row('Id_Pel', r.id_cust);
  row('Nama', r.nama);
  row('Paket', r.paket);
  if (s.tampil_odp === '1') row('Titik', r.odp);
  row('Bulan', '1');
  row('Periode', periodeStruk(r.bulan));
  row('Tagihan', rp(r.jumlah));
  row('Adm', rp(0));
  row('Ttl Byr', rp(r.jumlah));
  if (r.metode === 'Tunai' && r.diterima > r.jumlah) { row('Tunai', rp(r.diterima)); row('Kembali', rp(r.kembali)); }
  sep();
  block(s.footer, false);
  if (s.catatan && s.catatan.trim()) { add('', 'c'); block(s.catatan, false); }
  return L;
}
function receiptHTML(lines, cls) {
  const W = rcptW();
  // ukuran huruf & lebar pratinjau proporsional terhadap jumlah kolom (kertas 58 mm tampil lebih sempit dari 80 mm)
  const st = 'font-size:clamp(8px,calc((100vw - 96px) / ' + (W * 0.6).toFixed(1) + '),12px);width:calc(' + W + 'ch + 24px);max-width:100%';
  return '<div class="rcpt ' + (cls || '') + '" style="' + st + '">' + lines.map(l => '<span class="' + (l.a === 'c' ? 'c' : 'l') + (l.b ? ' b' : '') + '">' + (esc(l.t) || '&nbsp;') + '</span>').join('') + '</div>';
}
function receiptText(r) {
  const W = rcptW();
  return buildReceipt(r).map(l => l.a === 'c' ? ' '.repeat(Math.max(0, Math.floor((W - l.t.length) / 2))) + l.t : l.t).join('\r\n');
}
function asciiBytes(t) {
  const n = String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const out = []; for (let i = 0; i < n.length; i++) { const c = n.charCodeAt(i); out.push(c >= 32 && c < 127 ? c : 63); }
  return out;
}
let CUT_PAUSE_MS = 1000; // jeda setelah pemotongan: pisau butuh waktu bergerak sebelum data struk berikutnya
const autoCutOn = () => S.settings.auto_cut === '1';
const cutMark = () => autoCutOn() ? '<div class="cut-line"><i class="bi bi-scissors"></i> dipotong otomatis</div>' : '';
/** Perintah potong ESC/POS sesuai pilihan di Pengaturan */
function cutCommand() {
  switch (S.settings.cut_mode) {
    case 'partial': return [0x1D, 0x56, 0x42, 0x01];  // GS V 66 1 : potong sebagian
    case 'gsv0': return [0x1D, 0x56, 0x00];           // GS V 0    : potong penuh (printer lama)
    case 'esci': return [0x1B, 0x69];                 // ESC i     : potong penuh (printer tertentu)
    default: return [0x1D, 0x56, 0x42, 0x00];         // GS V 66 0 : dorong ke posisi pisau lalu potong penuh
  }
}
/** Data cetak SATU struk (lengkap: reset printer → isi → dorong kertas → potong). Dipakai berulang tiap struk. */
function receiptBytes(r) {
  const d = S.settings.font_density, out = [];
  const push = function () { for (let i = 0; i < arguments.length; i++) out.push(arguments[i]); };
  push(0x1B, 0x40, 0x1B, 0x4D, d === 'kecil' ? 1 : 0);
  if (d === 'tebal') push(0x1B, 0x45, 1);
  buildReceipt(r).forEach(l => {
    push(0x1B, 0x61, l.a === 'c' ? 1 : 0);
    if (l.b && d !== 'tebal') push(0x1B, 0x45, 1);
    asciiBytes(l.t).forEach(b => out.push(b)); push(0x0A);
    if (l.b && d !== 'tebal') push(0x1B, 0x45, 0);
  });
  push(0x1B, 0x61, 0);
  if (autoCutOn()) {
    const feed = Math.max(0, Math.min(10, parseInt(S.settings.cut_feed, 10) || 0));
    for (let i = 0; i < feed; i++) push(0x0A);
    cutCommand().forEach(b => out.push(b));
  } else push(0x0A, 0x0A, 0x0A);
  return new Uint8Array(out);
}
/** Gabungan beberapa struk (untuk RawBT). Setiap struk diakhiri perintah potong bila auto-cut aktif. */
function toEscPos(receipts) {
  const parts = receipts.map(receiptBytes), all = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0; parts.forEach(p => { all.set(p, o); o += p.length; });
  return all;
}

// ════════════════════════════════════════════════════════
// BAGIAN 5: PRINTER (Bluetooth ESC/POS · RawBT · Browser)
// ════════════════════════════════════════════════════════
const BT_SERVICES = ['0000ffe0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb', '000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '49535343-fe7d-4ae5-8fa9-9fafd205e455'];
function btConnected() { return !!(S.printer.dev && S.printer.dev.gatt && S.printer.dev.gatt.connected && S.printer.char); }
async function btFindChar(dev) {
  const srv = await dev.gatt.connect();
  const svcs = await srv.getPrimaryServices();
  for (const sv of svcs) {
    const chars = await sv.getCharacteristics();
    const c = chars.find(x => x.properties.write || x.properties.writeWithoutResponse);
    if (c) return c;
  }
  throw new Error('Printer tidak menyediakan kanal tulis. Coba metode RawBT atau Browser.');
}
async function btPair() {
  if (!navigator.bluetooth) throw new Error('Browser ini tidak mendukung Web Bluetooth (butuh Chrome/Edge di Android atau desktop, dan situs harus HTTPS). Gunakan metode RawBT atau Cetak Browser.');
  const dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BT_SERVICES });
  S.printer.char = await btFindChar(dev);
  S.printer.dev = dev; S.printer.name = dev.name || 'Printer BT';
  dev.addEventListener('gattserverdisconnected', () => { S.printer.char = null; updatePrinterStatus(); });
  updatePrinterStatus();
}
async function btEnsure() {
  if (btConnected()) return;
  if (S.printer.dev) { S.printer.char = await btFindChar(S.printer.dev); updatePrinterStatus(); return; }
  throw new Error('Printer Bluetooth belum terhubung. Hubungkan dulu di menu Setelan.');
}
async function btWrite(bytes) {
  const c = S.printer.char;
  for (let i = 0; i < bytes.length; i += 100) {
    const chunk = bytes.slice(i, i + 100);
    if (c.properties.writeWithoutResponse) await c.writeValueWithoutResponse(chunk); else await c.writeValue(chunk);
    await sleep(30);
  }
}
function printBrowser(receipts) {
  const area = $('#printArea');
  const w = S.settings.lebar_kertas === '80' ? '80mm' : '58mm';
  let st = $('#pageStyle'); if (!st) { st = document.createElement('style'); st.id = 'pageStyle'; document.head.appendChild(st); }
  const mm = S.settings.lebar_kertas === '80' ? 80 : 58, inner = mm - 4, W = rcptW();
  const fpx = Math.floor((inner * 3.7795 / W / 0.6) * 10) / 10; // W karakter tepat memenuhi area cetak
  st.textContent = '@page{size:' + w + ' auto;margin:2mm}#printArea .rcpt-print{width:' + inner + 'mm;font-size:' + fpx + 'px;line-height:1.25}';
  area.innerHTML = receipts.map(r => '<div class="rcpt-print">' + buildReceipt(r).map(l => '<span class="' + (l.a === 'c' ? 'c' : 'l') + (l.b ? ' b' : '') + '">' + (esc(l.t) || '&nbsp;') + '</span>').join('') + '</div>').join('');
  window.print();
  setTimeout(() => { area.innerHTML = ''; }, 1500);
}
function printRawBT(receipts) {
  const bytes = toEscPos(receipts); let bin = '';
  for (let i = 0; i < bytes.length; i += 4096) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 4096));
  const a = document.createElement('a'); a.href = 'rawbt:base64,' + btoa(bin); a.style.display = 'none';
  document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500);
}
/** Cetak sesuai metode di Pengaturan. Melempar error bila gagal. */
async function doPrint(receipts, forceMode) {
  const mode = forceMode || S.settings.jenis_printer;
  if (mode === 'browser') return printBrowser(receipts);
  if (mode === 'rawbt') return printRawBT(receipts);
  await btEnsure();
  // Bluetooth: kirim SATU struk per giliran (masing-masing diakhiri potong), lalu beri jeda agar pisau selesai
  // sebelum struk berikutnya. Mencegah data hilang di buffer printer saat cetak massal.
  for (let i = 0; i < receipts.length; i++) {
    try { await btWrite(receiptBytes(receipts[i])); }
    catch (e) { throw new Error(e.message + (receipts.length > 1 ? ' (tercetak ' + i + ' dari ' + receipts.length + ' struk)' : '')); }
    if (i < receipts.length - 1) await sleep(autoCutOn() ? CUT_PAUSE_MS : 150);
  }
}
/** Alur cetak dengan fallback: bila gagal → buka pratinjau dengan pilihan cetak lain */
async function printFlow(receipts, opt) {
  opt = opt || {};
  try {
    await doPrint(receipts);
    toast(receipts.length + ' struk dikirim ke printer.');
    if (opt.markIds && opt.markIds.length) api('struk.tandaiCetak', { ids: opt.markIds }).catch(() => {});
  } catch (e) {
    toast('Cetak gagal: ' + e.message, 'err');
    showReceipts(receipts, opt);
  }
}
function updatePrinterStatus() {
  const m = S.settings.jenis_printer;
  let html, ok;
  if (m === 'bluetooth') { ok = btConnected(); html = ok ? esc(S.printer.name) + ' · Siap Cetak' : 'Printer Bluetooth belum terhubung'; }
  else if (m === 'rawbt') { ok = true; html = 'RawBT (aplikasi perantara) · Siap'; }
  else { ok = true; html = 'Printer Browser · Dialog cetak'; }
  $$('.pr-status').forEach(el => { el.className = 'pr-status ' + (ok ? 'alert-x alert-ok' : 'alert-x alert-warn'); el.innerHTML = '<i class="bi ' + (m === 'bluetooth' ? 'bi-bluetooth' : 'bi-printer') + '"></i><div class="flex-grow-1"><strong>' + html + '</strong><div style="font-size:11px;opacity:.85">Kertas ' + S.settings.lebar_kertas + ' mm' + (ok ? '' : ' · ketuk untuk mengatur') + '</div></div>'; });
}
function printerStrip() { return '<div class="pr-status alert-x alert-info mb-3" style="cursor:pointer" onclick="go(\'pengaturan\')" role="button"></div>'; }

/** Pratinjau struk (pop-up) + cetak + unduh */
function showReceipts(receipts, opt) {
  opt = opt || {};
  const shown = receipts.slice(0, 3);
  const body = (opt.note ? '<div class="alert-x alert-info mb-3"><i class="bi bi-info-circle"></i><div>' + esc(opt.note) + '</div></div>' : '') +
    '<div class="rcpt-wrap">' + shown.map(r => receiptHTML(buildReceipt(r), S.settings.font_density === 'tebal' ? 'tebal' : S.settings.font_density === 'kecil' ? 'kecil' : '') + cutMark()).join('') + '</div>' +
    (receipts.length > 3 ? '<div class="hint text-center mt-2">+ ' + (receipts.length - 3) + ' struk lainnya akan ikut tercetak</div>' : '');
  openModal({ title: 'Pratinjau Struk (' + receipts.length + ')', size: 'md', body: body,
    footer: '<button class="btn-s btn-sm" data-bs-dismiss="modal"><i class="bi bi-x-lg"></i> Tutup</button>' +
      '<button class="btn-s btn-sm" id="rcDl"><i class="bi bi-download"></i> Unduh</button>' +
      '<button class="btn-t btn-sm" id="rcBr"><i class="bi bi-window"></i> Cetak Browser</button>' +
      '<button class="btn-p btn-sm" id="rcPr"><i class="bi bi-printer"></i> Cetak</button>' });
  $('#rcDl').onclick = () => {
    const blob = new Blob([receipts.map(receiptText).join('\r\n\r\n\r\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'struk-' + (receipts[0].no_struk || 'duo-al-net') + '.txt';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  $('#rcBr').onclick = () => { try { printBrowser(receipts); if (opt.markIds) api('struk.tandaiCetak', { ids: opt.markIds }).catch(() => {}); } catch (e) { toast(e.message, 'err'); } };
  $('#rcPr').onclick = e => withBusy(e.currentTarget, async () => {
    try { await doPrint(receipts); toast('Struk dikirim ke printer.'); if (opt.markIds) api('struk.tandaiCetak', { ids: opt.markIds }).catch(() => {}); closeModal(); }
    catch (er) { toast('Gagal: ' + er.message, 'err'); }
  });
}
