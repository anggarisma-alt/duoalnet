'use strict';
/** DUO AL NET — Halaman (js/pages.js). Memakai getData() (SWR) untuk baca, api() untuk tulis. */

// ════════════════════════════════════════════════════════
// BAGIAN 6: HALAMAN — js/pages.js (DASHBOARD, BAYAR, CETAK ULANG, PELANGGAN, ODP, ...)
// ════════════════════════════════════════════════════════
const PAGES = {};
const _scriptP = {};
function loadScriptOnce(src) { return _scriptP[src] || (_scriptP[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); })); }
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function odpNameOf(list, id) { const o = (list || []).find(x => x.id_odp === id); return o ? o.nama_odp : '-'; }

function sparkline(vals, labels) {
  const w = 240, h = 60, p = 5, n = vals.length, max = Math.max.apply(null, vals.concat([1]));
  const pts = vals.map((v, i) => [p + i * (w - 2 * p) / Math.max(1, n - 1), h - p - (v / max) * (h - 2 * p - 8)]);
  const line = pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
  const area = 'M' + pts[0][0].toFixed(1) + ',' + h + ' L' + pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' L') + ' L' + pts[n - 1][0].toFixed(1) + ',' + h + ' Z';
  const last = pts[n - 1];
  return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Tren pemasukan enam bulan terakhir"><defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00A3FF" stop-opacity=".32"/><stop offset="1" stop-color="#00A3FF" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="' + area + '" fill="url(#spg)"/><polyline points="' + line + '" fill="none" stroke="#00A3FF" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4.5" fill="#00A3FF" stroke="var(--card)" stroke-width="2"/></svg>' +
    '<div class="spark-labels">' + labels.map(l => '<span>' + esc(l) + '</span>').join('') + '</div>';
}
PAGES.dashboard = async function () {
  const d = await getData('dashboard', {}, { fresh: 60000, onFresh: x => { if (S.page === 'dashboard') go('dashboard', { noPush: true }); } }); S.data.dash = d;
  const admin = isAdminLvl(), ch = d.chart;
  const cur = ch.masuk[ch.masuk.length - 1] || 0, prev = ch.masuk[ch.masuk.length - 2] || 0;
  const delta = prev > 0 ? Math.round((cur - prev) / prev * 100) : null;
  const pct = d.persen_lunas, C = 2 * Math.PI * 34, pu = d.port_total ? Math.round(d.port_terpakai / d.port_total * 100) : 0;
  let h = (autoBillOn() ? '' : autoBillNotice('margin-top:8px')) +
    '<section class="hero hero-row" style="margin-top:8px"><div><div class="hero-date">' + esc(tglPanjang(d.tanggal)) + '</div><h2>Halo, ' + esc(S.user.nama_user) + '</h2><p>' +
    (d.tagihan_terbit ? d.tagihan_lunas + ' dari ' + d.tagihan_terbit + ' tagihan bulan ini sudah lunas.' : 'Tagihan bulan ini terbit otomatis tanggal 20.') + '</p></div>' +
    '<div class="ring" role="img" aria-label="' + pct + ' persen tagihan lunas"><svg viewBox="0 0 84 84"><circle class="ring-track" cx="42" cy="42" r="34"/><circle class="ring-fill" id="ringFill" cx="42" cy="42" r="34" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '" data-to="' + (C * (1 - pct / 100)).toFixed(1) + '"/></svg><div class="ring-num"><b>' + pct + '%</b><span>lunas</span></div></div></section>';
  h += '<div class="card-x money"><div class="money-top"><span class="muted">Pemasukan bulan ini</span>' + (delta !== null ? '<span class="badge-x ' + (delta >= 0 ? 'b-ok' : 'b-bad') + '"><i class="bi bi-graph-' + (delta >= 0 ? 'up' : 'down') + '-arrow"></i> ' + (delta >= 0 ? '+' : '') + delta + '% dari bulan lalu</span>' : '') + '</div>' +
    '<div class="money-val" data-to="' + d.pemasukan + '" data-fmt="rp">' + rpShort(d.pemasukan) + '</div>' + sparkline(ch.masuk, ch.bulan) +
    '<div class="money-foot">Belum terbayar <b>' + rpShort(d.belum_total) + '</b> dari ' + d.belum_pelanggan + ' pelanggan</div></div>';
  h += '<div class="tiles"><div class="tile"><i class="bi bi-people"></i><div class="tile-val" data-to="' + d.aktif + '">' + d.aktif + '</div><div class="muted">Pelanggan aktif dari ' + d.total_pelanggan + ' terdaftar</div></div>' +
    '<div class="tile ' + (d.odp_penuh ? 'warn' : '') + '"><i class="bi bi-diagram-3"></i><div class="tile-val" data-to="' + d.total_odp + '">' + d.total_odp + '</div><div class="muted">' + (d.odp_penuh ? d.odp_penuh + ' titik ODP sudah penuh' : 'Titik ODP, semua masih tersedia') + '</div></div></div>';
  if (admin) h += '<div class="actions"><button onclick="go(\'bayar\')"><i class="bi bi-receipt"></i>Bayar satuan</button>' + (massalOn() ? '<button onclick="S.ui.bayarStart=\'massal\';go(\'bayar\')"><i class="bi bi-people"></i>Tagih massal</button>' : '') + '<button onclick="go(\'pengeluaran\')"><i class="bi bi-wallet2"></i>Catat biaya</button></div>';
  h += '<div class="sec-title"><h3>Tren enam bulan<small>Pembayaran masuk dan jumlah pelanggan aktif</small></h3></div><div class="grid-2"><div class="card-x"><div class="fw-bold mb-2">Pembayaran masuk</div><div style="height:210px"><canvas id="chIncome" role="img" aria-label="Grafik pembayaran enam bulan"></canvas></div></div>' +
    '<div class="card-x"><div class="fw-bold mb-2">Pelanggan aktif</div><div style="height:210px"><canvas id="chCust" role="img" aria-label="Grafik jumlah pelanggan"></canvas></div></div></div>';
  h += '<div class="sec-title"><h3>Kapasitas ODP<small>' + d.port_terpakai + ' dari ' + d.port_total + ' port terpakai (' + pu + '%)</small></h3>' + (admin ? '<button class="link-btn" onclick="go(\'odp\')">Lihat semua</button>' : '') + '</div><div class="grid-auto">' +
    d.odp.slice(0, 8).map(o => '<div class="card-x"><div class="d-flex justify-content-between align-items-start gap-2"><div class="min-w-0"><div class="fw-bold">' + esc(o.nama_odp) + '</div><div class="text-3 text-truncate" style="font-size:12px">' + esc(o.lokasi) + '</div></div>' + odpBadge(o) + '</div>' +
      '<div class="bar mt-3 ' + barClass(o.persen) + '"><i style="width:' + Math.min(100, o.persen) + '%"></i></div><div class="d-flex justify-content-between mt-1" style="font-size:12px"><strong>' + o.terpakai + ' dari ' + o.kapasitas + ' port</strong><span class="' + (o.sisa ? 'text-ok' : 'text-bad') + ' fw-bold">' + (o.sisa ? o.sisa + ' port bebas' : 'Perlu splitter baru') + '</span></div></div>').join('') + '</div>';
  h += '<div class="sec-title"><h3>Catatan hari ini</h3></div><div class="card-x tint"><ul class="mb-0 ps-3">' + d.insights.map(i => '<li class="mb-1">' + esc(i) + '</li>').join('') + '</ul></div>';
  h += '<div class="sec-title"><h3>Pembayaran terakhir</h3></div>' +
    (d.recent.length ? '<div class="grid-auto">' + d.recent.map(r => '<div class="card-x row-card"><div class="ava">' + esc(initials(r.nama)) + '</div><div class="flex-grow-1 min-w-0"><div class="fw-bold text-truncate">' + esc(r.nama) + '</div><div class="text-3" style="font-size:12px">' + esc(r.metode) + ' · ' + esc(tglID(r.tanggal)) + '</div></div><div class="text-end"><div class="num">' + rp(r.jumlah) + '</div><div class="text-3" style="font-size:11px">' + esc(r.no_struk) + '</div></div></div>').join('') + '</div>' : emptyBox('bi-inbox', 'Belum ada pembayaran bulan ini.'));
  return { html: h, after: () => { renderCharts(); animateDashboard(); } };
};
/** Satu momen animasi di dashboard: cincin terisi dan angka utama naik. Tunduk pada "kurangi gerakan". */
function animateDashboard() {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rf = $('#ringFill'); if (rf) requestAnimationFrame(() => requestAnimationFrame(() => { rf.style.strokeDashoffset = rf.dataset.to; }));
  $$('[data-to]').forEach(el => {
    if (el.tagName === 'circle') return;
    const to = +el.dataset.to, f = v => el.dataset.fmt === 'rp' ? rpShort(v) : Math.round(v).toLocaleString('id-ID');
    if (reduce) { el.textContent = f(to); return; }
    const t0 = performance.now();
    (function step(t) { const p = Math.min(1, (t - t0) / 800), e = 1 - Math.pow(1 - p, 3); el.textContent = f(to * e); if (p < 1) requestAnimationFrame(step); })(t0);
  });
}
function renderCharts() {
  const d = S.data.dash; if (!d) return;
  if (typeof Chart === 'undefined') { loadScriptOnce('https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js').then(renderCharts).catch(() => {}); return; }
  const c1 = $('#chIncome'), c2 = $('#chCust'); if (!c1 || !c2) return;
  Object.values(S.charts).forEach(c => c.destroy()); S.charts = {};
  const tx = cssVar('--text-3'), gr = cssVar('--border'), az = cssVar('--azure'), pr = cssVar('--primary');
  const g = c1.getContext('2d').createLinearGradient(0, 0, 0, 210); g.addColorStop(0, az); g.addColorStop(1, pr);
  const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: tx }, grid: { display: false } }, y: { ticks: { color: tx }, grid: { color: gr }, beginAtZero: true } } };
  S.charts.a = new Chart(c1, { type: 'bar', data: { labels: d.chart.bulan, datasets: [{ data: d.chart.masuk, backgroundColor: g, borderRadius: 8, borderSkipped: false }] }, options: Object.assign({}, base, { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => rp(c.raw) } } } }) });
  S.charts.b = new Chart(c2, { type: 'line', data: { labels: d.chart.bulan, datasets: [{ data: d.chart.pelanggan, borderColor: az, backgroundColor: 'transparent', tension: .35, pointRadius: 4, pointBackgroundColor: az, borderWidth: 3 }] }, options: base });
}

// ════════════════════════════════════════════════════════
// BAGIAN 7: HALAMAN — PEMBAYARAN (SATUAN & MASSAL)
// ════════════════════════════════════════════════════════
function unpaidMap() { const m = {}; S.data.bayar.tagihan.forEach(t => { (m[t.id_cust] = m[t.id_cust] || []).push(t); }); return m; }
PAGES.bayar = async function () {
  const d = await getData('bayar.data', {}, { fresh: 20000, onFresh: x => { if (S.page === 'bayar' && S.ui.bayar) { S.data.bayar = x; mergeSettings(x.settings); renderBayar(); } } }); S.data.bayar = d; mergeSettings(d.settings);
  S.ui.bayar = { tab: (S.ui.bayarStart === 'massal' && massalOn()) ? 'massal' : 'satuan', q: '', filter: 'belum', sel: null, tagId: null, metode: 'Tunai', diterima: '', odp: '', picked: {}, urut: 'nama' };
  return { html: '<div class="mt-2">' + printerStrip() + '<div class="seg mb-3" id="bayarTabs"><button class="on" data-t="satuan" onclick="bayarTab(\'satuan\')"><i class="bi bi-person-search"></i> Satuan (Cari)</button><button data-t="massal" onclick="bayarTab(\'massal\')"><i class="bi bi-diagram-3"></i> Massal per ODP</button></div><div id="bayarBody"></div></div>', after: () => { updatePrinterStatus(); if (!massalOn()) { const tb = $('#bayarTabs'); if (tb) tb.remove(); } else if (S.settings.bayar_massal === '0') { const mb = $('#bayarTabs [data-t="massal"]'); if (mb) mb.insertAdjacentHTML('beforeend', ' <span class="badge-x b-warn">disembunyikan</span>'); } const t = S.ui.bayar.tab; S.ui.bayarStart = null; $$('#bayarTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); renderBayar(); } };
};
function bayarTab(t) {
  if (!S.ui.bayar || !$('#bayarTabs')) return;
  if (t === 'massal' && !massalOn()) return;
  S.ui.bayar.tab = t; S.ui.bayar.sel = null;
  $$('#bayarTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  renderBayar();
}
function renderBayar() { return S.ui.bayar.tab === 'satuan' ? renderSatuan() : renderMassal(); }

// ── Satuan ──
function renderSatuan() {
  const u = S.ui.bayar, d = S.data.bayar, um = unpaidMap();
  const cust = u.sel ? d.pelanggan.find(c => c.id_cust === u.sel) : null;
  let h = '';
  if (cust) h = payCard(cust, um[cust.id_cust] || []);
  else {
    const nb = d.pelanggan.filter(c => um[c.id_cust]).length;
    h = '<div class="search-box mb-2"><i class="bi bi-search lead"></i><input class="inp" id="satQ" type="search" placeholder="Cari nama, ID, atau no HP" value="' + esc(u.q) + '" oninput="satuanQ(this.value)" aria-label="Cari pelanggan"><button class="icon-btn clr" aria-label="Hapus pencarian" onclick="satuanQ(\'\');$(\'#satQ\').value=\'\'"><i class="bi bi-x-circle"></i></button></div>' +
      '<div class="chips mb-3">' + [['semua', 'Semua Status', d.pelanggan.length], ['belum', 'Belum Lunas', nb], ['lunas', 'Sudah Lunas', d.pelanggan.length - nb]].map(f => '<button class="fchip ' + (u.filter === f[0] ? 'on' : '') + '" onclick="satuanFilter(\'' + f[0] + '\')">' + f[1] + ' <span class="cnt">' + f[2] + '</span></button>').join('') + '</div><div id="satuanList"></div>';
  }
  $('#bayarBody').innerHTML = h;
  if (!cust) renderSatuanList();
}
const satuanQ = debounce(v => { S.ui.bayar.q = v; renderSatuanList(); }, 150);
function satuanFilter(f) { S.ui.bayar.filter = f; renderSatuan(); }
function renderSatuanList() {
  const u = S.ui.bayar, d = S.data.bayar, um = unpaidMap(), q = u.q.trim().toLowerCase(), qd = digits(q);
  let list = d.pelanggan.filter(c => (u.filter === 'semua') || (u.filter === 'belum' ? !!um[c.id_cust] : !um[c.id_cust]));
  if (q) list = list.filter(c => c.nama_pelanggan.toLowerCase().indexOf(q) >= 0 || c.id_cust.toLowerCase().indexOf(q) >= 0 || (qd.length >= 3 && digits(c.no_hp).indexOf(qd) >= 0));
  const total = list.length; list = list.slice(0, 30);
  const el = $('#satuanList'); if (!el) return;
  el.innerHTML = '<div class="sec-title" style="margin-top:8px"><h3 style="font-size:16px">' + (q ? 'Hasil Pencarian' : 'Antrean Tagihan') + '</h3><small>' + total + ' pelanggan</small></div>' +
    (list.length ? list.map(c => { const t = um[c.id_cust]; return '<div class="card-x row-card mb-2" style="padding:12px;cursor:pointer" onclick="selectCust(\'' + c.id_cust + '\')"><div class="ava">' + esc(initials(c.nama_pelanggan)) + '</div><div class="flex-grow-1 min-w-0"><div class="fw-bold text-truncate">' + esc(c.nama_pelanggan) + ' <span class="text-3 fw-normal" style="font-size:12px">' + esc(c.id_cust) + '</span></div><div class="text-3" style="font-size:12px">' + esc(odpNameOf(d.odp, c.id_odp)) + (t ? ' · <span class="text-bad fw-bold">' + rp(t[0].nominal) + (t.length > 1 ? ' (+' + (t.length - 1) + ' bln)' : '') + '</span>' : '') + '</div></div>' +
      (t ? '<span class="btn-t btn-sm">Bayar <i class="bi bi-arrow-right"></i></span>' : '<span class="badge-x b-ok">Lunas</span>') + '</div>'; }).join('') : emptyBox('bi-search', 'Pelanggan tidak ditemukan.'));
}
function selectCust(id) { const u = S.ui.bayar; u.sel = id; u.tagId = null; u.metode = 'Tunai'; u.diterima = ''; renderSatuan(); window.scrollTo(0, 0); }
function clearSel() { S.ui.bayar.sel = null; renderSatuan(); }
function payCard(c, tg) {
  const u = S.ui.bayar, d = S.data.bayar;
  if (!tg.length) return '<div class="card-x text-center"><i class="bi bi-check-circle-fill text-ok" style="font-size:44px"></i><h4 class="mt-2">' + esc(c.nama_pelanggan) + '</h4><p class="text-2">Semua tagihan sudah lunas. 🎉</p><button class="btn-s" onclick="clearSel()"><i class="bi bi-arrow-left"></i> Kembali</button></div>';
  if (!u.tagId || !tg.some(t => t.id_tagihan === u.tagId)) u.tagId = tg[0].id_tagihan;
  const t = tg.find(x => x.id_tagihan === u.tagId);
  const tunai = u.metode === 'Tunai';
  const tagPick = tg.length > 1 ? '<div class="fld"><label>Pilih Tagihan (' + tg.length + ' belum lunas)</label>' + tg.map(x => '<label class="card-x flat row-card mb-2" style="padding:10px;cursor:pointer"><input type="radio" class="chk" name="tg" ' + (x.id_tagihan === u.tagId ? 'checked' : '') + ' onchange="S.ui.bayar.tagId=\'' + x.id_tagihan + '\';S.ui.bayar.diterima=\'\';renderSatuan()"><span class="flex-grow-1 fw-bold">' + esc(bulanLabel(x.bulan_tagihan)) + '</span><span class="num">' + rp(x.nominal) + '</span></label>').join('') + '</div>' : '';
  const quick = [t.nominal, Math.ceil(t.nominal / 50000) * 50000, Math.ceil(t.nominal / 100000) * 100000].filter((v, i, a) => a.indexOf(v) === i && (i === 0 || v > t.nominal));
  return '<div class="card-x" style="border-top:4px solid var(--bad)"><div class="d-flex justify-content-between align-items-start gap-2"><div class="min-w-0"><h3 class="h-font fw-bold mb-1" style="font-size:22px">' + esc(c.nama_pelanggan) + '</h3><span class="badge-x b-info">' + esc(c.id_cust) + '</span></div><div class="text-end"><span class="badge-x b-bad">Belum Lunas</span><div><button class="link-btn" onclick="clearSel()">Ganti</button></div></div></div>' +
    '<div class="text-2 mt-1">Tagihan ' + esc(bulanLabel(t.bulan_tagihan)) + ' · Terbit ' + esc(tglID(t.tgl_terbit)) + '</div>' +
    '<div class="grid-2 mt-3"><div class="kv"><div class="k">ODP</div><div class="v">' + esc(odpNameOf(d.odp, c.id_odp)) + '</div></div><div class="kv"><div class="k">Alamat Pasang</div><div class="v" style="font-size:13px">' + esc(c.alamat || '-') + '</div></div></div>' +
    '<div class="kv mt-2 d-flex justify-content-between align-items-end"><div><div class="k">Paket Internet</div><div class="v" style="font-size:16px">' + esc(c.paket) + '</div></div><div class="text-end"><div class="k">Total Tagihan</div><div class="big-amt">' + rp(t.nominal) + '</div></div></div>' +
    '<div class="mt-3">' + tagPick + '<div class="fld"><label>Metode Pembayaran</label><div class="seg"><button class="' + (tunai ? 'on' : '') + '" onclick="setMetode(\'Tunai\')"><i class="bi bi-cash-coin"></i> Tunai (Kasir)</button><button class="' + (!tunai ? 'on' : '') + '" onclick="setMetode(\'Transfer\')"><i class="bi bi-qr-code"></i> Transfer / QRIS</button></div></div>' +
    (tunai ? '<div class="kv mb-3"><div class="d-flex justify-content-between mb-2"><span class="k">Nominal Diterima</span><strong class="text-ok" id="kembali" style="font-size:13px">Kembalian: ' + rp(Math.max(0, (numInput(u.diterima) || t.nominal) - t.nominal)) + '</strong></div><div class="chips mb-2">' + quick.map((v, i) => '<button class="fchip" style="background:var(--card)" onclick="setDiterima(' + v + ')">' + (i === 0 ? 'Uang Pas' : rp(v)) + '</button>').join('') + '</div><input class="inp num" id="dtr" inputmode="numeric" placeholder="' + rp(t.nominal) + '" value="' + (u.diterima ? Number(u.diterima).toLocaleString('id-ID') : '') + '" oninput="onDiterima(this)" aria-label="Nominal diterima"></div>' : '<div class="alert-x alert-info mb-3"><i class="bi bi-info-circle"></i><div>Pastikan dana transfer / QRIS sudah masuk sebelum menyimpan.</div></div>') +
    '<button class="btn-p btn-block mb-2" style="min-height:52px" onclick="paySingle(true,this)"><i class="bi bi-printer"></i> Simpan & Cetak Struk</button><button class="btn-t btn-block" onclick="paySingle(false,this)"><i class="bi bi-save"></i> Simpan Tanpa Cetak</button></div></div>';
}
function setMetode(m) { S.ui.bayar.metode = m; renderSatuan(); }
function setDiterima(v) { S.ui.bayar.diterima = String(v); renderSatuan(); }
function onDiterima(el) {
  const n = numInput(el.value); S.ui.bayar.diterima = n ? String(n) : '';
  el.value = n ? n.toLocaleString('id-ID') : '';
  const t = S.data.bayar.tagihan.find(x => x.id_tagihan === S.ui.bayar.tagId);
  $('#kembali').textContent = 'Kembalian: ' + rp(Math.max(0, (n || t.nominal) - t.nominal));
}
async function paySingle(print, btn) {
  const u = S.ui.bayar, t = S.data.bayar.tagihan.find(x => x.id_tagihan === u.tagId);
  if (!t) return;
  const dt = numInput(u.diterima);
  if (u.metode === 'Tunai' && dt && dt < t.nominal) { toast('Uang diterima kurang dari total tagihan.', 'err'); return; }
  await withBusy(btn, async () => {
    try {
      const r = await api('bayar.proses', { id_tagihan: [t.id_tagihan], metode: u.metode, diterima: u.metode === 'Tunai' ? (dt || t.nominal) : 0, cetak: print });
      afterPaid(r.receipts.length ? [t.id_tagihan] : []);
      toast('Pembayaran ' + rp(r.total) + ' tersimpan. Tagihan lunas.');
      if (print) { if (S.settings.cetak_otomatis === '1') printFlow(r.receipts, { markIds: [] }); else showReceipts(r.receipts, { markIds: [] }); }
      else showReceipts(r.receipts, { note: 'Tersimpan tanpa cetak. Anda masih bisa mencetak struk dari sini.', markIds: r.receipts.map(x => x.id_bayar) });
    } catch (e) { toast(e.message, 'err'); }
  });
}
function afterPaid(ids) {
  const b = S.data.bayar, set = {}; ids.forEach(i => { set[i] = 1; });
  b.tagihan = b.tagihan.filter(t => !set[t.id_tagihan]);
  const u = S.ui.bayar; u.sel = null; u.tagId = null; u.diterima = ''; u.picked = {};
  renderBayar();
}

// ── Massal ──
function massalItems() {
  const u = S.ui.bayar, d = S.data.bayar, um = unpaidMap();
  let list = d.pelanggan.filter(c => c.id_odp === u.odp && um[c.id_cust]).map(c => ({ c: c, t: um[c.id_cust][0], extra: um[c.id_cust].length - 1 }));
  list.sort((a, b) => u.urut === 'alamat' ? String(a.c.alamat).localeCompare(String(b.c.alamat), 'id', { numeric: true }) : a.c.nama_pelanggan.localeCompare(b.c.nama_pelanggan));
  return list;
}
function renderMassal() {
  const u = S.ui.bayar, d = S.data.bayar;
  let h = '<div class="card-x"><div class="fld mb-0"><label>Zona Teritorial ODP</label><select class="sel" onchange="massalOdp(this.value)" aria-label="Pilih ODP"><option value="">— Pilih ODP —</option>' + d.odp.map(o => '<option value="' + o.id_odp + '" ' + (u.odp === o.id_odp ? 'selected' : '') + '>' + esc(o.nama_odp) + ' (' + o.terpakai + '/' + o.kapasitas + ' port)</option>').join('') + '</select></div>';
  if (!u.odp) return $('#bayarBody').innerHTML = h + '</div><div class="mt-3">' + emptyBox('bi-diagram-3', 'Pilih ODP untuk menampilkan pelanggan yang belum bayar.') + '</div>';
  const o = d.odp.find(x => x.id_odp === u.odp), items = massalItems();
  const aktifOdp = d.pelanggan.filter(c => c.id_odp === u.odp).length;
  h += '<div class="grid-2 mt-3"><div class="kv"><div class="k">Belum Bayar</div><div class="v text-bad" style="font-size:20px">' + items.length + ' / ' + aktifOdp + '</div></div><div class="kv"><div class="k">Estimasi Tagihan</div><div class="v" style="font-size:18px">' + rp(items.reduce((a, x) => a + x.t.nominal, 0)) + '</div></div></div></div>';
  if (!items.length) return $('#bayarBody').innerHTML = h + '<div class="card-x mt-3">' + emptyBox('bi-check2-circle', 'Semua pelanggan di ODP ini sudah lunas.') + '</div>';
  const allOn = items.every(x => u.picked[x.t.id_tagihan]);
  h += '<div class="card-x mt-3 d-flex align-items-center gap-3" style="padding:12px"><input type="checkbox" class="chk" id="pickAll" ' + (allOn ? 'checked' : '') + ' onchange="massalPickAll(this.checked)" aria-label="Pilih semua"><label for="pickAll" class="fw-bold flex-grow-1 mb-0">Pilih Semua (' + items.length + ')</label><select class="sel" style="width:auto;min-height:40px" onchange="S.ui.bayar.urut=this.value;renderMassal()" aria-label="Urutkan"><option value="nama" ' + (u.urut === 'nama' ? 'selected' : '') + '>Urut: Nama</option><option value="alamat" ' + (u.urut === 'alamat' ? 'selected' : '') + '>Urut: Alamat</option></select></div><div class="mt-3">' +
    items.map(x => { const on = !!u.picked[x.t.id_tagihan]; return '<label class="card-x pick mb-2 ' + (on ? '' : 'off') + '" style="padding:12px;cursor:pointer"><input type="checkbox" class="chk" ' + (on ? 'checked' : '') + ' onchange="massalPick(\'' + x.t.id_tagihan + '\',this.checked)"><div class="flex-grow-1 min-w-0"><div class="d-flex justify-content-between gap-2"><strong class="text-truncate">' + esc(x.c.nama_pelanggan) + '</strong><span class="num text-primary-c">' + rp(x.t.nominal) + '</span></div><div class="text-3" style="font-size:12px">' + esc(x.c.id_cust) + ' · ' + esc(x.c.alamat || '-') + '</div><div class="mt-1"><span class="badge-x b-neutral">' + esc(x.c.paket) + '</span> <span class="badge-x b-warn">' + esc(bulanShort(x.t.bulan_tagihan)) + '</span>' + (x.extra ? ' <span class="badge-x b-bad">+' + x.extra + ' bln tunggakan</span>' : '') + '</div></div></label>'; }).join('') + '</div>';
  const sel = items.filter(x => u.picked[x.t.id_tagihan]), tot = sel.reduce((a, x) => a + x.t.nominal, 0);
  h += '<div class="card-x sticky-total mt-3" style="box-shadow:var(--shadow-2)"><div class="d-flex justify-content-between align-items-end"><div><div class="k text-3" style="font-size:10px;font-weight:700;letter-spacing:.04em">Total Tagihan Dipilih</div><div class="big-amt" id="massalTot">' + rp(tot) + '</div></div><div class="text-end text-2" id="massalN">' + sel.length + ' pelanggan</div></div>' +
    '<div class="seg my-2"><button class="' + (u.metode === 'Tunai' ? 'on' : '') + '" onclick="S.ui.bayar.metode=\'Tunai\';renderMassal()">Tunai (Kolektor)</button><button class="' + (u.metode === 'Transfer' ? 'on' : '') + '" onclick="S.ui.bayar.metode=\'Transfer\';renderMassal()">Transfer</button></div>' +
    '<button class="btn-p btn-block" style="min-height:52px" ' + (sel.length ? '' : 'disabled') + ' onclick="massalProses(this)"><i class="bi bi-printer"></i> Proses Bayar & Cetak ' + sel.length + ' Struk</button></div>';
  $('#bayarBody').innerHTML = h;
}
function massalOdp(v) { const u = S.ui.bayar; u.odp = v; u.picked = {}; massalItems().forEach(x => { u.picked[x.t.id_tagihan] = true; }); renderMassal(); }
function massalPick(id, on) { if (on) S.ui.bayar.picked[id] = true; else delete S.ui.bayar.picked[id]; renderMassal(); }
function massalPickAll(on) { const u = S.ui.bayar; u.picked = {}; if (on) massalItems().forEach(x => { u.picked[x.t.id_tagihan] = true; }); renderMassal(); }
async function massalProses(btn) {
  const u = S.ui.bayar, sel = massalItems().filter(x => u.picked[x.t.id_tagihan]);
  if (!sel.length) return;
  const tot = sel.reduce((a, x) => a + x.t.nominal, 0);
  if (!await confirmBox('Konfirmasi Pembayaran Massal', 'Proses <strong>' + sel.length + ' pembayaran</strong> senilai <strong>' + rp(tot) + '</strong> (' + u.metode + ')? Struk dicetak terpisah untuk tiap pelanggan.', 'Ya, proses')) return;
  await withBusy(btn, async () => {
    try {
      const ids = sel.map(x => x.t.id_tagihan);
      const r = await api('bayar.proses', { id_tagihan: ids, metode: u.metode, cetak: true });
      afterPaid(ids);
      toast(r.receipts.length + ' pembayaran tersimpan (' + rp(r.total) + ').');
      if (S.settings.cetak_otomatis === '1') printFlow(r.receipts, { markIds: [] }); else showReceipts(r.receipts, { markIds: [] });
    } catch (e) { toast(e.message, 'err'); }
  });
}

// ════════════════════════════════════════════════════════
// BAGIAN 8: HALAMAN — CETAK ULANG STRUK
// ════════════════════════════════════════════════════════
PAGES.cetakulang = async function () {
  const [d, st] = await Promise.all([getData('struk.riwayat', {}, { fresh: 30000, onFresh: x => { if (S.page === 'cetakulang' && S.ui.ru) { S.data.riw = x; renderRU(); } } }), getData('setting.get', {}, { fresh: 15000, onFresh: x => { mergeSettings(x.settings); if (S.page === 'cetakulang' && S.ui.ru) renderRU(); } })]);
  mergeSettings(st.settings);
  S.data.riw = d; S.ui.ru = { q: '', odp: '', picked: {} };
  return { html: '<div class="mt-2">' + printerStrip() + '<div class="search-box mb-2"><i class="bi bi-search lead"></i><input class="inp" type="search" placeholder="Cari nama, no struk, atau ID" oninput="ruQ(this.value)" aria-label="Cari struk"></div>' +
    '<select class="sel mb-3" onchange="S.ui.ru.odp=this.value;renderRU()" aria-label="Filter ODP"><option value="">Semua ODP</option>' + d.odp.map(o => '<option value="' + o.id_odp + '">' + esc(o.nama_odp) + '</option>').join('') + '</select><div id="ruList"></div></div>', after: () => { updatePrinterStatus(); renderRU(); } };
};
const ruQ = debounce(v => { S.ui.ru.q = v; renderRU(); }, 150);
function ruFiltered() {
  const u = S.ui.ru, q = u.q.trim().toLowerCase();
  return S.data.riw.riwayat.filter(x => (!u.odp || x.id_odp === u.odp) && (!q || x.nama.toLowerCase().indexOf(q) >= 0 || x.no_struk.toLowerCase().indexOf(q) >= 0 || x.id_cust.toLowerCase().indexOf(q) >= 0)).slice(0, 300);
}
function renderRU() {
  const u = S.ui.ru, list = ruFiltered(), groups = {};
  list.forEach(x => { (groups[x.odp] = groups[x.odp] || []).push(x); });
  const nSel = Object.keys(u.picked).length, massal = cetakMassalOn();
  let h = (massal && S.settings.cetak_ulang_massal === '0' ? '<div class="alert-x alert-warn mb-3"><i class="bi bi-eye-slash"></i><div>Cetak ulang massal dimatikan untuk pengguna lain. Hanya Anda (Super Admin) yang bisa memilih banyak struk.</div></div>' : '') + (!massal ? '<div class="hint mb-2">Pilih satu struk untuk dicetak ulang.</div>' : '') + (list.length ? Object.keys(groups).sort().map(g => {
    const allOn = groups[g].every(x => u.picked[x.id_bayar]);
    return '<div class="card-x mb-3" style="padding:12px"><div class="d-flex align-items-center gap-2 mb-2">' + (massal ? '<input type="checkbox" class="chk" ' + (allOn ? 'checked' : '') + ' onchange="ruPickGroup(\'' + esc(g).replace(/'/g, '') + '\',this.checked)" aria-label="Pilih grup ' + esc(g) + '">' : '') + '<strong class="flex-grow-1"><i class="bi bi-diagram-3 text-primary-c"></i> ' + esc(g) + '</strong><span class="badge-x b-neutral">' + groups[g].length + '</span></div>' +
      groups[g].map(x => '<label class="pick py-2" style="border-top:1px solid var(--border);cursor:pointer"><input type="' + (massal ? 'checkbox' : 'radio" name="ru') + '" class="chk" ' + (u.picked[x.id_bayar] ? 'checked' : '') + ' onchange="ruPick(\'' + x.id_bayar + '\',this.checked)"><div class="flex-grow-1 min-w-0"><div class="d-flex justify-content-between gap-2"><strong class="text-truncate">' + esc(x.nama) + '</strong><span class="num">' + rp(x.jumlah) + '</span></div><div class="text-3" style="font-size:12px">' + esc(x.no_struk) + ' · ' + esc(tglID(x.tanggal)) + '</div><span class="badge-x ' + (x.jumlah_cetak ? 'b-neutral' : 'b-warn') + '">' + (x.jumlah_cetak ? 'Dicetak ' + x.jumlah_cetak + 'x' : 'Belum dicetak') + '</span></div></label>').join('') + '</div>';
  }).join('') : emptyBox('bi-receipt-cutoff', 'Tidak ada struk ditemukan (90 hari terakhir).'));
  h += '<div class="card-x sticky-total" style="box-shadow:var(--shadow-2)"><button class="btn-p btn-block" ' + (nSel ? '' : 'disabled') + ' onclick="ruPrint(this)"><i class="bi bi-printer"></i> ' + (massal ? 'Cetak ulang ' + nSel + ' struk' : 'Cetak ulang struk') + '</button></div>';
  $('#ruList').innerHTML = h;
}
function ruPick(id, on) { if (!cetakMassalOn()) S.ui.ru.picked = {}; if (on) S.ui.ru.picked[id] = true; else delete S.ui.ru.picked[id]; renderRU(); }
function ruPickGroup(g, on) { if (!cetakMassalOn()) return; ruFiltered().filter(x => x.odp === g).forEach(x => { if (on) S.ui.ru.picked[x.id_bayar] = true; else delete S.ui.ru.picked[x.id_bayar]; }); renderRU(); }
async function ruPrint(btn) {
  const ids = Object.keys(S.ui.ru.picked); if (!ids.length) return;
  await withBusy(btn, async () => {
    try {
      const r = await api('struk.cetakUlang', { ids: ids });
      S.data.riw.riwayat.forEach(x => { if (S.ui.ru.picked[x.id_bayar]) x.jumlah_cetak++; });
      S.ui.ru.picked = {}; renderRU();
      if (S.settings.cetak_otomatis === '1') printFlow(r.receipts, {}); else showReceipts(r.receipts, {});
    } catch (e) { toast(e.message, 'err'); }
  });
}

// ════════════════════════════════════════════════════════
// BAGIAN 9: HALAMAN — PELANGGAN
// ════════════════════════════════════════════════════════
PAGES.pelanggan = async function () {
  S.data.pel = await getData('pelanggan.list', {}, { fresh: 60000, onFresh: x => { if (S.page === 'pelanggan') { S.data.pel = x; renderPel(); } } });
  S.ui.pel = S.ui.pel || { q: '', odp: '', st: 'semua' };
  const d = S.data.pel, aktif = d.pelanggan.filter(c => c.status === 'Aktif').length;
  return { html: '<div class="d-flex justify-content-between align-items-start gap-2 mt-2"><div><h2 class="h-font fw-bold mb-0" style="font-size:24px">Data Pelanggan</h2><div class="text-3">' + aktif + ' aktif / ' + d.pelanggan.length + ' total</div></div><button class="btn-p btn-sm" onclick="custForm()"><i class="bi bi-person-plus"></i> Tambah</button></div><div id="pelBanner" class="mt-3"></div>' +
    '<div class="search-box my-3"><i class="bi bi-search lead"></i><input class="inp" id="pelQ" type="search" placeholder="Cari nama, CUST-xxxx, atau no HP" value="' + esc(S.ui.pel.q) + '" oninput="pelQ(this.value)" aria-label="Cari pelanggan"></div>' +
    '<div class="grid-2 mb-2"><select class="sel" id="pelOdp" onchange="S.ui.pel.odp=this.value;renderPel()" aria-label="Filter ODP"><option value="">Semua ODP (' + d.odp.length + ')</option>' + d.odp.map(o => '<option value="' + o.id_odp + '" ' + (S.ui.pel.odp === o.id_odp ? 'selected' : '') + '>' + esc(o.nama_odp) + ' (' + o.terpakai + ')</option>').join('') + '</select><div class="chips" id="pelChips"></div></div><div id="pelDist"></div><div id="pelList" class="grid-auto mt-3"></div>', after: renderPel };
};
const pelQ = debounce(v => { S.ui.pel.q = v; renderPel(); }, 150);
function renderPel() {
  const d = S.data.pel, u = S.ui.pel, q = u.q.trim().toLowerCase(), qd = digits(q);
  const penuh = d.odp.filter(o => o.persen >= 100);
  $('#pelBanner').innerHTML = penuh.length ? '<div class="alert-x alert-bad"><i class="bi bi-exclamation-triangle-fill"></i><div><strong>KAPASITAS PENUH</strong> · ' + penuh.map(o => esc(o.nama_odp) + ' (' + o.terpakai + '/' + o.kapasitas + ')').join(', ') + '. Alihkan sambungan baru ke ODP lain.</div></div>' : '';
  const cnt = { semua: d.pelanggan.length, Aktif: 0, Nonaktif: 0, belum: 0 };
  d.pelanggan.forEach(c => { cnt[c.status]++; if (c.belum_n) cnt.belum++; });
  $('#pelChips').innerHTML = [['semua', 'Semua'], ['Aktif', 'Aktif'], ['belum', 'Belum Bayar'], ['Nonaktif', 'Nonaktif']].map(f => '<button class="fchip ' + (u.st === f[0] ? 'on' : '') + '" onclick="S.ui.pel.st=\'' + f[0] + '\';renderPel()">' + f[1] + ' <span class="cnt">' + cnt[f[0]] + '</span></button>').join('');
  const pk = {}; d.pelanggan.filter(c => c.status === 'Aktif').forEach(c => { pk[c.paket] = (pk[c.paket] || 0) + 1; });
  const cols = ['var(--primary)', '#818CF8', 'var(--tertiary)', '#F59E0B', '#EC4899']; const keys = Object.keys(pk);
  $('#pelDist').innerHTML = keys.length ? '<div class="card-x"><div class="d-flex justify-content-between mb-2"><strong style="font-size:11px;letter-spacing:.04em" class="text-3">Distribusi Paket Aktif</strong></div><div class="stack-bar">' + keys.map((k, i) => '<i style="width:' + (pk[k] / aktifN(d) * 100) + '%;background:' + cols[i % 5] + '"></i>').join('') + '</div><div class="d-flex flex-wrap gap-3 mt-2" style="font-size:12px">' + keys.map((k, i) => '<span class="d-flex align-items-center gap-1"><span class="dot" style="background:' + cols[i % 5] + '"></span>' + esc(k) + ' <strong>' + pk[k] + '</strong></span>').join('') + '</div></div>' : '';
  let list = d.pelanggan.filter(c => (!u.odp || c.id_odp === u.odp) && (u.st === 'semua' || (u.st === 'belum' ? c.belum_n > 0 : c.status === u.st)));
  if (q) list = list.filter(c => c.nama_pelanggan.toLowerCase().indexOf(q) >= 0 || c.id_cust.toLowerCase().indexOf(q) >= 0 || (qd.length >= 3 && digits(c.no_hp).indexOf(qd) >= 0));
  const total = list.length; list = list.slice(0, 60);
  $('#pelList').innerHTML = list.length ? list.map(c => {
    const off = c.status !== 'Aktif';
    return '<div class="card-x"><div class="d-flex gap-3"><div class="ava">' + esc(initials(c.nama_pelanggan)) + '</div><div class="flex-grow-1 min-w-0"><div class="d-flex justify-content-between align-items-start gap-2"><div class="min-w-0"><div class="fw-bold text-truncate" style="font-size:16px">' + esc(c.nama_pelanggan) + '</div><div class="text-3" style="font-size:11px;font-family:monospace">' + esc(c.id_cust) + '</div></div><div class="text-end"><span class="badge-x ' + (off ? 'b-bad' : 'b-ok') + '">' + c.status + '</span><div class="mt-1">' + (c.belum_n ? '<span class="badge-x b-warn">Belum Lunas' + (c.belum_n > 1 ? ' ×' + c.belum_n : '') + '</span>' : '<span class="badge-x b-neutral">Lunas</span>') + '</div></div></div></div></div>' +
      '<div class="kv mt-3"><div class="d-flex justify-content-between"><strong><i class="bi bi-speedometer2 text-primary-c"></i> ' + esc(c.paket) + '</strong><span class="num text-primary-c">' + rp(c.harga) + '/bln</span></div><div class="text-2 mt-1" style="font-size:12px"><i class="bi bi-diagram-3"></i> ' + esc(odpNameOf(d.odp, c.id_odp)) + '</div></div>' +
      '<div class="text-2 mt-2" style="font-size:12px"><i class="bi bi-geo-alt"></i> ' + esc(c.alamat || '-') + '</div><div class="d-flex justify-content-between text-3 mt-1" style="font-size:12px"><span>Pasang: ' + esc(tglID(c.tgl_pasang)) + '</span><span class="num" style="font-weight:600">' + esc(c.no_hp || '-') + '</span></div>' +
      '<div class="d-flex gap-2 mt-3"><button class="btn-t flex-grow-1" onclick="custForm(\'' + c.id_cust + '\')"><i class="bi bi-pencil-square"></i> Detail & Ubah</button><button class="btn-d btn-sm" aria-label="Hapus pelanggan" onclick="custDel(\'' + c.id_cust + '\')"><i class="bi bi-trash3"></i></button></div></div>';
  }).join('') + (total > 60 ? '<div class="hint text-center">Menampilkan 60 dari ' + total + '. Persempit dengan pencarian.</div>' : '') : emptyBox('bi-people', 'Tidak ada pelanggan sesuai filter.');
}
function aktifN(d) { return d.pelanggan.filter(c => c.status === 'Aktif').length || 1; }
function custForm(id) {
  const d = S.data.pel, c = id ? d.pelanggan.find(x => x.id_cust === id) : null;
  const v = c || { nama_pelanggan: '', alamat: '', no_hp: '', tgl_pasang: ymd(new Date()), paket: (d.paket[0] || {}).nama_paket, id_odp: '', status: 'Aktif' };
  openModal({ title: c ? 'Ubah Pelanggan' : 'Tambah Pelanggan',
    body: '<div class="fld"><label>Nama Pelanggan *</label><input class="inp" id="fNama" maxlength="80" value="' + esc(v.nama_pelanggan) + '"></div><div class="grid-2"><div class="fld"><label>No HP / WhatsApp</label><input class="inp" id="fHp" inputmode="tel" value="' + esc(v.no_hp) + '"></div><div class="fld"><label>Tanggal Pasang</label><input class="inp" id="fTgl" type="date" value="' + esc(v.tgl_pasang) + '"></div></div><div class="fld"><label>Alamat</label><textarea class="txa" id="fAlamat">' + esc(v.alamat) + '</textarea></div>' +
      '<div class="grid-2"><div class="fld"><label>Paket *</label><select class="sel" id="fPaket">' + d.paket.map(p => '<option ' + (p.nama_paket === v.paket ? 'selected' : '') + ' value="' + esc(p.nama_paket) + '">' + esc(p.nama_paket) + ' — ' + rp(p.harga) + '</option>').join('') + '</select></div><div class="fld"><label>Titik ODP *</label><select class="sel" id="fOdp"><option value="">— Pilih —</option>' + d.odp.map(o => { const dis = o.sisa <= 0 && !(c && c.id_odp === o.id_odp && c.status === 'Aktif'); return '<option value="' + o.id_odp + '" ' + (o.id_odp === v.id_odp ? 'selected' : '') + (dis ? ' disabled' : '') + '>' + esc(o.nama_odp) + (dis ? ' (PENUH)' : ' (sisa ' + o.sisa + ')') + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="fld"><label>Status</label><select class="sel" id="fStatus"><option ' + (v.status === 'Aktif' ? 'selected' : '') + '>Aktif</option><option ' + (v.status === 'Nonaktif' ? 'selected' : '') + '>Nonaktif</option></select><div class="hint">Nonaktif = tidak ditagih & tidak memakai port ODP.</div></div>',
    footer: '<button class="btn-s btn-sm" data-bs-dismiss="modal">Batal</button><button class="btn-p btn-sm" id="fSave"><i class="bi bi-save"></i> Simpan</button>' });
  $('#fSave').onclick = e => withBusy(e.currentTarget, async () => {
    try {
      await api('pelanggan.save', { id_cust: c ? c.id_cust : '', nama_pelanggan: $('#fNama').value, no_hp: $('#fHp').value, tgl_pasang: $('#fTgl').value, alamat: $('#fAlamat').value, paket: $('#fPaket').value, id_odp: $('#fOdp').value, status: $('#fStatus').value });
      toast(c ? 'Pelanggan diperbarui.' : 'Pelanggan ditambahkan.'); closeModal(); S.data.pel = await api('pelanggan.list'); renderPel();
    } catch (er) { toast(er.message, 'err'); }
  });
}
async function custDel(id) {
  const c = S.data.pel.pelanggan.find(x => x.id_cust === id);
  if (!await confirmBox('Hapus Pelanggan', 'Hapus <strong>' + esc(c.nama_pelanggan) + '</strong> (' + esc(id) + ')? Tindakan ini tidak bisa dibatalkan.', 'Hapus', true)) return;
  try { await api('pelanggan.delete', { id_cust: id }); toast('Pelanggan dihapus.'); S.data.pel = await api('pelanggan.list'); renderPel(); } catch (e) { toast(e.message, 'err'); }
}

// ════════════════════════════════════════════════════════
// BAGIAN 10: HALAMAN — ODP
// ════════════════════════════════════════════════════════
PAGES.odp = async function () {
  S.data.odp = await getData('odp.list', {}, { fresh: 60000, onFresh: x => { if (S.page === 'odp') go('odp', { noPush: true }); } }); S.ui.odp = S.ui.odp || { q: '', f: 'semua' };
  const l = S.data.odp.odp, kap = l.reduce((a, o) => a + o.kapasitas, 0), pk = l.reduce((a, o) => a + o.terpakai, 0), pct = kap ? Math.round(pk / kap * 100) : 0;
  return { html: '<div class="d-flex justify-content-between align-items-center gap-2 mt-2"><div><h2 class="h-font fw-bold mb-0" style="font-size:24px"><i class="bi bi-diagram-3 text-primary-c"></i> Titik ODP</h2><div class="text-3">' + l.length + ' ODP · ' + pk + '/' + kap + ' port (' + pct + '%)</div></div><button class="btn-p btn-sm" onclick="odpForm()"><i class="bi bi-plus-circle"></i> ODP Baru</button></div>' +
    '<div class="bar mt-3 ' + barClass(pct) + '"><i style="width:' + pct + '%"></i></div><div class="d-flex justify-content-between mt-1 mb-3 text-3" style="font-size:12px"><span>Kapasitas distribusi fiber</span><strong class="text-ok">' + (kap - pk) + ' port siap pasang</strong></div>' +
    '<div class="grid-kpi" style="grid-template-columns:repeat(3,1fr)"><div class="card-x text-center" style="padding:12px"><div class="text-ok" style="font-size:11px;font-weight:700">NORMAL</div><div class="val h-font fw-bold" style="font-size:26px">' + l.filter(o => o.persen < 80).length + '</div></div><div class="card-x text-center" style="padding:12px"><div class="text-warn" style="font-size:11px;font-weight:700">WASPADA</div><div class="h-font fw-bold" style="font-size:26px">' + l.filter(o => o.persen >= 80 && o.persen < 100).length + '</div></div><div class="card-x text-center" style="padding:12px"><div class="text-bad" style="font-size:11px;font-weight:700">PENUH</div><div class="h-font fw-bold" style="font-size:26px">' + l.filter(o => o.persen >= 100).length + '</div></div></div>' +
    '<div class="search-box my-3"><i class="bi bi-search lead"></i><input class="inp" type="search" placeholder="Cari nama atau lokasi ODP" oninput="odpQ(this.value)" aria-label="Cari ODP"></div><div class="chips mb-3" id="odpChips"></div><div id="odpList" class="grid-auto"></div>' +
    '<div class="alert-x alert-info mt-3"><i class="bi bi-cloud-check"></i><div>Port terpakai dihitung otomatis dari pelanggan aktif per ODP. ODP yang masih memiliki pelanggan tidak dapat dihapus.</div></div>', after: renderOdp };
};
const odpQ = debounce(v => { S.ui.odp.q = v; renderOdp(); }, 150);
function renderOdp() {
  const l = S.data.odp.odp, u = S.ui.odp, q = u.q.trim().toLowerCase();
  const n = { semua: l.length, kritis: l.filter(o => o.persen >= 100).length, waspada: l.filter(o => o.persen >= 80).length };
  $('#odpChips').innerHTML = [['semua', 'Semua'], ['kritis', 'Penuh'], ['waspada', 'Waspada ≥80%']].map(f => '<button class="fchip ' + (u.f === f[0] ? 'on' : '') + '" onclick="S.ui.odp.f=\'' + f[0] + '\';renderOdp()">' + f[1] + ' <span class="cnt">' + n[f[0]] + '</span></button>').join('');
  let list = l.filter(o => (u.f === 'semua' || (u.f === 'kritis' ? o.persen >= 100 : o.persen >= 80)) && (!q || o.nama_odp.toLowerCase().indexOf(q) >= 0 || String(o.lokasi).toLowerCase().indexOf(q) >= 0)).sort((a, b) => b.persen - a.persen);
  $('#odpList').innerHTML = list.length ? list.map(o => {
    let ports = ''; for (let i = 1; i <= Math.min(o.kapasitas, 64); i++) ports += '<div class="port ' + (i > o.terpakai ? 'free' : o.persen >= 100 ? 'full' : '') + '">' + i + '</div>';
    return '<div class="card-x" style="border-left:5px solid ' + (o.persen >= 100 ? '#F43F5E' : o.persen >= 80 ? '#F59E0B' : 'var(--primary)') + '"><div class="d-flex justify-content-between align-items-start gap-2"><div class="min-w-0"><div class="fw-bold" style="font-size:17px">' + esc(o.nama_odp) + '</div><div class="text-3 text-truncate" style="font-size:12px"><i class="bi bi-geo-alt"></i> ' + esc(o.lokasi || '-') + '</div></div>' + odpBadge(o) + '</div>' +
      '<div class="grid-2 mt-3" style="grid-template-columns:1fr 1fr"><div class="kv"><div class="k">Port Terisi</div><div class="v">' + o.terpakai + ' / ' + o.kapasitas + '</div></div><div class="kv"><div class="k">Sisa Bebas</div><div class="v ' + (o.sisa ? 'text-ok' : 'text-bad') + '">' + o.sisa + ' Port</div></div></div><div class="ports mt-3">' + ports + '</div>' + (o.kapasitas > 64 ? '<div class="hint">Menampilkan 64 port pertama.</div>' : '') +
      (o.persen >= 100 ? '<div class="alert-x alert-bad mt-3"><i class="bi bi-exclamation-triangle"></i><div>Port habis! Butuh splitter tambahan atau migrasi kabel core.</div></div>' : '') +
      '<div class="d-flex gap-2 mt-3"><button class="btn-t btn-sm flex-grow-1" onclick="S.ui.pel={q:\'\',odp:\'' + o.id_odp + '\',st:\'semua\'};go(\'pelanggan\')"><i class="bi bi-people"></i> ' + o.terpakai + ' Pelanggan</button><button class="btn-s btn-sm" aria-label="Ubah ODP" onclick="odpForm(\'' + o.id_odp + '\')"><i class="bi bi-pencil"></i></button><button class="btn-d btn-sm" aria-label="Hapus ODP" onclick="odpDel(\'' + o.id_odp + '\')"><i class="bi bi-trash3"></i></button></div></div>';
  }).join('') : emptyBox('bi-diagram-3', 'Tidak ada ODP sesuai filter.');
}
function odpForm(id) {
  const o = id ? S.data.odp.odp.find(x => x.id_odp === id) : { nama_odp: '', lokasi: '', kapasitas: 16, keterangan: '' };
  openModal({ title: id ? 'Ubah ODP' : 'ODP Baru',
    body: '<div class="fld"><label>Nama ODP *</label><input class="inp" id="oNama" value="' + esc(o.nama_odp) + '" placeholder="mis. ODP-PASAR-01"></div><div class="fld"><label>Lokasi</label><input class="inp" id="oLok" value="' + esc(o.lokasi) + '"></div><div class="fld"><label>Kapasitas (jumlah port) *</label><input class="inp" id="oKap" type="number" inputmode="numeric" min="1" max="128" value="' + o.kapasitas + '">' + (id ? '<div class="hint">Terpakai saat ini: ' + o.terpakai + ' port.</div>' : '') + '</div><div class="fld"><label>Keterangan</label><textarea class="txa" id="oKet">' + esc(o.keterangan) + '</textarea></div>',
    footer: '<button class="btn-s btn-sm" data-bs-dismiss="modal">Batal</button><button class="btn-p btn-sm" id="oSave"><i class="bi bi-save"></i> Simpan</button>' });
  $('#oSave').onclick = e => withBusy(e.currentTarget, async () => {
    try { await api('odp.save', { id_odp: id || '', nama_odp: $('#oNama').value, lokasi: $('#oLok').value, kapasitas: $('#oKap').value, keterangan: $('#oKet').value }); toast('ODP tersimpan.'); closeModal(); go('odp'); }
    catch (er) { toast(er.message, 'err'); }
  });
}
async function odpDel(id) {
  const o = S.data.odp.odp.find(x => x.id_odp === id);
  if (!await confirmBox('Hapus ODP', 'Hapus <strong>' + esc(o.nama_odp) + '</strong>?', 'Hapus', true)) return;
  try { await api('odp.delete', { id_odp: id }); toast('ODP dihapus.'); go('odp'); } catch (e) { toast(e.message, 'err'); }
}

// ════════════════════════════════════════════════════════
// BAGIAN 11: HALAMAN — PENGELUARAN
// ════════════════════════════════════════════════════════
PAGES.pengeluaran = async function () {
  S.data.keluar = await getData('keluar.list', {}, { fresh: 60000, onFresh: x => { if (S.page === 'pengeluaran') { S.data.keluar = x; renderKeluar(); } } }); const now = new Date();
  S.ui.kl = S.ui.kl || { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now), kat: '', q: '' };
  const u = S.ui.kl;
  return { html: '<div class="d-flex justify-content-between align-items-center gap-2 mt-2"><div><h2 class="h-font fw-bold mb-0" style="font-size:24px">Pengeluaran</h2><div class="text-3">Catat biaya operasional</div></div><button class="btn-p btn-sm" onclick="keluarForm()"><i class="bi bi-plus-circle"></i> Catat</button></div>' +
    '<div class="card-x mt-3"><div class="grid-2"><div class="fld"><label>Dari</label><input class="inp" type="date" value="' + u.from + '" onchange="S.ui.kl.from=this.value;renderKeluar()"></div><div class="fld"><label>Sampai</label><input class="inp" type="date" value="' + u.to + '" onchange="S.ui.kl.to=this.value;renderKeluar()"></div></div><div class="grid-2"><select class="sel" onchange="S.ui.kl.kat=this.value;renderKeluar()" aria-label="Kategori"><option value="">Semua Kategori</option>' + S.data.keluar.kategori.map(k => '<option ' + (u.kat === k ? 'selected' : '') + '>' + esc(k) + '</option>').join('') + '</select><input class="inp" type="search" placeholder="Cari keterangan" value="' + esc(u.q) + '" oninput="klQ(this.value)" aria-label="Cari"></div></div><div id="klSum" class="mt-3"></div><div id="klList" class="grid-auto mt-3"></div>', after: renderKeluar };
};
const klQ = debounce(v => { S.ui.kl.q = v; renderKeluar(); }, 150);
function renderKeluar() {
  const u = S.ui.kl, q = u.q.trim().toLowerCase();
  const list = S.data.keluar.rows.filter(r => r.tanggal >= u.from && r.tanggal <= u.to && (!u.kat || r.kategori === u.kat) && (!q || r.keterangan.toLowerCase().indexOf(q) >= 0));
  $('#klSum').innerHTML = '<div class="card-x tint d-flex justify-content-between align-items-center"><div><div class="text-3" style="font-size:11px;font-weight:700">Total Pengeluaran</div><div class="big-amt text-bad">' + rp(list.reduce((a, r) => a + r.nominal, 0)) + '</div></div><span class="badge-x b-neutral">' + list.length + ' catatan</span></div>';
  $('#klList').innerHTML = list.length ? list.map(r => '<div class="card-x"><div class="d-flex justify-content-between gap-2"><div class="min-w-0"><div class="fw-bold">' + esc(r.keterangan) + '</div><div class="text-3" style="font-size:12px">' + esc(tglID(r.tanggal)) + ' · oleh ' + esc(r.dicatat_oleh) + '</div></div><div class="num text-bad">' + rp(r.nominal) + '</div></div><div class="d-flex justify-content-between align-items-center mt-2"><span class="badge-x b-info">' + esc(r.kategori) + '</span><div class="d-flex gap-2"><button class="icon-btn" aria-label="Ubah" onclick="keluarForm(\'' + r.id_keluar + '\')"><i class="bi bi-pencil"></i></button><button class="icon-btn text-bad" aria-label="Hapus" onclick="keluarDel(\'' + r.id_keluar + '\')"><i class="bi bi-trash3"></i></button></div></div></div>').join('') : emptyBox('bi-wallet2', 'Belum ada pengeluaran pada filter ini.');
}
function keluarForm(id) {
  const r = id ? S.data.keluar.rows.find(x => x.id_keluar === id) : { tanggal: ymd(new Date()), keterangan: '', kategori: S.data.keluar.kategori[0], nominal: '' };
  openModal({ title: id ? 'Ubah Pengeluaran' : 'Pengeluaran Baru',
    body: '<div class="fld"><label>Tanggal *</label><input class="inp" id="kTgl" type="date" value="' + r.tanggal + '"></div><div class="fld"><label>Kategori</label><select class="sel" id="kKat">' + S.data.keluar.kategori.map(k => '<option ' + (k === r.kategori ? 'selected' : '') + '>' + esc(k) + '</option>').join('') + '</select></div><div class="fld"><label>Keterangan *</label><input class="inp" id="kKet" value="' + esc(r.keterangan) + '" placeholder="mis. Nota BBM, kabel dropcore"></div><div class="fld"><label>Nominal (Rp) *</label><input class="inp num" id="kNom" inputmode="numeric" value="' + (r.nominal ? Number(r.nominal).toLocaleString('id-ID') : '') + '" oninput="const n=numInput(this.value);this.value=n?n.toLocaleString(\'id-ID\'):\'\'"></div>',
    footer: '<button class="btn-s btn-sm" data-bs-dismiss="modal">Batal</button><button class="btn-p btn-sm" id="kSave"><i class="bi bi-save"></i> Simpan</button>' });
  $('#kSave').onclick = e => withBusy(e.currentTarget, async () => {
    try { await api('keluar.save', { id_keluar: id || '', tanggal: $('#kTgl').value, kategori: $('#kKat').value, keterangan: $('#kKet').value, nominal: numInput($('#kNom').value) }); toast('Pengeluaran tersimpan.'); closeModal(); S.data.keluar = await api('keluar.list'); renderKeluar(); }
    catch (er) { toast(er.message, 'err'); }
  });
}
async function keluarDel(id) {
  if (!await confirmBox('Hapus Pengeluaran', 'Hapus catatan pengeluaran ini?', 'Hapus', true)) return;
  try { await api('keluar.delete', { id_keluar: id }); toast('Dihapus.'); S.data.keluar = await api('keluar.list'); renderKeluar(); } catch (e) { toast(e.message, 'err'); }
}

// ════════════════════════════════════════════════════════
// BAGIAN 12: HALAMAN — LAPORAN KEUANGAN (+ cetak PDF)
// ════════════════════════════════════════════════════════
function periodeRange(k) {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  if (k === 'lalu') return [ymd(new Date(y, m - 1, 1)), ymd(new Date(y, m, 0))];
  if (k === 'kuartal') { const q = Math.floor(m / 3) * 3; return [ymd(new Date(y, q, 1)), ymd(new Date(y, q + 3, 0))]; }
  return [ymd(new Date(y, m, 1)), ymd(new Date(y, m + 1, 0))];
}
PAGES.laporan = async function () {
  const u = S.ui.lap = S.ui.lap || { k: 'ini', from: '', to: '', tab: 'ringkasan' };
  if (u.k !== 'custom') { const r = periodeRange(u.k); u.from = r[0]; u.to = r[1]; }
  const d = S.data.lap = await getData('laporan', { from: u.from, to: u.to }, { fresh: 120000, onFresh: x => { if (S.page === 'laporan') go('laporan', { noPush: true }); } });
  const adm = isAdminLvl();
  return { html: '<div class="d-flex justify-content-between align-items-start gap-2 mt-2"><div><h2 class="h-font fw-bold mb-0" style="font-size:24px">Laporan Keuangan</h2><div class="text-3">Rekap pembukuan & arus kas</div></div><button class="btn-p btn-sm" onclick="cetakLaporan()"><i class="bi bi-file-earmark-pdf"></i> Cetak PDF</button></div>' +
    '<div class="chips my-3">' + [['ini', 'Bulan Ini'], ['lalu', 'Bulan Lalu'], ['kuartal', 'Kuartal Ini'], ['custom', 'Pilih Tanggal']].map(f => '<button class="fchip ' + (u.k === f[0] ? 'on' : '') + '" onclick="lapPeriode(\'' + f[0] + '\')">' + f[1] + '</button>').join('') + '</div>' +
    (u.k === 'custom' ? '<div class="card-x mb-3"><div class="grid-2"><div class="fld mb-0"><label>Dari</label><input class="inp" type="date" id="lpF" value="' + u.from + '"></div><div class="fld mb-0"><label>Sampai</label><input class="inp" type="date" id="lpT" value="' + u.to + '"></div></div><button class="btn-p btn-sm mt-2" onclick="lapCustom()">Terapkan</button></div>' : '') +
    '<div class="hero"><div class="sub">Laba Bersih Operasional · ' + esc(tglID(d.from)) + ' – ' + esc(tglID(d.to)) + '</div><div class="h-font fw-bold" style="font-size:34px;letter-spacing:-.02em">' + rp(d.laba) + '</div><div class="divider" style="background:rgba(255,255,255,.25)"></div><div class="d-flex justify-content-between flex-wrap gap-2"><span>Margin: <strong>' + d.margin + '%</strong></span>' + (d.pertumbuhan !== null ? '<span class="chip" style="background:rgba(255,255,255,.2);color:#fff"><i class="bi bi-graph-up-arrow"></i> ' + (d.pertumbuhan >= 0 ? '+' : '') + d.pertumbuhan + '% vs periode lalu</span>' : '') + '</div></div>' +
    '<div class="grid-2 mt-3"><div class="card-x"><div class="d-flex justify-content-between"><span class="ico badge-x b-info"><i class="bi bi-arrow-down"></i></span><span class="text-3">' + d.n_masuk + ' transaksi</span></div><div class="text-3 mt-2" style="font-size:12px">Total Pemasukan</div><div class="h-font fw-bold text-primary-c" style="font-size:22px">' + rp(d.masuk) + '</div></div><div class="card-x"><div class="d-flex justify-content-between"><span class="badge-x b-bad"><i class="bi bi-arrow-up"></i></span><span class="text-3">' + d.n_keluar + ' transaksi</span></div><div class="text-3 mt-2" style="font-size:12px">Total Pengeluaran</div><div class="h-font fw-bold text-bad" style="font-size:22px">' + rp(d.keluar) + '</div></div></div>' +
    '<div class="seg my-3" id="lapTabs">' + [['ringkasan', 'Ringkasan'], ['keluar', 'Pengeluaran (' + d.n_keluar + ')'], ['masuk', 'Pemasukan (' + d.n_masuk + ')']].map(t => '<button class="' + (u.tab === t[0] ? 'on' : '') + '" onclick="lapTab(\'' + t[0] + '\')">' + t[1] + '</button>').join('') + '</div><div id="lapBody"></div>' +
    (adm ? '<div class="card-x tint mt-3 row-card"><div class="ava" style="background:var(--primary);color:#fff"><i class="bi bi-wallet2"></i></div><div class="flex-grow-1"><strong>Pengeluaran Baru?</strong><div class="text-3" style="font-size:12px">Catat nota BBM, kabel, atau bandwidth.</div></div><button class="btn-p btn-sm" onclick="go(\'pengeluaran\')">+ Catat</button></div>' : ''), after: renderLapBody };
};
function lapPeriode(k) { S.ui.lap.k = k; if (k !== 'custom') go('laporan'); else { S.ui.lap.k = 'custom'; go('laporan'); } }
function lapCustom() { const f = $('#lpF').value, t = $('#lpT').value; if (!f || !t) { toast('Isi kedua tanggal.', 'err'); return; } S.ui.lap.from = f; S.ui.lap.to = t; go('laporan'); }
function lapTab(t) { S.ui.lap.tab = t; $$('#lapTabs button').forEach((b, i) => b.classList.toggle('on', ['ringkasan', 'keluar', 'masuk'][i] === t)); renderLapBody(); }
function renderLapBody() {
  const d = S.data.lap, t = S.ui.lap.tab, cols = ['#2563EB', '#818CF8', '#0D9488', '#F59E0B', '#EC4899', '#94A3B8'];
  let h;
  if (t === 'ringkasan') h = '<div class="card-x"><div class="fw-bold mb-3"><i class="bi bi-pie-chart text-primary-c"></i> Distribusi Pengeluaran</div>' + (d.distribusi.length ? '<div class="stack-bar mb-3">' + d.distribusi.map((x, i) => '<i style="width:' + x.persen + '%;background:' + cols[i % 6] + '"></i>').join('') + '</div>' + d.distribusi.map((x, i) => '<div class="d-flex justify-content-between align-items-center py-2" style="border-top:1px solid var(--border)"><span class="d-flex align-items-center gap-2"><span class="dot" style="background:' + cols[i % 6] + '"></span>' + esc(x.kategori) + '</span><span class="text-end"><strong class="num">' + rp(x.total) + '</strong><div class="text-3" style="font-size:11px">' + x.persen + '%</div></span></div>').join('') : emptyBox('bi-pie-chart', 'Belum ada pengeluaran pada periode ini.')) + '</div>';
  else if (t === 'keluar') h = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th class="r">Nominal</th></tr></thead><tbody>' + (d.pengeluaran.map(x => '<tr><td>' + esc(tglID(x.tanggal)) + '</td><td>' + esc(x.keterangan) + '</td><td>' + esc(x.kategori) + '</td><td class="r">' + rp(x.nominal) + '</td></tr>').join('') || '<tr><td colspan="4" class="text-center text-3">Tidak ada data</td></tr>') + '</tbody></table></div>';
  else h = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>No Struk</th><th>Pelanggan</th><th>Bulan</th><th>Metode</th><th class="r">Jumlah</th></tr></thead><tbody>' + (d.pemasukan.slice(0, 500).map(x => '<tr><td>' + esc(tglID(x.tanggal)) + '</td><td>' + esc(x.no_struk) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(bulanShort(x.bulan)) + '</td><td>' + esc(x.metode) + '</td><td class="r">' + rp(x.jumlah) + '</td></tr>').join('') || '<tr><td colspan="6" class="text-center text-3">Tidak ada data</td></tr>') + '</tbody></table></div>';
  $('#lapBody').innerHTML = h;
}
function cetakLaporan() {
  const d = S.data.lap;
  $('#printArea').innerHTML = '<div class="lap"><h2>' + esc(d.usaha) + ' — Laporan Keuangan</h2><div>Periode: ' + esc(tglID(d.from)) + ' s/d ' + esc(tglID(d.to)) + ' · Dicetak: ' + esc(tglID(ymd(new Date()))) + ' oleh ' + esc(S.user.nama_user) + '</div>' +
    '<table><tr><th>Total Pemasukan</th><th>Total Pengeluaran</th><th>Laba Bersih</th><th>Margin</th></tr><tr><td>' + rp(d.masuk) + '</td><td>' + rp(d.keluar) + '</td><td><strong>' + rp(d.laba) + '</strong></td><td>' + d.margin + '%</td></tr></table>' +
    '<h3>Distribusi Pengeluaran</h3><table><tr><th>Kategori</th><th class="r">Total</th><th class="r">%</th></tr>' + d.distribusi.map(x => '<tr><td>' + esc(x.kategori) + '</td><td class="r">' + rp(x.total) + '</td><td class="r">' + x.persen + '%</td></tr>').join('') + '</table>' +
    '<h3>Rincian Pemasukan (' + d.n_masuk + ')</h3><table><tr><th>Tanggal</th><th>No Struk</th><th>Pelanggan</th><th>Bulan</th><th>Metode</th><th class="r">Jumlah</th></tr>' + d.pemasukan.map(x => '<tr><td>' + esc(tglID(x.tanggal)) + '</td><td>' + esc(x.no_struk) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(bulanShort(x.bulan)) + '</td><td>' + esc(x.metode) + '</td><td class="r">' + rp(x.jumlah) + '</td></tr>').join('') + '</table>' +
    '<h3>Rincian Pengeluaran (' + d.n_keluar + ')</h3><table><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th class="r">Nominal</th></tr>' + d.pengeluaran.map(x => '<tr><td>' + esc(tglID(x.tanggal)) + '</td><td>' + esc(x.keterangan) + '</td><td>' + esc(x.kategori) + '</td><td class="r">' + rp(x.nominal) + '</td></tr>').join('') + '</table></div>';
  let st = $('#pageStyle'); if (!st) { st = document.createElement('style'); st.id = 'pageStyle'; document.head.appendChild(st); }
  st.textContent = '@page{size:A4;margin:12mm}';
  toast('Pada dialog cetak, pilih "Simpan sebagai PDF".', 'warn');
  setTimeout(() => { window.print(); setTimeout(() => { $('#printArea').innerHTML = ''; }, 1500); }, 300);
}

// ════════════════════════════════════════════════════════
// BAGIAN 13: HALAMAN — PENGATURAN PRINTER & STRUK
// ════════════════════════════════════════════════════════
function sampleReceipt() {
  const n = new Date(); const t = ymd(n) + ' ' + String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0') + ':00';
  return { tanggal: t, kasir: S.user.nama_user, no_struk: 'STR-' + ymd(n).replace(/-/g, '') + '-0001', id_cust: 'CUST-0001', nama: 'Budi Santoso', odp: 'ODP-RW04-A', paket: '20M Family', bulan: ymd(n).slice(0, 7), jumlah: 175000, diterima: 175000, kembali: 0, metode: 'Tunai', cetak_ulang: false };
}
PAGES.pengaturan = async function () {
  const adm = isAdminLvl();
  const [st, pk] = await Promise.all([api('setting.get'), adm ? api('paket.list') : Promise.resolve(null)]);
  mergeSettings(st.settings); S.ui.setSaved = Object.assign({}, S.settings); S.data.paket = pk ? pk.paket : [];
  const s = S.settings, sg = (name, vals) => '<div class="seg" data-pref="' + name + '">' + vals.map(v => '<button type="button" data-v="' + v[0] + '" class="' + (s[name] === v[0] ? 'on' : '') + '" onclick="setPref(\'' + name + '\',\'' + v[0] + '\')">' + v[1] + '</button>').join('') + '</div>';
  let h = '<div class="mt-2"><div class="card-x"><div class="fw-bold mb-3"><i class="bi bi-bluetooth text-primary-c"></i> 1. Koneksi Printer</div><div class="pr-status alert-x alert-info mb-3"></div><div class="grid-2"><button class="btn-p" onclick="btPairUI(this)"><i class="bi bi-bluetooth"></i> Hubungkan / Pindai</button><button class="btn-t" onclick="testPrint(this)"><i class="bi bi-printer"></i> Uji Cetak</button></div>' +
    '<div class="fld mt-3 mb-0"><label>Metode Komunikasi Pencetak</label>' + [['bluetooth', 'bi-bluetooth', 'Printer Bluetooth Thermal (ESC/POS)', 'Koneksi langsung via Web Bluetooth API.'], ['browser', 'bi-window', 'Printer Biasa / Browser', 'Dialog cetak bawaan perangkat (window.print / PDF).'], ['rawbt', 'bi-box-arrow-up-right', 'Aplikasi RawBT / Print Service (cadangan)', 'Dipakai bila Web Bluetooth tidak didukung (mis. iPhone/iOS).']].map(m => '<label class="card-x flat row-card mb-2" style="padding:12px;cursor:pointer"><span class="ava" style="border-radius:12px"><i class="bi ' + m[1] + '"></i></span><span class="flex-grow-1"><strong>' + m[2] + '</strong><div class="text-3" style="font-size:12px">' + m[3] + '</div></span><input type="radio" class="chk" name="jp" ' + (s.jenis_printer === m[0] ? 'checked' : '') + ' onchange="setPref(\'jenis_printer\',\'' + m[0] + '\')"></label>').join('') + '</div></div>' +
    '<div class="card-x mt-3"><div class="fw-bold mb-3"><i class="bi bi-file-earmark-text text-primary-c"></i> 2. Format Kertas & Pengumpan</div><div class="fld"><label>Lebar Roll Kertas</label>' + sg('lebar_kertas', [['58', '58 mm (Saku Kasir)'], ['80', '80 mm (Desktop POS)']]) + '</div><div class="fld"><label>Kepadatan Huruf</label>' + sg('font_density', [['kecil', 'Kecil'], ['normal', 'Normal'], ['tebal', 'Tebal']]) + '</div>' +
    '<div class="d-flex align-items-center gap-3"><div class="flex-grow-1"><strong>Cetak Otomatis Setelah Bayar</strong><div class="text-3" style="font-size:12px">Langsung kirim struk ke printer saat transaksi tersimpan. Jika mati, tampil pratinjau dulu.</div></div><label class="switch"><input type="checkbox" id="swAuto" ' + (s.cetak_otomatis === '1' ? 'checked' : '') + ' onchange="setPref(\'cetak_otomatis\',this.checked?\'1\':\'0\')" aria-label="Cetak otomatis"><span></span></label></div>' + '<div class="d-flex align-items-center gap-3 mt-3" style="border-top:1px solid var(--border);padding-top:14px"><div class="flex-grow-1"><strong>Potong kertas otomatis (auto-cutter)</strong><div class="text-3" style="font-size:12px">Printer memotong kertas setelah <b>setiap struk</b>, termasuk saat cetak massal. Hanya untuk printer thermal yang punya pisau pemotong.</div></div><label class="switch"><input type="checkbox" id="swCut" ' + (s.auto_cut === '1' ? 'checked' : '') + ' onchange="setPref(\'auto_cut\',this.checked?\'1\':\'0\')" aria-label="Potong kertas otomatis"><span></span></label></div>' +
    '<div id="cutOpts" style="' + (s.auto_cut === '1' ? '' : 'display:none') + '"><div class="fld mt-3"><label>Cara memotong</label><select class="sel" onchange="setPref(\'cut_mode\',this.value)" aria-label="Cara memotong">' + [['full', 'Potong penuh (standar)'], ['partial', 'Potong sebagian (kertas masih menyambung)'], ['gsv0', 'Potong penuh, printer lama (GS V 0)'], ['esci', 'Potong penuh, perintah ESC i (printer tertentu)']].map(o => '<option value="' + o[0] + '" ' + (s.cut_mode === o[0] ? 'selected' : '') + '>' + o[1] + '</option>').join('') + '</select><div class="hint">Jika kertas tidak terpotong, coba pilihan lain.</div></div>' +
    '<div class="fld"><label>Dorong kertas sebelum dipotong (baris kosong)</label><input class="inp" type="number" inputmode="numeric" min="0" max="10" value="' + esc(s.cut_feed) + '" oninput="setPref(\'cut_feed\',String(Math.max(0, Math.min(10, parseInt(this.value, 10) || 0))))" aria-label="Baris dorong kertas"><div class="hint">Agar tulisan terakhir tidak ikut terpotong. Naikkan bila bagian bawah struk terpotong.</div></div>' +
    '<button class="btn-t btn-block" onclick="testPrint(this, 2)"><i class="bi bi-scissors"></i> Uji potong (cetak 2 struk contoh)</button></div>' + '</div>';
  if (adm) h += '<div class="card-x mt-3"><div class="fw-bold mb-3"><i class="bi bi-pencil-square text-primary-c"></i> 3. Kustomisasi Isi Struk</div><div class="fld"><label>Nama Usaha (Header Baris 1)</label><input class="inp" id="sHead1" maxlength="40" value="' + esc(s.header_1) + '" oninput="refreshPreview()"></div><div class="fld"><label>Sub-Header / Info Kontak (alamat, WA)</label><textarea class="txa" id="sHead2" oninput="refreshPreview()">' + esc(s.header_2) + '</textarea></div><div class="fld"><label>Footer Struk</label><textarea class="txa" id="sFoot" oninput="refreshPreview()">' + esc(s.footer) + '</textarea></div><div class="fld"><label>Catatan Kaki Tambahan (opsional)</label><textarea class="txa" id="sCat" oninput="refreshPreview()">' + esc(s.catatan) + '</textarea></div>' +
    [['swOdp', 'tampil_odp', 'Tampilkan Titik ODP', 'Membantu teknisi memeriksa lokasi kabel pelanggan.'], ['swWm', 'watermark_ulang', 'Penanda "CETAK ULANG"', 'Mencegah penyalahgunaan struk sebagai tanda terima ganda.']].map(x => '<div class="d-flex align-items-center gap-3 mb-3"><div class="flex-grow-1"><strong>' + x[2] + '</strong><div class="text-3" style="font-size:12px">' + x[3] + '</div></div><label class="switch"><input type="checkbox" id="' + x[0] + '" ' + (s[x[1]] === '1' ? 'checked' : '') + ' onchange="refreshPreview()" aria-label="' + x[2] + '"><span></span></label></div>').join('') + '</div>';
  h += '<div class="card-x mt-3"><div class="d-flex justify-content-between align-items-center mb-2"><div class="fw-bold"><i class="bi bi-eye text-primary-c"></i> ' + (adm ? '4. ' : '3. ') + 'Pratinjau Struk (<span id="prevMm">' + s.lebar_kertas + '</span> mm)</div><span class="badge-x b-ok">Live</span></div><div class="rcpt-wrap" id="prevBox"></div></div>' +
    '<button class="btn-p btn-block mt-3" style="min-height:52px" onclick="saveSettings(this)"><i class="bi bi-save"></i> Simpan Perubahan Pengaturan</button><button class="btn-s btn-block mt-2" onclick="testPrint(this)"><i class="bi bi-printer"></i> Cetak Lembar Tes Struk</button>';
  if (adm) h += '<div class="card-x mt-4"><div class="d-flex justify-content-between align-items-center mb-2"><div class="fw-bold"><i class="bi bi-tags text-primary-c"></i> Paket & Harga Bulanan</div><button class="btn-t btn-sm" onclick="paketForm()"><i class="bi bi-plus"></i> Paket</button></div><div id="paketList"></div></div>' +
    (generateOn() ? '<div class="card-x mt-3"><div class="fw-bold mb-1"><i class="bi bi-arrow-repeat text-primary-c"></i> Tagihan otomatis</div>' + (autoBillOn() ? '' : autoBillNotice('margin-bottom:8px')) + '<div class="text-3 mb-3" style="font-size:12px">Trigger harian jam 01:00 menerbitkan tagihan sejak tanggal 20 (tidak pernah ganda). Tombol di bawah menerbitkan manual untuk bulan ini bila perlu.</div><button class="btn-s" onclick="genTagihan(this)"><i class="bi bi-receipt"></i> Terbitkan tagihan bulan ini</button>' + (S.settings.tampil_generate_tagihan === '0' ? '<div class="hint mt-2">Disembunyikan untuk Admin. Hanya Super Admin yang melihat tombol ini.</div>' : '') + '</div>' : '');
  h += '</div>';
  return { html: h, after: () => { updatePrinterStatus(); refreshPreview(); if (adm) renderPaket(); } };
};
function setPref(k, v) {
  S.settings[k] = v; // draf di memori; baru tersimpan ke server saat tombol Simpan ditekan
  // Perbarui tampilan tombol di tempat (TANPA memuat ulang halaman, agar pilihan tidak tertimpa data server)
  $$('.seg[data-pref="' + k + '"] button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (k === 'jenis_printer') $$('input[name="jp"]').forEach(r => { r.checked = r.getAttribute('onchange').indexOf("'" + v + "'") >= 0; });
  if (k === 'lebar_kertas') { const mm = $('#prevMm'); if (mm) mm.textContent = v; }
  if (k === 'auto_cut') { const co = $('#cutOpts'); if (co) co.style.display = v === '1' ? '' : 'none'; }
  refreshPreview();
  updatePrinterStatus();
}
function refreshPreview() {
  const g = id => $(id);
  if (g('#sHead1')) { S.settings.header_1 = g('#sHead1').value || 'DUO AL NET'; S.settings.header_2 = g('#sHead2').value; S.settings.footer = g('#sFoot').value; S.settings.catatan = g('#sCat').value; S.settings.tampil_odp = g('#swOdp').checked ? '1' : '0'; S.settings.watermark_ulang = g('#swWm').checked ? '1' : '0'; }
  const b = $('#prevBox'); if (!b) return;
  const cls = S.settings.font_density === 'tebal' ? 'tebal' : S.settings.font_density === 'kecil' ? 'kecil' : '';
  b.innerHTML = receiptHTML(buildReceipt(sampleReceipt()), cls) + cutMark() + (S.settings.watermark_ulang === '1' ? receiptHTML(buildReceipt(Object.assign(sampleReceipt(), { cetak_ulang: true })), cls) + cutMark() : '');
}
async function btPairUI(btn) { await withBusy(btn, async () => { try { await btPair(); toast('Terhubung ke ' + S.printer.name + '.'); } catch (e) { toast(e.message, 'err'); } }); }
async function testPrint(btn, n) { await withBusy(btn, async () => { refreshPreview(); const r = Array.from({ length: n || 1 }, (_, i) => Object.assign(sampleReceipt(), { no_struk: sampleReceipt().no_struk.replace(/\d{4}$/, String(i + 1).padStart(4, '0')) })); try { await doPrint(r); toast('Lembar tes dikirim.'); } catch (e) { toast('Gagal: ' + e.message, 'err'); showReceipts(r, { note: 'Printer gagal merespons. Anda dapat mencetak lewat Browser / RawBT.' }); } }); }
async function saveSettings(btn) {
  refreshPreview();
  await withBusy(btn, async () => { try { const r = await api('setting.save', { settings: S.settings }); mergeSettings(r.settings); S.ui.setSaved = Object.assign({}, S.settings); toast('Pengaturan disimpan.'); updatePrinterStatus(); } catch (e) { toast(e.message, 'err'); } });
}
function renderPaket() {
  const l = S.data.paket; const el = $('#paketList'); if (!el) return;
  el.innerHTML = l.length ? l.map((p, i) => '<div class="d-flex align-items-center gap-2 py-2" style="border-top:1px solid var(--border)"><div class="flex-grow-1"><strong>' + esc(p.nama_paket) + '</strong><div class="text-3" style="font-size:12px">' + p.dipakai + ' pelanggan</div></div><span class="num text-primary-c">' + rp(p.harga) + '</span><button class="icon-btn" aria-label="Ubah" onclick="paketForm(' + i + ')"><i class="bi bi-pencil"></i></button><button class="icon-btn text-bad" aria-label="Hapus" onclick="paketDel(' + i + ')"><i class="bi bi-trash3"></i></button></div>').join('') : emptyBox('bi-tags', 'Belum ada paket.');
}
function paketForm(i) {
  const p = i === undefined ? { nama_paket: '', harga: '' } : S.data.paket[i];
  openModal({ title: i === undefined ? 'Paket Baru' : 'Ubah Paket', body: '<div class="fld"><label>Nama Paket *</label><input class="inp" id="pNama" value="' + esc(p.nama_paket) + '"></div><div class="fld"><label>Harga Bulanan (Rp) *</label><input class="inp num" id="pHarga" inputmode="numeric" value="' + (p.harga ? Number(p.harga).toLocaleString('id-ID') : '') + '" oninput="const n=numInput(this.value);this.value=n?n.toLocaleString(\'id-ID\'):\'\'"></div><div class="hint">Perubahan harga hanya berlaku untuk tagihan berikutnya.</div>',
    footer: '<button class="btn-s btn-sm" data-bs-dismiss="modal">Batal</button><button class="btn-p btn-sm" id="pSave">Simpan</button>' });
  $('#pSave').onclick = e => withBusy(e.currentTarget, async () => {
    try { await api('paket.save', { nama_lama: i === undefined ? '' : p.nama_paket, nama_paket: $('#pNama').value, harga: numInput($('#pHarga').value) }); toast('Paket tersimpan.'); closeModal(); S.data.paket = (await api('paket.list')).paket; renderPaket(); }
    catch (er) { toast(er.message, 'err'); }
  });
}
async function paketDel(i) {
  const p = S.data.paket[i];
  if (!await confirmBox('Hapus Paket', 'Hapus paket <strong>' + esc(p.nama_paket) + '</strong>?', 'Hapus', true)) return;
  try { await api('paket.delete', { nama_paket: p.nama_paket }); toast('Paket dihapus.'); S.data.paket = (await api('paket.list')).paket; renderPaket(); } catch (e) { toast(e.message, 'err'); }
}
async function genTagihan(btn) { await withBusy(btn, async () => { try { const r = await api('tagihan.generate'); toast(r.dibuat + ' tagihan baru diterbitkan untuk ' + bulanLabel(r.bulan) + '.'); } catch (e) { toast(e.message, 'err'); } }); }

// ════════════════════════════════════════════════════════
// BAGIAN 14: HALAMAN — KELOLA USER
// ════════════════════════════════════════════════════════
PAGES.user = async function () {
  S.data.users = (await api('user.list')).users.filter(u => isSuper() || u.hak_akses !== 'Super Admin'); // lapisan kedua; server sudah menyaring
  return { html: '<div class="d-flex justify-content-between align-items-center mt-2"><div><h2 class="h-font fw-bold mb-0" style="font-size:24px">Kelola User</h2><div class="text-3">' + S.data.users.length + ' akun terdaftar</div></div><button class="btn-p btn-sm" onclick="userForm()"><i class="bi bi-person-plus"></i> Tambah</button></div><div class="grid-auto mt-3">' +
    S.data.users.map((u, i) => '<div class="card-x"><div class="row-card"><div class="ava">' + esc(initials(u.nama_user)) + '</div><div class="flex-grow-1 min-w-0"><div class="fw-bold">' + esc(u.nama_user) + '</div><div class="text-3" style="font-size:11px;font-family:monospace">' + esc(u.id_user) + '</div></div><div class="text-end"><span class="badge-x b-info">' + u.hak_akses + '</span><div class="mt-1"><span class="badge-x ' + (u.status === 'Aktif' ? 'b-ok' : 'b-bad') + '">' + u.status + '</span></div></div></div><div class="d-flex gap-2 mt-3"><button class="btn-t btn-sm flex-grow-1" ' + ((u.hak_akses === 'Super Admin' && !isSuper()) ? 'disabled title="Hanya Super Admin"' : 'onclick="userForm(' + i + ')"') + '><i class="bi bi-pencil"></i> Ubah</button><button class="btn-s btn-sm flex-grow-1" ' + ((u.hak_akses === 'Super Admin' && !isSuper()) ? 'disabled title="Hanya Super Admin"' : 'onclick="userReset(' + i + ')"') + '><i class="bi bi-key"></i> Reset Password</button></div></div>').join('') + '</div>' +
    '<div class="card-x tint mt-3" style="font-size:13px"><strong>Hak akses:</strong> ' + (isSuper() ? 'Super Admin = semua fitur Admin + Kontrol Sistem · ' : '') + 'Admin = semua fitur · Owner = dashboard & laporan · Kasir = pembayaran, cetak struk, dan koneksi printer.</div>' };
};
function userForm(i) {
  const u = i === undefined ? { nama_user: '', hak_akses: 'Kasir', status: 'Aktif' } : S.data.users[i];
  openModal({ title: i === undefined ? 'Tambah User' : 'Ubah User', body: '<div class="fld"><label>Nama User (untuk login) *</label><input class="inp" id="uNama" autocapitalize="none" value="' + esc(u.nama_user) + '"></div>' + (i === undefined ? '<div class="fld"><label>Password (min. 6 karakter) *</label><input class="inp" id="uPass" type="text" autocomplete="off"></div>' : '') +
    '<div class="grid-2"><div class="fld"><label>Hak Akses</label><select class="sel" id="uRole">' + (isSuper() ? ['Super Admin', 'Admin', 'Owner', 'Kasir'] : ['Admin', 'Owner', 'Kasir']).map(r => '<option ' + (u.hak_akses === r ? 'selected' : '') + '>' + r + '</option>').join('') + '</select></div><div class="fld"><label>Status</label><select class="sel" id="uStat"><option ' + (u.status === 'Aktif' ? 'selected' : '') + '>Aktif</option><option ' + (u.status === 'Nonaktif' ? 'selected' : '') + '>Nonaktif</option></select></div></div>',
    footer: '<button class="btn-s btn-sm" data-bs-dismiss="modal">Batal</button><button class="btn-p btn-sm" id="uSave">Simpan</button>' });
  $('#uSave').onclick = e => withBusy(e.currentTarget, async () => {
    try { await api('user.save', { id_user: i === undefined ? '' : u.id_user, nama_user: $('#uNama').value, password: i === undefined ? $('#uPass').value : '', hak_akses: $('#uRole').value, status: $('#uStat').value }); toast('User tersimpan.'); closeModal(); go('user'); }
    catch (er) { toast(er.message, 'err'); }
  });
}
function userReset(i) {
  const u = S.data.users[i];
  openModal({ title: 'Reset Password', body: '<p>Atur password baru untuk <strong>' + esc(u.nama_user) + '</strong>. Sesi aktifnya akan dikeluarkan.</p><div class="fld"><label>Password Baru (min. 6 karakter)</label><input class="inp" id="rPass" type="text" autocomplete="off"></div>',
    footer: '<button class="btn-s btn-sm" data-bs-dismiss="modal">Batal</button><button class="btn-p btn-sm" id="rSave">Reset</button>' });
  $('#rSave').onclick = e => withBusy(e.currentTarget, async () => {
    try { await api('user.reset', { id_user: u.id_user, password: $('#rPass').value }); toast('Password direset.'); closeModal(); } catch (er) { toast(er.message, 'err'); }
  });
}

// ════════════════════════════════════════════════════════
// BAGIAN 15: HALAMAN — KONTROL SISTEM (khusus Super Admin)
// ════════════════════════════════════════════════════════
const SISTEM_SAKLAR = [
  { key: 'tagihan_otomatis', icon: 'bi-arrow-repeat', judul: 'Tagihan otomatis', on: 'Berjalan: tagihan terbit sendiri setiap tanggal 20.', off: 'Dihentikan: tidak ada tagihan baru yang terbit otomatis.', konfirmasiOff: 'Tagihan bulan ini dan seterusnya tidak akan terbit sendiri sampai Anda menyalakannya lagi.' },
  { key: 'tampil_generate_tagihan', icon: 'bi-receipt', judul: 'Tombol "Terbitkan tagihan"', on: 'Tampil: Admin bisa menerbitkan tagihan bulan ini secara manual.', off: 'Disembunyikan: tombol hilang untuk Admin dan ditolak oleh server.' },
  { key: 'bayar_massal', icon: 'bi-people', judul: 'Pembayaran massal', on: 'Tersedia: Admin dan Kasir bisa membayar banyak pelanggan sekaligus.', off: 'Disembunyikan: hanya pembayaran satuan; massal ditolak oleh server.' },
  { key: 'cetak_ulang_massal', icon: 'bi-printer', judul: 'Cetak ulang massal', on: 'Tersedia: Admin dan Kasir bisa memilih banyak struk sekaligus.', off: 'Dibatasi: hanya satu struk per cetak; memilih banyak struk ditolak oleh server.' }
];
PAGES.sistem = async function () {
  const d = await api('sistem.get');
  Object.keys(d.flags).forEach(k => { S.settings[k] = d.flags[k]; });
  const h = '<div class="mt-2"><h2 class="h-font fw-bold mb-1" style="font-size:24px">Kontrol sistem</h2><div class="text-3 mb-3">Pengaturan ini berlaku untuk semua pengguna. Super Admin tetap bisa memakai keempat fitur ini.</div>' +
    '<div class="card-x">' + SISTEM_SAKLAR.map((x, i) => {
      const on = d.flags[x.key] !== '0';
      return '<div class="d-flex align-items-start gap-3" ' + (i ? 'style="border-top:1px solid var(--border);margin-top:16px;padding-top:16px"' : '') + '><span class="ava" style="border-radius:12px"><i class="bi ' + x.icon + '"></i></span><div class="flex-grow-1 min-w-0"><strong>' + esc(x.judul) + '</strong><div class="text-3" style="font-size:13px" id="sk_' + x.key + '_t">' + esc(on ? x.on : x.off) + '</div></div>' +
        '<label class="switch"><input type="checkbox" id="sk_' + x.key + '" ' + (on ? 'checked' : '') + ' onchange="sistemToggle(\'' + x.key + '\',this)" aria-label="' + esc(x.judul) + '"><span></span></label></div>';
    }).join('') + '</div>' +
    '<div class="card-x tint mt-3" style="font-size:13px"><div class="fw-bold mb-1">Status saat ini</div>' +
    '<div>Tagihan ' + esc(bulanLabel(d.bulan)) + ': <strong>' + d.tagihan_bulan_ini + '</strong> sudah terbit.</div>' +
    '<div>Jadwal harian jam 01.00: <strong>' + (d.trigger_terpasang ? 'terpasang' : 'belum terpasang (jalankan setupAppEnvironment)') + '</strong>. Saat tagihan otomatis dihentikan, jadwal tetap terpasang tetapi tidak menerbitkan apa pun.</div></div></div>';
  return { html: h };
};
async function sistemToggle(key, el) {
  const x = SISTEM_SAKLAR.find(v => v.key === key), want = el.checked;
  if (!want && x.konfirmasiOff && !await confirmBox('Hentikan ' + x.judul.toLowerCase() + '?', esc(x.konfirmasiOff), 'Ya, hentikan', true)) { el.checked = true; return; }
  el.disabled = true;
  try {
    const r = await api('sistem.save', { key: key, value: want ? '1' : '0' });
    S.sys = Object.assign(S.sys || {}, r.settings && SYS_KEYS.reduce((o, k) => { o[k] = r.settings[k]; return o; }, {})); mergeSettings(r.settings);
    $('#sk_' + key + '_t').textContent = want ? x.on : x.off;
    toast(x.judul + (want ? ' diaktifkan.' : ' dimatikan.'));
  } catch (e) { el.checked = !want; toast(e.message, 'err'); }
  finally { el.disabled = false; }
}
