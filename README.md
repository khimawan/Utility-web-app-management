# Utility Management Web App

A web-based utility management system for monitoring, checklist tracking, and work management in industrial facilities.

## Features

### Checklist Management
- **Job 1 (Operator WTP):** WTP, Boiler, Kompressor 01, Kompressor 02
- **Job 2 (Operator N2):** N2 Generator, Kompressor 03, Kompressor 04, LVMDP, Air Tandon
- **Job 3 (Facility):** Pemakaian Air Sumur, Pemakaian Gas, Suhu Trafo, Energi Listrik

Each checklist supports custom form fields including PIC selection, shift, monitoring date/time, numeric readings, and yes/no selections with submit and clear form buttons.

### Jadwal Utility
- Members can submit overtime requests (multi-member selection)
- Admin approves/rejects overtime submissions
- Approved overtime automatically creates shift schedule entries
- Schedule management by date with shift-based views

### Warning & Work Tracking
- Machine warning reporting with photo upload
- Work assignment with member selection and progress tracking
- Activity logging and summary

### Inventory & Sparepart
- Sparepart request management
- Inventory tracking for tools, parts, and materials

### Dashboard & Summary
- Daily activity summary (Rangkuman)
- Summary data with charts per category
- Profile management (team profile, job descriptions)

## Tech Stack

- **Runtime:** Node.js + Express.js
- **Database:** SQLite (via sql.js)
- **Template Engine:** EJS
- **Frontend:** Bootstrap 5, Bootstrap Icons
- **PDF:** pdfkit
- **Excel:** exceljs

## Default Accounts

| Role     | Username  | Password  |
|----------|-----------|-----------|
| Admin    | adminaja  | adminaja  |
| Member   | member01  | member01  |

## Local Development

```bash
# Install dependencies
npm install

# Run the app
npm start

# Or with nodemon for development
npm run dev
```

The app will be available at http://localhost:3000

## Docker Deployment

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or build and run directly
docker build -t utility-management-app .
docker run -p 3000:3000 -v $(pwd)/data:/app/data utility-management-app

# Stop
docker-compose down
```

The SQLite database is stored in the `./data` directory, which is persisted via Docker volume mount.

## Project Structure

```
utility-management-webapp/
├── server.js              # Express server entry point
├── config/
│   └── database.js        # SQLite setup, schema, migrations, helpers
├── middleware/
│   └── auth.js            # Authentication & authorization
├── routes/
│   ├── auth.js            # Login/logout
│   ├── awal.js            # Home page, summary, warnings
│   ├── member.js          # Jadwal member page + overtime submission
│   ├── admin.js           # Admin panel + management jadwal
│   ├── job1.js            # Job 1 checklists (WTP, Boiler, Kompressor)
│   ├── job2.js            # Job 2 checklists (N2, Kompressor, LVMDP)
│   ├── job3.js            # Job 3 checklists (Air, Gas, Trafo, Listrik)
│   ├── inventory.js       # Inventory management
│   ├── rangkuman.js       # Daily activity summary
│   └── sparepart.js       # Sparepart requests
├── views/
│   ├── partials/          # Header, sidebar, footer, topnav
│   └── pages/
│       ├── awal/          # Home, member/jadwal, summary, warnings
│       ├── admin/         # Admin panel, overtime management
│       ├── job1/          # Job 1 checklists
│       ├── job2/          # Job 2 checklists
│       ├── job3/          # Job 3 checklists
│       ├── inventory/     # Inventory pages
│       ├── rangkuman/     # Daily summary
│       ├── sparepart/     # Sparepart pages
│       ├── summary/       # Data summary with charts
│       ├── warning/       # Warning pages
│       └── member/        # Member pages
├── public/                # Static assets (CSS, JS, images)
├── data/                  # SQLite database (auto-created)
├── database.sql           # PostgreSQL schema (reference)
├── seed.sql               # PostgreSQL seed data (reference)
├── plan build/            # Design documents for checklists
├── Dockerfile             # Docker build config
├── docker-compose.yml     # Docker Compose config
└── package.json           # Node.js dependencies
```

## Database Tables

| # | Table | Description |
|---|-------|-------------|
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
| 18 | file_uploads | File uploads |
| 19 | overtime_submissions | Overtime requests |
| 20 | overtime_members | Overtime-member junction |

## License

MIT
