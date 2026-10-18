# Utility Management Web App

Sistem manajemen utilitas berbasis web untuk monitoring, checklist tracking, work management, inventory, dan pengajuan bantuan utility di fasilitas industri.

## Fitur Utama

### Public Utility Request

Halaman publik yang dapat diakses tanpa login untuk pengajuan bantuan utility:

| Halaman | URL | Deskripsi |
|---------|-----|-----------|
| **Landing Page** | `/utility` | Halaman utama dengan deskripsi dan tombol navigasi |
| **Input Pengajuan** | `/utility/submit` | Form pengajuan (nama, jabatan, WhatsApp, area, gedung, issue, prioritas, foto/video) |
| **Tracking** | `/utility/tracking` | Status pengajuan realtime (Open / Closed / Diluar Scoope / On Hold) |

### Management Utility Request (Login)

| URL | Deskripsi |
|-----|-----------|
| `/awal/utility-requests` | Tabel manajemen dengan 4 tab status, edit modal, upload foto, assign manpower |
| `/awal/admin/landing-content` | Admin panel untuk edit konten landing page publik |

### Checklist Management

#### Job 1 - Operator WTP

| Checklist | Deskripsi |
|-----------|-----------|
| **Checklist WTP** | Predictive & Preventive: pompa, membran RO, pressure, TDS, chemical, backwash, UV |
| **Checklist Boiler** | Predictive: steam, flue gas, feed water, pressure, chemical, blowdown. Preventive: maintenance |
| **Checklist Kompressor** | Predictive: air compressor 01-04, running hour, pressure, motor/oil temp. Preventive: maintenance 3000h-12000h |

#### Job 2 - Operator N2

| Checklist | Deskripsi |
|-----------|-----------|
| **Checklist N2 Generator** | Predictive: mesin, suhu, running hour, pressure, frequency, power, drayer, purify |
| **Checklist Kompressor** | Shared view dengan Job 1 (Kompressor 03-04) |
| **Checklist LVMDP** | Template-based: LVMDP 147/197/555 KVA, Trafo 630/2000 KVA |
| **Checklist Air Tandon** | Template-based: level air, tekanan pompa |

#### Job 3 - Facility

| Checklist | Deskripsi |
|-----------|-----------|
| **Pemakaian Air** | Monitoring meteran sibel 01-06 dengan PIC auto-select |
| **Pemakaian Gas** | Meteran gas, tekanan gas dengan PIC auto-select |
| **Suhu Trafo** | Trafo 630KVA & 2000KVA: suhu trafo, suhu oil, oil level, kebocoran gasket dengan PIC auto-select |
| **Energi Listrik** | KWH WBP/LWBP, PF capacitor bank dengan PIC auto-select |

#### Fitur Checklist
- **Jam Monitoring dropdown**: Pilihan 00:00 - 23:00 (bukan input time)
- **PIC auto-select**: Dropdown member otomatis terisi untuk pemakaian air, gas, energi listrik, suhu trafo, LVMDP, air tandon
- **Predictive/Preventive toggle**: Form dinamis berdasarkan jenis kegiatan
- **Status operasional Off**: Field predictive disembunyikan
- **Warning otomatis**: Pressure membran >10 atau TDS >200
- **Scrollable history table**: Setiap halaman checklist memiliki tabel riwayat dengan scroll, checkbox batch delete
- **Batch delete**: Hapus banyak data sekaligus dengan konfirmasi

### Peminjaman Alat

| URL | Deskripsi |
|-----|-----------|
| `/peminjaman` | Form peminjaman alat dengan multi-select dari inventory (kategori alat), **jumlah per alat** (desimal), durasi (hari/jam/menit), foto, status (Dipinjam/Sudah Kembali), riwayat tabel dengan scroll, batch delete, edit status |

**Pelacakan stok peminjaman:**

- Stok alat **berkurang saat dipinjam** dan **bertambah lagi saat dikembalikan**.
- Jumlah yang dipinjam **tidak boleh melebihi stok** yang tersedia — divalidasi di server, bukan hanya di browser.
- Stok hanya bergerak saat status berpindah (`dipinjam` ↔ `sudah_kembali`), sehingga menyimpan ulang loan yang masih dipinjam tidak memotong stok dua kali.
- Menghapus record yang masih dipinjam otomatis mengembalikan stok; menghapus record yang sudah kembali tidak berpengaruh.
- Memperbarui jumlah saat loan masih terbuka akan mengembalikan jumlah lama lalu mengambil yang baru.

### Pemakaian Part & Bahan

| URL | Deskripsi |
|-----|-----------|
| `/pemakaian` | Form pemakaian part/bahan dengan multi-select member, multi-select item dari inventory (kategori part/bahan) + jumlah per item, otomatis mengurangi stok inventory, riwayat tabel dengan scroll, batch delete |

**Catatan stok:** stok tidak pernah bisa menjadi negatif — pemakaian melebihi stok akan dijepit di `0`. Record menyimpan jumlah yang benar-benar terambil (`taken`), sehingga menghapus record mengembalikan tepat sejumlah itu, bukan sejumlah yang diminta.

### Inventory (Alat & Bahan)

| URL | Deskripsi |
|-----|-----------|
| `/inventory` | Manajemen stok alat, part, bahan dalam 3 tab; tambah/edit dengan foto; import Excel & CSV; scrollable table; batch delete |

**Import Excel & CSV:**

- **Satu tombol import** untuk `.xlsx` dan `.csv`. Format dideteksi otomatis dari **isi file** (magic bytes), bukan dari ekstensi — file `.csv` yang di-rename jadi `.xlsx` tetap terbaca sebagai CSV.
- Template Excel berisi sheet **Data** (header + contoh) dan sheet **Panduan**. Tombol **Panduan** di halaman memuat aturan, contoh input benar, dan contoh yang ditolak beserta alasannya.
- Setiap baris yang gagal validasi **ditampilkan di halaman utama** lengkap dengan nomor baris dan alasannya. Tidak ada input yang hilang diam-diam.
- Import bersifat idempotent: item yang sudah ada diperbarui, tidak pernah terduplikasi. Aman diulang.
- `quantity` boleh desimal maksimal 1 angka di belakang koma (`1.3`, `0.7`). Koma pemisah ribuan (`1,000`) dan 2 angka desimal (`1.25`) ditolak dengan pesan jelas.
- `.xls` (Excel 97-2003) tidak didukung — simpan ulang sebagai `.xlsx` atau `.csv`.

### Warning & Work Tracking

| Feature | Deskripsi |
|---------|-----------|
| **Warning** | Upload foto/video, assign member, progress tracking |
| **Works (Pekerjaan)** | Deskripsi area, assign member, catatan, progress, dokumentasi |
| **Progress Sorting** | Item 100% muncul di paling bawah daftar |
| **Edit Modal** | Update catatan, progress, ganti/hapus foto |
| **Dokumentasi** | Thumbnail foto & preview video di tabel |

### Sparepart

| URL | Deskripsi |
|-----|-----------|
| `/awal/spareparts` | Request barang dengan kategori, urgensi, progress; upload foto; jumlah desimal; CSV import/export; scrollable table; batch delete; sync ke inventory (jumlah ikut desimal) saat progress = barang_sampai |

### Summary Data

| Feature | Deskripsi |
|---------|-----------|
| **CSV Download** | Export data per kategori ke CSV |
| **CSV Import** | Import data dari CSV dengan template download |
| **Charts** | Visualisasi data per kategori |

### Other Features

| Feature | Deskripsi |
|---------|-----------|
| **Jadwal Utility** | Submit overtime, admin approve/reject, jadwal shift otomatis |
| **Rangkuman Harian** | 5+ tabel rekap harian per tanggal; tabel 1 = kegiatan harian, tabel 2 = detail pekerjaan (sudah & belum selesai), tabel 3 = utility request, tabel 4/5 = data predictive & preventive |
| **Status Pekerjaan** | `works.status` tidak pernah diisi sistem, jadi status di tabel 2 diturunkan dari `repair_percentage`: Selesai (≥100), Dalam Pengerjaan (>0), Belum Dikerjakan (0) |
| **Unduh PDF** | Tombol print di halaman Rangkuman. A4 landscape, seluruh tab predictive & preventive ikut tercetak, header tabel berulang antar halaman |
| **Dashboard** | Profil utility, job descriptions, gallery |
| **Sidebar Auto-Hide** | Sidebar otomatis sembunyi setelah 5 detik di halaman tertentu |

## Keamanan

| Feature | Deskripsi |
|---------|-----------|
| **Password hashing** | bcrypt (bcryptjs). Password lama yang masih plaintext naik kelas otomatis saat login berhasil |
| **Rate limit login** | 5 kali gagal per `ip\|username` dalam 15 menit, lalu dikunci 15 menit. Dihitung per IP asli (lihat `trust proxy` di `server.js`) |
| **Session secret** | `SESSION_SECRET` dibaca dari environment variable `.env`, tidak ada lagi yang hardcoded di dalam kode |
| **Upload spreadsheet** | Disimpan di memory, bukan ke `public/`, sehingga file yang diunggah tidak bisa diakses publik |
| **Upload gagal** | Foto yang terlampir pada request yang ditolak dihapus otomatis, tidak meninggalkan file yatim |

### ⚠️ Password default wajib diganti

Akun seed dibuat otomatis oleh `config/database.js` dengan **password default yang tertulis di dalam kode**. Karena repository ini publik, siapa pun bisa membacanya di sana. **Ganti password admin di `/admin` sebelum aplikasi dipakai produksi** — hashing hanya melindungi database yang bocor, bukan password yang memang dipublikasikan.

Passing environment variable yang wajib ada saat menjalankan:

```bash
SESSION_SECRET=<random-panjang>   # wajib, tanpa ini semua sessioninvalid saat restart
BCRYPT_ROUNDS=10                  # opsional, default 10
```

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| **Runtime** | Node.js + Express.js |
| **Database** | SQLite (via sql.js) |
| **Template Engine** | EJS |
| **Frontend** | Bootstrap 5, Bootstrap Icons, Google Fonts (Inter) |
| **File Upload** | Multer (5MB max, JPG/JPEG/PNG) |
| **Spreadsheet** | ExcelJS 4.4 (baca/tulis `.xlsx`) |
| **Charts** | Chart.js |
| **Password Hashing** | bcryptjs |
| **Database** | SQLite via sql.js — **disimpan penuh di memori**, di-flush ke file `data/` setiap ada perubahan dan tiap 30 detik |

## Local Development

```bash
# Install dependencies
npm install

# Run the app
npm start

# App tersedia di http://localhost:3000
```

## Docker Deployment

```bash
# Pastikan SESSION_SECRET tersedia (WAJIB - lihat .env.example)
cp .env.example .env && nano .env

# Build dan run
docker compose up -d

# Atau build langsung
docker build -t utility-management-app .
docker run -p 3000:3000 -v $(pwd)/data:/app/data utility-management-app

# Stop
docker compose down
```

SQLite database tersimpan di `./data` directory (persist via Docker volume mount).

> **Catatan:** `SESSION_SECRET` tidak ada default yang aman. Tanpa environment variable itu, server berjalan dengan secret acak yang berbeda tiap restart sehingga semua session langsung logout — dan session cookie bisa dipalsukan bila secret-nya bocor.

## Project Structure

```
utility-management-webapp/
├── server.js                    # Express server entry point
├── config/
│   ├── database.js              # SQLite setup, schema, migrations, helpers
│   └── stock.js                 # Aritmetika stok bersama (klamp 0, pembulatan desimal)
├── middleware/
│   ├── auth.js                  # Authentication & setLocals
│   └── rateLimit.js             # Rate limit login (in-process)
├── routes/
│   ├── auth.js                  # Login/logout
│   ├── awal.js                  # Home, summary, warnings, works, utility requests, landing admin, spareparts
│   ├── peminjaman.js            # Peminjaman Alat
│   ├── pemakaian.js             # Pemakaian Part & Bahan
│   ├── member.js                # Jadwal member + overtime submission
│   ├── admin.js                 # Admin panel + management jadwal
│   ├── job1.js                  # Job 1 (WTP, Boiler, Kompressor)
│   ├── job2.js                  # Job 2 (N2, Kompressor, LVMDP, Air Tandon)
│   ├── job3.js                  # Job 3 (Air, Gas, Trafo, Listrik)
│   ├── inventory.js             # Inventory management (Alat & Bahan)
│   ├── rangkuman.js             # Daily activity summary
│   ├── sparepart.js             # Sparepart requests
│   └── utility.js               # Public utility request pages (landing, submit, tracking)
├── views/
│   ├── partials/                # Header, sidebar, footer, topnav
│   └── pages/
│       ├── awal/                # Dashboard awal, summary, works, warnings, spareparts, peminjaman, pemakaian
│       ├── job1/                # Job 1 checklists & warnings
│       ├── job2/                # Job 2 checklists & warnings
│       ├── job3/                # Job 3 checklists & works
│       └── utility/             # Public pages (landing, submit, tracking)
├── public/
│   ├── css/                     # Styles
│   ├── js/                      # Client-side scripts
│   └── uploads/
│       ├── works/               # Works & warnings photos/videos
│       ├── spareparts/          # Sparepart photos
│       ├── inventory/           # Inventory item photos
│       ├── peminjaman/          # Peminjaman alat photos
│       ├── utility_requests/    # Utility request photos/videos
│       └── photos/              # Landing page & gallery photos
├── data/                        # SQLite database (auto-created)
├── Dockerfile                   # Docker build config
├── docker-compose.yml           # Docker Compose config
└── package.json                 # Node.js dependencies
```

## Database Tables

| # | Table | Deskripsi |
|---|-------|-----------|
| 1 | users | User accounts (admin/member) |
| 2 | utility_profile | Landing page profil utility |
| 3 | utility_landing_content | Konten editabel landing page publik |
| 4 | utility_requests | Pengajuan bantuan utility dari publik |
| 5 | utility_request_members | Manpower assignment untuk utility request |
| 6 | job_descriptions | Job role descriptions |
| 7 | machines | Machine profiles |
| 8 | schedules | Shift schedules |
| 9 | checklist_templates | Checklist parameter definitions |
| 10 | checklist_entries | Checklist submission headers |
| 11 | checklist_values | Individual parameter values |
| 12 | checklist_wtp | Checklist WTP (custom form) |
| 13 | checklist_boiler | Checklist Boiler (custom form) |
| 14 | checklist_n2 | Checklist N2 Generator (custom form) |
| 15 | checklist_kompressor | Checklist Kompressor (shared Job 1 & 2) |
| 16 | warnings | Machine warnings |
| 17 | warning_members | Warning-member junction |
| 18 | works | Facility work jobs |
| 19 | work_members | Work-member junction |
| 20 | spareparts | Sparepart requests — `quantity` bertipe **REAL** (desimal) |
| 21 | inventory_items | Inventory stock (alat/part/bahan) — `quantity` bertipe **REAL** (desimal) |
| 22 | peminjaman_alat | Peminjaman alat — `items` JSON, tiap item membawa `qty` yang sedang dipegang |
| 23 | pemakaian_part | Pemakaian part & bahan — `items` JSON, tiap item membawa `taken` (jumlah yang benar-benar terambil) |
| 24 | working_instructions | Working instructions |
| 25 | gallery_photos | Photo gallery |
| 26 | activity_logs | Activity logs |
| 27 | overtime_submissions | Overtime requests |
| 28 | overtime_members | Overtime-member junction |

## Halaman Akses

### Public (tanpa login)

| URL | Deskripsi |
|-----|-----------|
| `/utility` | Landing page publik |
| `/utility/submit` | Form pengajuan bantuan utility |
| `/utility/tracking` | Tracking status pengajuan |

### Authenticated

| URL | Deskripsi |
|-----|-----------|
| `/login` | Login page |
| `/awal` | Profil Utility |
| `/awal/summary` | Summary Data (CSV download/import) |
| `/awal/works` | List Pekerjaan dengan dokumentasi |
| `/awal/warnings` | List Warning dengan dokumentasi |
| `/awal/spareparts` | List Sparepart (CSV import/export, foto, batch delete) |
| `/awal/utility-requests` | Manajemen Utility Requests |
| `/awal/admin/landing-content` | Edit Landing Page (admin only) |
| `/peminjaman` | Peminjaman Alat (jumlah per alat, stok otomatis keluar/kembali) |
| `/pemakaian` | Pemakaian Part & Bahan (jumlah desimal, stok tidak bisa negatif) |
| `/job1` | Dashboard Job 1 - Operator WTP |
| `/job1/checklist/wtp` | Checklist WTP |
| `/job1/checklist/boiler` | Checklist Boiler |
| `/job1/checklist/kompressor` | Checklist Kompressor (shared) |
| `/job2` | Dashboard Job 2 - Operator N2 |
| `/job2/checklist/n2_generator` | Checklist N2 Generator |
| `/job2/checklist/kompressor` | Checklist Kompressor (shared) |
| `/job2/checklist/lvmdp` | Checklist LVMDP |
| `/job2/checklist/air_tandon` | Checklist Air Tandon |
| `/job3` | Dashboard Job 3 - Facility |
| `/job3/checklist/pemakaian_air` | Checklist Pemakaian Air |
| `/job3/checklist/pemakaian_gas` | Checklist Pemakaian Gas |
| `/job3/checklist/suhu_trafo` | Checklist Suhu Trafo |
| `/job3/checklist/energi_listrik` | Checklist Energi Listrik |
| `/rangkuman` | Rangkuman Harian (filter tanggal, unduh PDF) |
| `/inventory` | Alat & Bahan (import Excel/CSV otomatis, quantity desimal, foto, batch delete) |
| `/admin` | Admin Panel (admin only) |

## License

MIT
