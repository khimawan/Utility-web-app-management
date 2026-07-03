# Utility Management Web App

Sistem manajemen utilitas berbasis web untuk monitoring, checklist tracking, dan work management di fasilitas industri.

## Fitur Utama

### Checklist Management

#### Job 1 - Operator WTP
| Checklist | Tipe | Deskripsi |
|-----------|------|-----------|
| **Checklist WTP** | Custom Form | Predictive & Preventive. Predictive: status operasional, pompa GD4/Boiler/HPP/GD7 (arus+temp), membran RO, pressure, TDS, chemical, backwash, UV. Preventive: penggantian media + foto dokumentasi |
| **Checklist Boiler** | Custom Form | Predictive: kapasitas boiler, steam/flue gas/feed water/scale monitor temperature, pressure, chemical, blowdown, strainer. Preventive: maintener, aktivitas, deskripsi, foto |
| **Checklist Kompressor** | Custom Form | Predictive: air compressor 01-04, mode, running hour, pressure, flow rate, motor/oil temp, bunyi abnormal, kebocoran oli, drayer. Preventive: 12 item maintenance (3000h-12000h) + foto |

#### Job 2 - Operator N2
| Checklist | Tipe | Deskripsi |
|-----------|------|-----------|
| **Checklist N2 Generator** | Custom Form | Predictive: mesin GD6/GD4, suhu area, running hour, pressure, frequency, power, drayer, purify, gas cylinder. Preventive: 7 item maintenance + foto |
| **Checklist Kompressor** | Custom Form | Form yang sama dengan Job 1 (shared view) |
| **Checklist LVMDP** | Template-based | Parameter dinamis: LVMDP 147/197/555 KVA, Trafo 630/2000 KVA |
| **Checklist Air Tandon** | Template-based | Level air, tekanan pompa, kondisi pipa |

#### Job 3 - Facility
| Checklist | Deskripsi |
|-----------|-----------|
| **Pemakaian Air** | Monitoring meteran sibel 01-06 |
| **Pemakaian Gas** | Meteran gas awal/akhir, tekanan |
| **Suhu Trafo** | Suhu fasa R/S/T, suhu oli |
| **Energi Listrik** | KWH WBP/LWBP, PF capacitor bank |

#### Fitur Conditional Logic
- **Predictive/Preventive toggle**: Memilih jenis kegiatan menampilkan form yang sesuai
- **Status operasional Off**: Semua field predictive disembunyikan, langsung ke submit
- **Warning otomatis**: Pressure membran >10 Kg/cm² atau TDS >200
- **Kondisi backwash**: Jika "Belum", kolom kondisi air muncul
- **Preventive "Masih OK"**: Kolom komentar muncul untuk input kondisi

### Jadwal Utility
- Member submit overtime request (multi-member selection)
- Admin approve/reject overtime submissions
- Approved overtime otomatis membuat jadwal shift
- Schedule management per date dengan shift-based views

### Warning & Work Tracking
- Machine warning dengan photo upload
- Work assignment dengan member selection dan progress tracking
- Activity logging dan summary

### Inventory & Sparepart
- Sparepart request management
- Inventory tracking untuk tools, parts, dan materials

### Dashboard & Summary
- Daily activity summary (Rangkuman)
- Summary data dengan charts per category
- Profile management (team profile, job descriptions)

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| **Runtime** | Node.js + Express.js |
| **Database** | SQLite (via sql.js) |
| **Template Engine** | EJS |
| **Frontend** | Bootstrap 5, Bootstrap Icons |
| **File Upload** | Multer |
| **PDF** | pdfkit |
| **Excel** | exceljs |

## Default Accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | adminaja | adminaja |
| Member | member01 | member01 |

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
# Build dan run
docker-compose up -d

# Atau build langsung
docker build -t utility-management-app .
docker run -p 3000:3000 -v $(pwd)/data:/app/data utility-management-app

# Stop
docker-compose down
```

SQLite database tersimpan di `./data` directory (persist via Docker volume mount).

## Project Structure

```
utility-management-webapp/
├── server.js                    # Express server entry point
├── config/
│   └── database.js              # SQLite setup, schema, migrations, helpers
├── middleware/
│   └── auth.js                  # Authentication & authorization
├── routes/
│   ├── auth.js                  # Login/logout
│   ├── awal.js                  # Home page, summary, warnings
│   ├── member.js                # Jadwal member + overtime submission
│   ├── admin.js                 # Admin panel + management jadwal
│   ├── job1.js                  # Job 1 (WTP, Boiler, Kompressor)
│   ├── job2.js                  # Job 2 (N2, Kompressor, LVMDP, Air Tandon)
│   ├── job3.js                  # Job 3 (Air, Gas, Trafo, Listrik)
│   ├── inventory.js             # Inventory management
│   ├── rangkuman.js             # Daily activity summary
│   └── sparepart.js             # Sparepart requests
├── views/
│   ├── partials/                # Header, sidebar, footer, topnav
│   └── pages/
│       ├── job1/
│       │   ├── checklist-wtp.ejs           # Checklist WTP (custom form)
│       │   ├── checklist-boiler.ejs        # Checklist Boiler (custom form)
│       │   ├── checklist-kompressor-form.ejs # Checklist Kompressor (shared)
│       │   ├── checklist-kompressor.ejs    # Kompressor 01+02 (tabbed)
│       │   └── index.ejs                   # Dashboard Job 1
│       ├── job2/
│       │   ├── checklist-n2.ejs            # Checklist N2 Generator
│       │   ├── checklist-kompressor.ejs    # Kompressor 03+04 (tabbed)
│       │   └── index.ejs                   # Dashboard Job 2
│       └── job3/                           # Job 3 checklists
├── public/                      # Static assets (CSS, JS, uploads)
├── data/                        # SQLite database (auto-created)
├── Dockerfile                   # Docker build config
├── docker-compose.yml           # Docker Compose config
└── package.json                 # Node.js dependencies
```

## Database Tables

| # | Table | Deskripsi |
|---|-------|-----------|
| 1 | users | User accounts (admin/member) |
| 2 | utility_profile | Landing page content |
| 3 | job_descriptions | Job role descriptions |
| 4 | machines | Machine profiles |
| 5 | schedules | Shift schedules |
| 6 | checklist_templates | Checklist parameter definitions |
| 7 | checklist_entries | Checklist submission headers |
| 8 | checklist_values | Individual parameter values |
| 9 | warnings | Machine warnings |
| 10 | warning_members | Warning-member junction |
| 11 | works | Facility work jobs |
| 12 | work_members | Work-member junction |
| 13 | spareparts | Sparepart requests |
| 14 | inventory_items | Inventory stock |
| 15 | working_instructions | Working instructions |
| 16 | gallery_photos | Photo gallery |
| 17 | activity_logs | Activity logs |
| 18 | overtime_submissions | Overtime requests |
| 19 | overtime_members | Overtime-member junction |
| 20 | checklist_wtp | Checklist WTP (custom form) |
| 21 | checklist_boiler | Checklist Boiler (custom form) |
| 22 | checklist_n2 | Checklist N2 Generator (custom form) |
| 23 | checklist_kompressor | Checklist Kompressor (shared Job 1 & 2) |

## Halaman Akses

| URL | Deskripsi |
|-----|-----------|
| `/login` | Login page |
| `/awal` | Profil Utility |
| `/job1` | Dashboard Job 1 - Operator WTP |
| `/job1/checklist/wtp` | Checklist WTP (Predictive/Preventive) |
| `/job1/checklist/boiler` | Checklist Boiler (Predictive/Preventive) |
| `/job1/checklist/kompressor` | Checklist Kompressor (shared) |
| `/job2` | Dashboard Job 2 - Operator N2 |
| `/job2/checklist/n2_generator` | Checklist N2 Generator (Predictive/Preventive) |
| `/job2/checklist/kompressor` | Checklist Kompressor (shared) |
| `/job2/checklist/lvmdp` | Checklist LVMDP |
| `/job2/checklist/air_tandon` | Checklist Air Tandon |
| `/job3` | Dashboard Job 3 - Facility |
| `/rangkuman` | Rangkuman Harian |
| `/inventory` | Alat & Bahan |
| `/admin` | Admin Panel (admin only) |

## License

MIT
