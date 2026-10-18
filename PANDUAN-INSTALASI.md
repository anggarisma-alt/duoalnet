# PANDUAN INSTALASI — DUO AL NET (Backend GAS + Frontend GitHub Pages)

Arsitektur baru:

```
HP / Komputer  ──►  GitHub Pages (tampilan: index.html, css/, js/)
                         │  fetch (JSON)
                         ▼
                Google Apps Script (/exec) = API  ──►  Google Sheets (data)
```

Data pelanggan, tagihan, dan pembayaran Anda **tetap di Spreadsheet yang sama**. Yang berubah hanya cara aplikasi ditampilkan dan dipanggil.

**Keuntungan:** tampilan jauh lebih cepat (data diambil dari cache perangkat dulu), dan Web Bluetooth untuk printer thermal bekerja lebih baik karena halaman tidak lagi berada di dalam iframe Google.

---

## BAGIAN A — Backend: pasang di Google Apps Script

### Jika Anda SUDAH memakai DUO AL NET versi lama (migrasi)

1. Buka proyek Apps Script lama Anda (script.google.com → proyek DUO AL NET).
2. **Hapus** 3 file lama di sisi kiri: `Index`, `Stylesheet`, `JavaScript` (klik titik tiga di samping nama file → Delete). Backend baru tidak memakainya.
3. Buka `Kode.gs`, **hapus semua isinya**, lalu **tempel isi `Kode.gs` yang baru**. Klik 💾 Simpan.
4. (Disarankan) Klik ⚙️ **Project Settings** → centang **Show "appsscript.json" manifest file in editor**. Buka `appsscript.json`, ganti isinya dengan file `appsscript.json` dari paket ini, simpan.
5. Di bagian atas, pilih fungsi **`setupAppEnvironment`** → klik **▶ Run**. Aman diulang: data lama **tidak dihapus**. Fungsi ini menambahkan sheet `AppConfig`, membuat kunci token, dan memasang ulang trigger tagihan.
6. **Deploy tanpa mengganti URL:** **Deploy → Manage deployments → ✏️ (ikon pensil) → Version: _New version_ → Deploy.**
   > ⚠️ Jangan pilih "New deployment" — itu membuat URL baru. Pakai Edit deployment agar URL `/exec` tetap sama.
7. Pastikan pengaturan deployment: **Execute as: Me** dan **Who has access: Anyone**. (Frontend di GitHub Pages memanggil API tanpa login Google; keamanannya dijaga oleh login aplikasi dan token.)
8. Salin **Web app URL** (berakhiran `/exec`). Anda butuh ini di Bagian B.

> Setelah langkah ini, semua pengguna harus **login ulang** satu kali (sesi lama tidak berlaku lagi). Password lama tetap berlaku. URL `/exec` tidak lagi menampilkan aplikasi — ia hanya menjawab data JSON. Jika sebelumnya aplikasi di-embed di Blogger, embed itu tidak diperlukan lagi.

### Jika ini instalasi BARU

1. Buka https://script.google.com → **New project**. Beri nama `DUO AL NET API`.
2. Ganti nama `Code.gs` menjadi `Kode.gs`, tempel isi `Kode.gs` dari paket ini.
3. Aktifkan manifest (⚙️ Project Settings → Show appsscript.json) dan tempel isi `appsscript.json`.
4. Jalankan **`setupAppEnvironment`** sekali, izinkan otorisasi (klik *Advanced → Go to ... (unsafe)* bila muncul peringatan, itu normal untuk skrip pribadi).
5. **Deploy → New deployment → ⚙️ Web app** → Execute as **Me**, Who has access **Anyone** → Deploy → salin URL `/exec`.

### Cek backend hidup

Tempel URL `/exec` di browser. Harus tampil teks JSON seperti:
`{"success":true,"data":{"app":"DUO AL NET","versi":"2.0",...}}`
Jika yang tampil halaman login Google atau error, periksa lagi "Who has access: Anyone".

Akun awal (hanya untuk instalasi baru) — **segera ganti password**: `admin / admin123`, `owner / owner123`, `kasir / kasir123`.

---

## BAGIAN B — Isi alamat API di frontend

1. Ekstrak `duo-al-net-frontend.zip` ke folder, misalnya `C:\Users\NAMA\Documents\duo-al-net-frontend`.
2. Buka file `js\config.js` dengan Notepad. Ganti tulisannya:

```js
const GAS_URL = 'https://script.google.com/macros/s/AKfycb....../exec';
```
Simpan. **Lakukan ini sebelum push pertama.**

---

## BAGIAN C — Pasang frontend di GitHub Pages (lewat terminal)

> **Jangan** memakai "Add file → Upload files" di web GitHub: struktur folder `css/` dan `js/` akan rusak dan situs jadi 404. Selalu lewat terminal.

### C1. Install Git
- **Windows:** unduh dari https://git-scm.com/download/win, install dengan pengaturan bawaan.
- **Mac:** buka Terminal, ketik `git --version` (ikuti tawaran instalasi bila muncul).

Cek: `git --version` → harus muncul nomor versi.

### C2. Akun GitHub
Daftar di https://github.com. Username Anda akan menjadi bagian alamat situs: `USERNAME.github.io`.

### C3. Identitas Git (sekali saja)
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```
(`user.name` bebas, hanya label di riwayat perubahan.)

### C4. Buat repository
Di github.com: tombol **+** → **New repository** → nama: `duo-al-net` → pilih **Public** → **JANGAN** centang README/.gitignore/license → **Create repository**. Biarkan halamannya terbuka.

> Public aman: file frontend tidak memuat password. `GAS_URL` memang alamat publik; yang dilindungi adalah login aplikasi.

### C5. Masuk ke folder yang BENAR
Folder kerja Anda adalah **folder hasil ekstraksi ZIP itu sendiri**, yaitu `C:\Users\NAMA\Documents\duo-al-net-frontend` — **bukan** folder di atasnya, **bukan** folder di dalamnya.

Cara cepat Windows: buka folder itu di File Explorer → klik address bar → ketik `powershell` → Enter.

Lalu cek isinya:
```powershell
dir
```
**Gerbang wajib — sebelum lanjut, pastikan terlihat:**
- ✅ `index.html` langsung di daftar teratas
- ✅ folder `css` dan folder `js`
- ❌ **Tidak ada** file `.gs` (itu backend, bukan untuk GitHub)

Jika yang terlihat justru satu folder lain (mis. `duo-al-net-frontend` lagi), masuk dulu: `cd duo-al-net-frontend`, lalu `dir` ulang. **Jangan lanjut sebelum `index.html` terlihat.**

### C6. Push pertama (satu per satu)
```bash
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/duo-al-net.git
git push -u origin main
```
(Ganti `USERNAME`. Ada **titik** di akhir `git add .`.)

Saat diminta **Password**, tempel **Personal Access Token** (bukan password GitHub). Layar **terlihat kosong saat paste — itu normal**. Di PowerShell: klik kanan untuk paste, lalu Enter.

Berhasil jika muncul `Writing objects: 100%` dan `[new branch] main -> main`.

### C7. Buat Personal Access Token (bila diminta)
1. Buka https://github.com/settings/tokens → **Generate new token (classic)**.
2. Note: `git-push-token`, Expiration: 90 days, centang **repo**.
3. **Generate token**, salin `ghp_...` (hanya tampil sekali, simpan di Notepad).
4. Jalankan `git push -u origin main` lagi, tempel token sebagai password.

Alternatif tanpa token manual: **GitHub Desktop** (https://desktop.github.com) → Add Local Repository → pilih folder → Publish repository.

### C8. Aktifkan Pages
Repo di github.com → **Settings → Pages**:

| Kolom | Nilai |
|---|---|
| Source | Deploy from a branch |
| Branch | `main` · `/ (root)` |
| Enforce HTTPS | ✅ dicentang |

**Save**, tunggu 1–2 menit, refresh. Situs: `https://USERNAME.github.io/duo-al-net/`

Cek di halaman repo: `index.html` ada di root, ada folder `css/` dan `js/`, tidak ada file `.gs`.

### C9. Cara update (redeploy)
Setiap ada perubahan file frontend, dari folder yang sama:
```bash
git add .
git commit -m "Deskripsi perubahan"
git push
```
Tunggu 1–2 menit. Jika masih versi lama: **Ctrl+Shift+R**.

Untuk mengubah **backend**: edit di Apps Script lalu **Deploy → Manage deployments → ✏️ → New version → Deploy** (URL tetap).

---

## BAGIAN D — Uji setelah online

1. Buka situs → login `admin`. Dashboard harus muncul dalam beberapa detik (pertama kali bisa 2–4 detik karena server Google "bangun"; berikutnya jauh lebih cepat).
2. Buka menu Bayar → cari pelanggan → simpan pembayaran → cek sheet `Pembayaran` di Spreadsheet.
3. Login sebagai `kasir`: menu Pelanggan/Dashboard tidak boleh muncul.
4. Setelan → hubungkan printer Bluetooth → Uji Cetak (butuh Chrome/Edge; tidak didukung iPhone → pakai RawBT atau Cetak Browser).
5. Cek kecepatan: tekan F12 → Console → ketik `Perf.table()`. Kolom `server` = waktu kerja Apps Script, `net` = jaringan + cold start.

## Jika ada masalah

| Gejala | Penyebab & solusi |
|---|---|
| Login: "GAS_URL belum diisi" | Isi `js/config.js`, lalu `git add .` → `commit` → `push` |
| "Server membalas HTTP ... (bukan JSON)" | Deployment belum **Anyone**, atau URL salah/bukan `/exec`, atau lupa **New version** setelah ubah kode |
| Situs 404 | `index.html` tidak di root repo. Ulangi C5: `git init` harus dari folder yang berisi `index.html` |
| Tampilan polos tanpa gaya | Folder `css/`/`js/` tidak ikut ter-push (upload via web GitHub). Push ulang lewat terminal |
| Tampil versi lama | Ctrl+Shift+R atau jendela Incognito |
| "Sesi berakhir" terus | Admin menonaktifkan akun/mengganti peran/reset password → login ulang |
| Printer BT tidak muncul | Gunakan Chrome/Edge, Bluetooth aktif, situs HTTPS. iPhone: pakai RawBT/Browser |
| Lambat setelah lama tidak dipakai | Cold start Google (1–4 dtk). Aplikasi sudah mengirim ping pemanasan saat dibuka |

### E4. Jika saklar tidak berfungsi — periksa berurutan

1. **Spanduk merah di atas layar** berbunyi "Backend Apps Script belum diperbarui": tempel `Kode.gs` terbaru, lalu **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. Hanya menekan Simpan **tidak cukup**; tanpa New version, Apps Script tetap menjalankan kode lama. Backend yang benar berversi **2.1**.
2. **Menu "Kontrol Sistem" tidak ada di Lainnya:** akunnya bukan Super Admin. Login dengan `superadmin` (E2) atau jalankan `buatSuperAdmin`, lalu **keluar dan login ulang**. Peran dibaca saat login.
3. **Tampilan masih lama:** tekan **Ctrl+Shift+R** (di HP: hapus data situs atau buka tab Incognito) setelah `git push`.
4. **Sudah menekan saklar tetapi pengguna lain belum berubah:** perubahan sampai ke perangkat lain otomatis saat mereka pindah halaman, saat aplikasi dibuka kembali, setiap kali mereka menyimpan sesuatu, atau paling lambat sekitar 45 detik. Server menolak fitur yang dimatikan sejak detik saklar ditekan.
5. **Pesan "Aksi tidak dikenal":** sama dengan nomor 1, backend belum di-deploy sebagai New version.

## BAGIAN F — Potong kertas otomatis (auto-cutter)

Untuk printer thermal yang punya **pisau pemotong**. Printer akan memotong kertas setelah **setiap struk**, baik cetak satuan maupun cetak massal (satu potongan per struk).

### F1. Mengaktifkan
1. Buka **Setelan** (Kasir) atau **Lainnya → Pengaturan Printer & Struk** (Admin).
2. Di bagian **2. Format kertas & pengumpan**, nyalakan **Potong kertas otomatis**.
3. Pilih **Cara memotong** dan atur **Dorong kertas sebelum dipotong** (lihat F2).
4. Tekan **Uji potong (cetak 2 struk contoh)**. Dua struk harus keluar dan terpotong satu per satu.
5. Tekan **Simpan Perubahan Pengaturan**.

Pengaturan ini tersimpan di server dan berlaku di semua perangkat. Pratinjau struk menampilkan garis gunting "dipotong otomatis" di antara struk saat fitur aktif.

### F2. Menyetel agar pas
| Gejala | Yang dilakukan |
|---|---|
| Kertas tidak terpotong sama sekali | Ganti **Cara memotong**: Potong penuh (standar) → Potong penuh, printer lama (GS V 0) → Potong penuh, perintah ESC i. Pastikan printer memang punya pisau. |
| Bagian bawah struk ikut terpotong | Naikkan **Dorong kertas sebelum dipotong** (mis. 3 → 5 → 7). Jarak kepala cetak ke pisau berbeda tiap printer. |
| Terlalu banyak kertas kosong di bawah | Turunkan angka dorong kertas. Untuk cara "Potong penuh (standar)", printer sudah mendorong sendiri sehingga 0–2 biasanya cukup. |
| Kertas masih menyambung tipis | Itu memang hasil "Potong sebagian". Pilih "Potong penuh" bila ingin terputus total. |

### F3. Cetak massal
Struk dikirim **satu per satu**: setelah satu struk dikirim dan dipotong, aplikasi memberi jeda sebentar (sekitar 1 detik) agar pisau selesai bergerak, baru struk berikutnya dikirim. Karena itu cetak massal sedikit lebih lama dibanding tanpa auto-cutter, tetapi data tidak hilang dan tiap struk terpotong rapi. Bila koneksi putus di tengah jalan, pesan kesalahan menyebut berapa struk yang sudah tercetak agar tidak tercetak dobel.

### F4. Catatan metode cetak
- **Bluetooth langsung dan RawBT:** perintah potong dikirim aplikasi (diatur di F1).
- **Printer Biasa / Browser:** browser tidak bisa memerintah pisau. Setiap struk dicetak sebagai satu halaman, jadi pemotongan diatur di **pengaturan driver printer** (Windows: *Printing preferences* → opsi *Cut* / *Document cut* → "setelah setiap halaman").
- Printer portabel kecil (mis. model saku untuk kasir keliling) umumnya **tidak punya pisau**. Aktifkan fitur ini hanya bila printer Anda memang berpisau.
- Perubahan dari versi sebelumnya: kertas 80 mm dulu selalu dikirimi perintah potong. Sekarang mengikuti saklar ini, yang awalnya **mati**. Nyalakan bila printer 80 mm Anda berpisau.

## Pasang ikon di layar utama HP (opsional)
Buka situs di Chrome Android → menu ⋮ → **Tambahkan ke layar utama** (atau **Instal aplikasi**). Aplikasi akan terbuka layar penuh dengan ikon logo DUO AL NET.

## Mengganti logo
Ganti file di folder `img/` dengan nama yang sama: `logo.webp` (logo penuh, latar transparan, lebar ±640 px), `mark.webp` (lambang saja), `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png`, `favicon-64.png`. Lalu `git add .` → `commit` → `push`.

## BAGIAN E — Super Admin & Kontrol Sistem

**Super Admin** = semua kemampuan Admin + menu **Kontrol Sistem** dengan 4 saklar:

| Saklar | Saat dimatikan |
|---|---|
| Tagihan otomatis | Jadwal harian jam 01.00 tidak menerbitkan tagihan, dan pelanggan baru setelah tanggal 20 tidak memicu tagihan. Jadwal tetap terpasang, hanya tidak melakukan apa pun. |
| Tombol "Terbitkan tagihan" | Tombolnya hilang dari Pengaturan untuk Admin, dan server menolak permintaannya. |
| Pembayaran massal | Tab "Massal per ODP" dan tombol "Tagih massal" hilang, dan server menolak pembayaran lebih dari satu tagihan sekaligus. Pembayaran satuan tetap jalan. |
| Cetak ulang massal | Halaman Cetak Ulang hanya membolehkan memilih **satu** struk (tanpa pilih-semua dan tanpa kotak centang grup), dan server menolak cetak ulang lebih dari satu struk sekaligus. Cetak ulang satuan tetap jalan. |

Super Admin sendiri **tetap bisa memakai** keempat fitur itu (di layarnya diberi keterangan "disembunyikan"). Perubahan tersimpan di sheet `Pengaturan` dan berlaku langsung untuk semua pengguna. Saat tagihan otomatis dihentikan, Admin dan Owner melihat peringatan kuning di Dashboard: "Tagihan otomatis sedang dihentikan. Hubungi WA : 0895-2785-0069 untuk aktivasi kembali." (nomor dapat diketuk untuk membuka WhatsApp). Super Admin melihat petunjuk untuk menyalakannya kembali di Kontrol Sistem. Nomor WA diatur di konstanta `WA_AKTIVASI` pada `js/core.js`.

### E1. Perbarui backend
1. Buka proyek Apps Script → `Kode.gs` → hapus semua isi → tempel `Kode.gs` yang baru → 💾 Simpan.
2. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy** (URL tetap).

### E2. Akun Super Admin bawaan
Akun bawaan: **`superadmin`** dengan password **`Superuser`** (huruf S besar, sisanya kecil).

- **Instalasi baru atau menjalankan `setupAppEnvironment` lagi:** akun dibuat otomatis bila belum ada satu pun Super Admin. Bila sudah ada Super Admin, tidak ada akun tambahan yang dibuat.
- **Kembalikan atau buat manual:** di editor Apps Script pilih fungsi `buatSuperAdmin` → **▶ Run**. Bila nama `superadmin` sudah ada, akun itu dijadikan Super Admin dan passwordnya dikembalikan ke `Superuser`.
- Nama dan password bawaan bisa diubah di konstanta `DEFAULT_SUPER` di bagian atas `Kode.gs` (password minimal 8 karakter).

**Segera ganti password.** Password bawaan tertulis di kode dan panduan ini sehingga bukan rahasia. Selama masih dipakai, aplikasi otomatis membuka jendela **Ubah Password** setiap kali login (password lama: `Superuser`). Pengingat berhenti setelah password diganti. Anda juga bisa mengubahnya kapan saja lewat **Lainnya → Ubah Password Saya**.

Aturan keamanan akun:
- **Akun Super Admin tersembunyi:** hanya Super Admin yang melihatnya di Kelola User. Admin dan peran lain tidak melihat akun itu maupun penyebutan peran "Super Admin"; penyaringannya dilakukan di server, bukan sekadar disembunyikan di layar. Admin yang mencoba mengubah akun itu mendapat jawaban "User tidak ditemukan".
- Pesan yang tampil ke pengguna biasa (mis. "Pembayaran massal sedang dinonaktifkan") sengaja tidak menyebut Super Admin.
- Hanya Super Admin yang bisa membuat, mengubah, atau mereset password akun Super Admin.
- Super Admin terakhir tidak bisa diturunkan atau dinonaktifkan (agar saklar tidak terkunci).
- Mengubah peran atau menonaktifkan akun langsung mengeluarkan sesinya.

### E3. Perbarui frontend
Salin isi ZIP terbaru ke folder frontend (**jangan menimpa `js\config.js`**), lalu:
```bash
git add .
git commit -m "Tambah Super Admin dan Kontrol Sistem"
git push
```

Saklar pembayaran massal dan cetak ulang massal berdiri sendiri-sendiri: mematikan salah satunya tidak memengaruhi yang lain.

## Catatan keamanan
- Ganti semua password bawaan lewat Lainnya → Ubah Password Saya.
- Hak akses dicek di **server** pada setiap permintaan; menyembunyikan menu hanya kosmetik.
- Token login berlaku 14 hari, bertanda tangan HMAC, dan langsung dicabut bila akun dinonaktifkan / peran diubah / password direset.
- Jangan membagikan URL `/exec` + akun ke orang yang tidak berwenang.
