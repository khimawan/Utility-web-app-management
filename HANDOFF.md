# Handoff Document — Utility Management Web App

## 1. FILE MAP

```
/
├── server.js                 # Entry point Express, mounting semua routes, session config, auto-save DB tiap 30 detik
├── package.json              # Daftar dependency (express, ejs, sql.js, multer, bcryptjs, dll)
├── Dockerfile                # Build image Node 18-alpine, npm ci, expose port 3000
├── docker-compose.yml        # Orchestrator: app + cloudflared tunnel service
├── database.sql              # Referensi schema PostgreSQL (TIDAK dipakai - dokumentasi saja)
├── seed.sql                  # Referensi seed data PostgreSQL (TIDAK dipakai)
├── .gitignore                # File/folder yang dikecualikan dari git
├── .dockerignore             # File/folder yang dikecualikan dari Docker build
│
├── config/
│   └── database.js           # Inisialisasi SQLite + 37 tabel + migrasi + helper functions
│
├── middleware/
│   └── auth.js               # Middleware: isAuthenticated, isAdmin, setLocals
│
├── routes/
│   ├── auth.js               # POST /login, GET /logout (password plain text!)
│   ├── awal.js               # Dashboard, summary, CSV import/export, warnings, works, spareparts
│   ├── admin.js              # CRUD member, schedule, template checklist, lembur
│   ├── member.js             # Halaman member + pengajuan lembur
│   ├── job1.js               # Operator WTP: checklist wtp/boiler/kompressor01-02
│   ├── job2.js               # Operator N2: checklist n2_generator/kompressor03-04/lvmdp/air_tandon
│   ├── job3.js               # Facility: checklist pemakaian_air/gas/suhu_trafo/energi_listrik
│   ├── inventory.js          # CRUD alat & bahan
│   ├── sparepart.js          # Pengajuan sparepart
│   ├── rangkuman.js          # Ringkasan aktivitas harian
│   └── utility.js            # PUBLIC routes: landing page, submit form, tracking
│
├── views/
│   ├── auth/login.ejs
│   ├── partials/             # header.ejs, sidebar.ejs, topnav.ejs, footer.ejs
│   └── pages/                # awal/, job1/, job2/, job3/, utility/, rangkuman/, inventory/, admin/
│
├── public/
│   ├── css/style.css         # Custom CSS (sidebar, login, layout, responsive)
│   ├── js/main.js            # Sidebar toggle/collapse, auto-hide, chart helpers
│   └── favicon.svg
│
├── data/
│   └── utility.db            # File database SQLite (auto-generated)
│
├── cloudflared/
│   ├── config.yml            # Konfigurasi tunnel (domain → app:3000)
│   └── credentials.json      # Credential tunnel (RAHASIA - jangan di-commit)
│
└── plan build/               # Dokumen perencanaan awal (bukan kode)
```

### Risiko

- **`credentials.json`** berisi TunnelSecret — jika bocor, orang lain bisa tunnel ke server
- **`data/utility.db`** adalah satu-satunya database — jika corrupt, semua data hilang

### Cara aman mengubah

- Jangan edit file di `plan build/` — itu dokumentasi lama
- Jangan commit `credentials.json` atau `*.db`
- Kalau mau backup database: copy `data/utility.db` ke tempat aman

---

## 2. DATA FLOW

### Database Engine

| Item | Detail |
|------|--------|
| Engine | SQLite via `sql.js` (WASM, in-memory) |
| File | `data/utility.db` |
| Cara kerja | Semua tabel di-load ke memory saat startup, disimpan ke file tiap 30 detik (`server.js:57`) |
| Inisialisasi | `config/database.js:createTables()` membuat 37 tabel + seed data admin/member |

### Alur Checklist (Form Custom — WTP/Boiler/N2/Kompressor)

```
User isi form → klik Submit
  → POST /job1/checklist/wtp (atau boiler/n2_generator/kompressor)
    → route handler INSERT data ke tabel checklist_{wtp,boiler,n2,kompressor}
      → semua field dalam 1 baris (30-40 kolom)
    → INSERT ke activity_logs
  → redirect ke halaman checklist
  → halaman render dengan SELECT data terbaru
```

### Alur Checklist (Template-based — lvmdp/air_tandon/dll)

```
User isi form → klik Submit
  → POST /job2/checklist/:category
    → INSERT ke checklist_entries (header)
    → LOOP tiap parameter: INSERT ke checklist_values
  → redirect
```

### File Upload

| Upload | Lokasi | Limit |
|--------|--------|-------|
| Foto checklist | `public/uploads/checklist/` | 5MB, JPG/PNG |
| Foto warning/pekerjaan | `public/uploads/works/` | 50MB, JPG/PNG/MP4/WebM |
| Lampiran utility request | `public/uploads/utility_requests/` | 50MB |

### Risiko

- **Data loss 30 detik**: Jika server crash, data 30 detik terakhir hilang. Tidak ada WAL/journal mode.
- **No transaction**: Multi-step INSERT tidak pakai transaction. Jika gagal di tengah, data jadi orphan.
- **Single file DB**: `utility.db` adalah single point of failure. Tidak ada replikasi.
- **File upload tanpa akses kontrol**: Semua file di `public/uploads/` bisa diakses siapa saja.

### Cara aman mengubah

- Kalau nambah field di form custom: (1) tambah kolom di `database.js`, (2) tambah `<input>` di view EJS, (3) update INSERT di route handler
- Kalau nambah tabel: tulis `CREATE TABLE` di `createTables()` + migration function
- Backup dulu `data/utility.db` sebelum migrasi schema
- Jangan hapus kolom yang sudah ada — SQLite tidak support `DROP COLUMN` (butuh recreate table)

---

## 3. AUTH FLOW

### Session

| Item | Detail |
|------|--------|
| Library | `express-session` (MemoryStore) |
| Secret | Hardcoded: `'utility-management-secret-key-2024'` (`server.js:19`) |
| Cookie | HTTP only, NOT secure, expire 24 jam |
| Penyimpanan | In-memory — **hilang setiap restart server** |

### Login

```
POST /login
  → SELECT * FROM users WHERE username = ? AND is_active = 1
  → compare password: user.password !== password (PLAINTEXT — tanpa bcrypt!)
  → set req.session.user = { id, name, username, position, job }
  → redirect ke /
```

### Role

| Role | Akses |
|------|-------|
| `admin` | Semua fitur + admin panel |
| `member` | Checklist, dashboard, warning, pengajuan |

### Route Protection

- `isAuthenticated` middleware: redirect ke `/login` jika session tidak ada
- `isAdmin` middleware: return 403 jika bukan admin
- Routes PUBLIC (tanpa auth): `/utility`, `/utility/submit`, `/utility/tracking`

### Risiko

| Bahaya | Dampak |
|--------|--------|
| **Password plaintext** | Jika DB bocor, semua password terbaca. Mitigasi: butuh bcryptjs |
| **Session secret hardcoded** | Siapa pun dengan source code bisa forge session cookie |
| **MemoryStore** | Semua user logout tiap restart server |
| **No HTTPS cookie** | Session cookie bisa dicuri di jaringan HTTP |
| **No rate limit** | Brute-force login bisa dilakukan tanpa batas |
| **No CSRF** | Semua POST request rentan CSRF attack |

### Cara aman mengubah

- **Ganti session secret**: Ubah string di `server.js:19`. Simpan di `.env`, jangan hardcode.
- **Enable bcrypt**: `routes/auth.js` — hash password saat register, compare dengan `bcrypt.compare()` saat login
- **Ganti ke session store persistent**: Pakai `connect-sqlite3` atau `connect-pg-simple`
- **Set cookie secure**: Ubah `secure: false` jadi `secure: true` kalau pakai HTTPS
- **Tambah rate limit**: Pakai `express-rate-limit` di route `/login`
- **Tambah CSRF token**: Pakai `csurf` middleware

---

## 4. RISK MAP

### Security (Critical)

| # | Risiko | File | Severity |
|---|--------|------|----------|
| 1 | Password plaintext | `routes/auth.js:17` | **CRITICAL** |
| 2 | Session secret hardcoded | `server.js:19` | **HIGH** |
| 3 | No CSRF protection | Semua route POST | **HIGH** |
| 4 | Memory session store | `server.js` (default) | **MEDIUM** |
| 5 | No HTTPS cookie | `server.js:22` | **MEDIUM** |
| 6 | No rate limit login | `routes/auth.js` | **MEDIUM** |
| 7 | File upload no access control | `public/uploads/` | **MEDIUM** |
| 8 | Credential tunnel di repo | `cloudflared/credentials.json` | **HIGH** (already in .gitignore) |

### Data Integrity

| # | Risiko | Detail |
|---|--------|--------|
| 9 | Data loss 30 detik | Save interval 30s, no WAL mode |
| 10 | Single file DB | `utility.db` — corrupt = semua data hilang |
| 11 | No transaction | Multi-step INSERT tanpa rollback |
| 12 | SQLite ALTER TABLE terbatas | Migrasi schema butuh recreate table |

### Dependency

| Package | Versi | Masalah |
|---------|-------|---------|
| sql.js | ^1.14.1 | WASM-based, update bisa ubah persistence |
| multer | 1.4.5-lts.1 | Known vulnerabilities |
| express | 4.18.2 | Beberapa CVE di 4.19+ |
| ejs | 3.1.9 | SSTI risk if misused |
| **Unused** | `pg`, `connect-pg-simple`, `exceljs`, `pdfkit`, `pdfkit-table` | ~50MB wasted in image |

### Cara aman mengubah (Risk Mitigation)

- **Prioritas 1**: Hash password dengan bcryptjs (library sudah ada di package.json, tinggal dipakai)
- **Prioritas 2**: Pindah session ke file/cookie store biar tidak hilang saat restart
- **Prioritas 3**: Backup `data/utility.db` secara berkala (cron job copy ke tempat lain)
- **Prioritas 4**: Hapus dependency yang tidak dipakai dari `package.json`
- **Prioritas 5**: Update express, multer, ejs ke versi terbaru

---

## 5. CHANGE GUIDE

### A. Menambahkan Field Input Baru di Checklist

**Contoh: nambah "Temperature Mesin" di N2 Generator**

1. **Database**: Tambah kolom di `config/database.js` bagian `CREATE TABLE checklist_n2`
   - Kalau tabel sudah ada: tulis migration function `ALTER TABLE checklist_n2 ADD COLUMN temperature_mesin REAL`
2. **View**: Tambah `<input>` di `views/pages/job2/checklist-n2.ejs` setelah field Pressure
3. **Route**: Update INSERT statement di `routes/job2.js` `POST /checklist/n2_generator`
4. **Build ulang Docker**: `docker compose up -d --build`

### B. Menambahkan Halaman/Route Baru

1. Buat file route baru di `routes/` (contoh: `routes/report.js`)
2. Buat file view di `views/pages/` (contoh: `views/pages/report/index.ejs`)
3. Mount di `server.js`: `app.use('/report', require('./routes/report'))`
4. Tambah link di `views/partials/sidebar.ejs`
5. Tambah middleware `isAuthenticated` jika perlu proteksi

### C. Mengubah Database Schema

**Aturan Emas SQLite:**
- Boleh: `ALTER TABLE ... ADD COLUMN` (tambah kolom baru, harus nullable atau default value)
- Tidak boleh: `DROP COLUMN`, modify constraints, rename column
- Untuk perubahan besar: backup DB → buat tabel baru → copy data → rename → test

**Pattern migrasi yang sudah ada** (lihat `config/database.js`):

```javascript
function migrateNamaTabel(db) {
  try {
    db.run("ALTER TABLE checklist_xxx ADD COLUMN kolom_baru TEXT");
    saveDb(db);
  } catch(e) {
    // Kolom sudah ada, skip
  }
}
```

### D. Mengubah Sidebar

File: `views/partials/sidebar.ejs`

- Setiap menu adalah `<li class="nav-item has-sub">`
- Sub-menu: `<ul class="sub-menu">` di dalamnya
- Active state: `page` variable — tapi saat ini `page` tidak pernah dipassing dari route!
- Admin-only: bungkus dengan `<% if (user.position === 'admin') { %>`
- CSS: `public/css/style.css` — class `collapsed`, `show`, `.has-sub.open`
- JS: `public/js/main.js` — toggle, auto-hide 3 detik, scroll-to-close

### E. Deployment & Docker

```bash
# Build & start
docker compose up -d --build

# Restart
docker compose restart

# Stop
docker compose down

# Lihat log
docker compose logs -f
```

**Cloudflare Tunnel:**
- Edit `cloudflared/config.yml` untuk ganti domain atau service target
- Tunnel credential di `cloudflared/credentials.json` — JANGAN di-commit
- Buat tunnel baru: `cloudflared tunnel create <nama>` → copy credentials

### F. Backup & Restore Database

```bash
# Backup
cp data/utility.db data/backup-$(date +%Y%m%d).db

# Restore
cp data/backup-20241201.db data/utility.db
docker compose restart
```

### G. Testing (Manual)

Tidak ada test file. Cara testing:

1. `npm start` atau `docker compose up -d`
2. Buka browser → login
3. Isi form checklist → submit → cek data muncul di tabel history
4. Cek `data/utility.db` ukurannya bertambah
5. Cek console log tidak ada error

---

## CREDENTIALS DEFAULT

| Role | Username | Password |
|------|----------|----------|
| Admin | `adminaja` | `adminaja` |
| Member | `member01` | `member01` |

## PERINTAH CEPAT

| Perintah | Fungsi |
|----------|--------|
| `npm start` | Jalankan app |
| `npm install` | Install dependencies |
| `docker compose up -d` | Jalankan dengan Docker |
| `docker compose up -d --build` | Rebuild + jalankan |
| `docker compose logs -f` | Lihat log real-time |
| `cp data/utility.db data/backup.db` | Backup database |
