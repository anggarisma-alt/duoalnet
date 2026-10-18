# DUO AL NET — Frontend (GitHub Pages)

Aplikasi manajemen wifi lokal. Frontend statis (HTML/CSS/JS) yang memanggil REST API Google Apps Script.

- `index.html` — halaman tunggal (SPA, router hash `#/halaman`)
- `css/style.css` — tema biru (palet dari logo) + mode gelap
- `img/` — logo (`logo.webp`, `mark.webp`) dan ikon aplikasi/favicon
- `manifest.webmanifest` — agar bisa dipasang di layar utama HP
- `js/config.js` — **isi `GAS_URL` di sini**
- `js/api.js` — fetch, retry, timeout, cache perangkat (SWR), warm-up
- `js/core.js` — login, navigasi, struk, printer (Bluetooth/RawBT/Browser)
- `js/pages.js` — semua halaman

Panduan lengkap: lihat `PANDUAN-INSTALASI.md`.
