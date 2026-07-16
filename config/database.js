const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'utility.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
    // Migration: update pemakaian_air templates to new air sumur format
    migratePemakaianAir();
    migrateLvmdp();
    migrateEnergiListrik();
    migrateOvertimeTables();
    migrateChecklistWtp();
    migrateChecklistBoiler();
    migrateChecklistN2();
    migrateChecklistKompressor();
    migrateUtilityRequests();
    migrateChecklistEntriesPhoto();
  } else {
    db = new SQL.Database();
    initSchema(db);
    saveDb();
  }

  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function initSchema(db) {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    position TEXT NOT NULL DEFAULT 'member',
    job TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS utility_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT NOT NULL,
    title TEXT,
    description TEXT,
    photo_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS job_descriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL,
    title TEXT,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    job_type TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_date TEXT NOT NULL,
    shift TEXT NOT NULL,
    member_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    job TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS checklist_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    parameter_name TEXT NOT NULL,
    parameter_type TEXT NOT NULL DEFAULT 'number',
    unit TEXT,
    min_value REAL,
    max_value REAL,
    default_value TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS checklist_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    shift TEXT NOT NULL,
    machine_id INTEGER REFERENCES machines(id),
    input_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS checklist_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER REFERENCES checklist_entries(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES checklist_templates(id),
    parameter_value TEXT,
    photo_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warning_date TEXT NOT NULL,
    machine_name TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    repair_notes TEXT,
    repair_percentage REAL DEFAULT 0,
    status TEXT DEFAULT 'open',
    input_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS warning_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warning_id INTEGER REFERENCES warnings(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(warning_id, member_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS works (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_date TEXT NOT NULL,
    area TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    repair_notes TEXT,
    repair_percentage REAL DEFAULT 0,
    status TEXT DEFAULT 'open',
    input_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS work_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id INTEGER REFERENCES works(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(work_id, member_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS overtime_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    overtime_date TEXT NOT NULL,
    shift TEXT NOT NULL,
    schedule_type TEXT NOT NULL,
    job TEXT NOT NULL,
    assigned_job TEXT,
    status TEXT DEFAULT 'pending',
    submitted_by INTEGER REFERENCES users(id),
    admin_notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS overtime_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER REFERENCES overtime_submissions(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(submission_id, member_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS spareparts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_date TEXT NOT NULL,
    item_name TEXT NOT NULL,
    specification TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    category TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'tidak',
    photo_url TEXT,
    progress TEXT DEFAULT 'belum_dipesan',
    input_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    item_name TEXT NOT NULL,
    specification TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    photo_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS working_instructions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    job_type TEXT NOT NULL,
    related_machines TEXT,
    file_url TEXT NOT NULL,
    description TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS gallery_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    photo_url TEXT NOT NULL,
    caption TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_type TEXT NOT NULL,
    reference_id INTEGER,
    reference_table TEXT,
    member_id INTEGER REFERENCES users(id),
    shift TEXT,
    job TEXT,
    description TEXT,
    activity_date TEXT NOT NULL,
    activity_time TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS checklist_wtp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER REFERENCES users(id),
    shift TEXT NOT NULL,
    jam_monitoring TEXT,
    tanggal_monitoring TEXT,
    jenis_kegiatan TEXT NOT NULL,
    status_operasional TEXT,
    pompa_gd4_arus REAL,
    pompa_gd4_temp REAL,
    pompa_booster_arus REAL,
    pompa_booster_temp REAL,
    motor_hpp_arus REAL,
    motor_hpp_temp REAL,
    motor_gd7_arus REAL,
    motor_gd7_temp REAL,
    premate_membran_ro REAL,
    reject_membran_ro REAL,
    mmf_inlet_pressure REAL,
    catridge_pressure REAL,
    membran_pressure REAL,
    nilai_tds REAL,
    nilai_conductivity REAL,
    chemical_wtp TEXT,
    level_tandon_ro1 REAL,
    level_tandon_ro2 REAL,
    level_tandon_ro_gd4 TEXT,
    backwash_mmf TEXT,
    backwash_sebelum TEXT,
    backwash_sesudah TEXT,
    regenerasi_softener TEXT,
    status_mesin_uv TEXT,
    penggantian_membran_ro TEXT,
    penggantian_membran_ro_comment TEXT,
    penggantian_media_softener TEXT,
    penggantian_media_softener_comment TEXT,
    penggantian_media_carbon TEXT,
    penggantian_media_carbon_comment TEXT,
    penggantian_media_mn_zeloit TEXT,
    penggantian_media_mn_zeloit_comment TEXT,
    penggantian_catridge_filter TEXT,
    penggantian_catridge_filter_comment TEXT,
    foto_url TEXT,
    photo_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS checklist_boiler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER REFERENCES users(id),
    shift TEXT NOT NULL,
    jam_monitoring TEXT,
    tanggal_monitoring TEXT,
    jenis_kegiatan TEXT NOT NULL,
    status_operasional TEXT,
    boiler_capacity TEXT,
    steam_pressure REAL,
    flue_gas_temp REAL,
    feed_water_temp REAL,
    scale_monitor_temp REAL,
    pressure_gas REAL,
    pressure_header REAL,
    garam_softener TEXT,
    chemical_boiler TEXT,
    blowdown TEXT,
    cleaning_strainer TEXT,
    preventive_maintener TEXT,
    preventive_aktivitas TEXT,
    preventive_deskripsi TEXT,
    preventive_foto_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS checklist_n2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER REFERENCES users(id),
    shift TEXT NOT NULL,
    jam_monitoring TEXT,
    tanggal_monitoring TEXT,
    jenis_kegiatan TEXT NOT NULL,
    status_operasional TEXT,
    pilih_mesin TEXT,
    temperature_area REAL,
    running_hour REAL,
    pressure REAL,
    temperature_mesin REAL,
    freq_min REAL,
    freq_max REAL,
    power_min REAL,
    power_max REAL,
    drayer_temp_high REAL,
    drayer_temp_low REAL,
    purify_percent REAL,
    purify_flow REAL,
    gas_compressor REAL,
    gas_drayer REAL,
    gas_absorption_a REAL,
    gas_absorption_b REAL,
    gas_nitrogen REAL,
    gas_filter REAL,
    change_air_filter_6 TEXT,
    change_oil_filter_6 TEXT,
    change_oil_water_sep_6 TEXT,
    change_air_filter_t_12 TEXT,
    change_air_filter_a_12 TEXT,
    change_air_filter_x_12 TEXT,
    check_electromagnetic TEXT,
    foto_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS checklist_kompressor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER REFERENCES users(id),
    shift TEXT NOT NULL,
    jam_monitoring TEXT,
    tanggal_monitoring TEXT,
    jenis_kegiatan TEXT NOT NULL,
    status_operasional TEXT,
    air_compressor TEXT,
    mode TEXT,
    running_hour REAL,
    system_pressure REAL,
    flow_rate REAL,
    motor_temperature REAL,
    oil_temperature REAL,
    bunyi_abnormal TEXT,
    kebocoran_oli TEXT,
    drayer_status TEXT,
    drayer_humidity_temp TEXT,
    change_filter_mat TEXT,
    oil_change TEXT,
    change_oil_filter TEXT,
    change_air_filter TEXT,
    change_belt_coupling TEXT,
    change_oil_separator TEXT,
    check_ecodrain TEXT,
    bearing_lube_drive TEXT,
    change_bearing TEXT,
    check_electrical TEXT,
    bearing_lube TEXT,
    check_valve TEXT,
    foto_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS utility_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_name TEXT NOT NULL,
    position TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    work_area TEXT NOT NULL,
    building TEXT NOT NULL,
    issue TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium',
    photo_url TEXT,
    status TEXT DEFAULT 'open',
    repair_notes TEXT,
    repair_percentage REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS utility_request_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER REFERENCES utility_requests(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(request_id, member_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS utility_landing_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_key TEXT NOT NULL UNIQUE,
    content_value TEXT,
    content_image TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Seed data
  db.run(`INSERT INTO users (name, username, password, position, job) VALUES ('Administrator', 'adminaja', 'adminaja', 'admin', NULL)`);
  db.run(`INSERT INTO users (name, username, password, position, job) VALUES ('Member 01', 'member01', 'member01', 'member', 'operator_wtp')`);

  const machines = [
    ['WTP', 'operator_wtp', 'Water Treatment Plant'],
    ['Boiler', 'operator_wtp', 'Boiler System'],
    ['Kompressor 01', 'operator_wtp', 'Kompressor 01'],
    ['Kompressor 02', 'operator_wtp', 'Kompressor 02'],
    ['N2 Generator', 'operator_n2', 'Nitrogen Generator'],
    ['Kompressor 03', 'operator_n2', 'Kompressor 03'],
    ['Kompressor 04', 'operator_n2', 'Kompressor 04'],
    ['LVMDP', 'operator_n2', 'Low Voltage Main Distribution Panel'],
    ['Air Tandon', 'operator_n2', 'Air Tandon / Water Tank']
  ];
  machines.forEach(m => {
    db.run('INSERT INTO machines (name, job_type, description) VALUES (?, ?, ?)', m);
  });

  const templates = [
    ['wtp', 'Tekanan Air Input', 'number', 'bar', 0, 10, 1],
    ['wtp', 'Tekanan Air Output', 'number', 'bar', 0, 10, 2],
    ['wtp', 'Flow Rate', 'number', 'm3/h', 0, 500, 3],
    ['wtp', 'Turbidity Input', 'number', 'NTU', 0, 100, 4],
    ['wtp', 'Turbidity Output', 'number', 'NTU', 0, 10, 5],
    ['wtp', 'pH Air Input', 'number', '', 0, 14, 6],
    ['wtp', 'pH Air Output', 'number', '', 0, 14, 7],
    ['wtp', 'Kondisi Pompa', 'text', '', null, null, 8],
    ['wtp', 'Kondisi Valve', 'text', '', null, null, 9],
    ['wtp', 'Level Chemical', 'text', '', null, null, 10],
    ['wtp', 'Catatan', 'text', '', null, null, 11],
    ['boiler', 'Tekanan Uap', 'number', 'bar', 0, 20, 1],
    ['boiler', 'Suhu Air Input', 'number', 'C', 0, 100, 2],
    ['boiler', 'Suhu Air Output', 'number', 'C', 0, 200, 3],
    ['boiler', 'Level Air Boiler', 'number', '%', 0, 100, 4],
    ['boiler', 'Kondensi', 'text', '', null, null, 5],
    ['boiler', 'Pompa Feed Water', 'text', '', null, null, 6],
    ['boiler', 'Burner Status', 'text', '', null, null, 7],
    ['boiler', 'Kondisi Pipa', 'text', '', null, null, 8],
    ['boiler', 'Catatan', 'text', '', null, null, 9],
    ['kompressor01', 'Tekanan Output', 'number', 'bar', 0, 15, 1],
    ['kompressor01', 'Suhu Udara Output', 'number', 'C', 0, 100, 2],
    ['kompressor01', 'Level Oli', 'number', '%', 0, 100, 3],
    ['kompressor01', 'Suhu Oli', 'number', 'C', 0, 120, 4],
    ['kompressor01', 'Kondisi Filter', 'text', '', null, null, 5],
    ['kompressor01', 'Kondisi Belt/Pulley', 'text', '', null, null, 6],
    ['kompressor01', 'Drain Condensate', 'text', '', null, null, 7],
    ['kompressor01', 'Catatan', 'text', '', null, null, 8],
    ['kompressor02', 'Tekanan Output', 'number', 'bar', 0, 15, 1],
    ['kompressor02', 'Suhu Udara Output', 'number', 'C', 0, 100, 2],
    ['kompressor02', 'Level Oli', 'number', '%', 0, 100, 3],
    ['kompressor02', 'Suhu Oli', 'number', 'C', 0, 120, 4],
    ['kompressor02', 'Kondisi Filter', 'text', '', null, null, 5],
    ['kompressor02', 'Kondisi Belt/Pulley', 'text', '', null, null, 6],
    ['kompressor02', 'Drain Condensate', 'text', '', null, null, 7],
    ['kompressor02', 'Catatan', 'text', '', null, null, 8],
    ['kompressor03', 'Tekanan Output', 'number', 'bar', 0, 15, 1],
    ['kompressor03', 'Suhu Udara Output', 'number', 'C', 0, 100, 2],
    ['kompressor03', 'Level Oli', 'number', '%', 0, 100, 3],
    ['kompressor03', 'Suhu Oli', 'number', 'C', 0, 120, 4],
    ['kompressor03', 'Kondisi Filter', 'text', '', null, null, 5],
    ['kompressor03', 'Kondisi Belt/Pulley', 'text', '', null, null, 6],
    ['kompressor03', 'Drain Condensate', 'text', '', null, null, 7],
    ['kompressor03', 'Catatan', 'text', '', null, null, 8],
    ['kompressor04', 'Tekanan Output', 'number', 'bar', 0, 15, 1],
    ['kompressor04', 'Suhu Udara Output', 'number', 'C', 0, 100, 2],
    ['kompressor04', 'Level Oli', 'number', '%', 0, 100, 3],
    ['kompressor04', 'Suhu Oli', 'number', 'C', 0, 120, 4],
    ['kompressor04', 'Kondisi Filter', 'text', '', null, null, 5],
    ['kompressor04', 'Kondisi Belt/Pulley', 'text', '', null, null, 6],
    ['kompressor04', 'Drain Condensate', 'text', '', null, null, 7],
    ['kompressor04', 'Catatan', 'text', '', null, null, 8],
    ['n2_generator', 'Purity N2', 'number', '%', 90, 100, 1],
    ['n2_generator', 'Flow Rate N2', 'number', 'Nm3/h', 0, 500, 2],
    ['n2_generator', 'Tekanan Output N2', 'number', 'bar', 0, 10, 3],
    ['n2_generator', 'Tekanan Input Udara', 'number', 'bar', 0, 10, 4],
    ['n2_generator', 'Suhu Output N2', 'number', 'C', 0, 60, 5],
    ['n2_generator', 'Kondisi Membran/Zeolite', 'text', '', null, null, 6],
    ['n2_generator', 'Kondisi Valve', 'text', '', null, null, 7],
    ['n2_generator', 'Level Oli Separator', 'text', '', null, null, 8],
    ['n2_generator', 'Catatan', 'text', '', null, null, 9],
    ['lvmdp', 'Tegangan R (Volt)', 'number', 'V', 350, 450, 1],
    ['lvmdp', 'Tegangan S (Volt)', 'number', 'V', 350, 450, 2],
    ['lvmdp', 'Tegangan T (Volt)', 'number', 'V', 350, 450, 3],
    ['lvmdp', 'Arus R (Ampere)', 'number', 'A', 0, 2000, 4],
    ['lvmdp', 'Arus S (Ampere)', 'number', 'A', 0, 2000, 5],
    ['lvmdp', 'Arus T (Ampere)', 'number', 'A', 0, 2000, 6],
    ['lvmdp', 'Frekuensi', 'number', 'Hz', 49, 51, 7],
    ['lvmdp', 'Power Factor', 'number', '', 0, 1, 8],
    ['lvmdp', 'Kondisi Panel', 'text', '', null, null, 9],
    ['lvmdp', 'Suhu Panel', 'number', 'C', 0, 80, 10],
    ['lvmdp', 'Catatan', 'text', '', null, null, 11],
    ['air_tandon', 'Level Air Tandon', 'number', '%', 0, 100, 1],
    ['air_tandon', 'Tekanan Pompa', 'number', 'bar', 0, 10, 2],
    ['air_tandon', 'Kondisi Pompa', 'text', '', null, null, 3],
    ['air_tandon', 'Kondisi Pipa', 'text', '', null, null, 4],
    ['air_tandon', 'Kualitas Air', 'text', '', null, null, 5],
    ['air_tandon', 'Catatan', 'text', '', null, null, 6],
    ['pemakaian_air', 'Jam Monitoring', 'time', '', null, null, 1],
    ['pemakaian_air', 'Tanggal Monitoring', 'date', '', null, null, 2],
    ['pemakaian_air', 'Meretan Sibel 01', 'number', 'M³', 0, 999999, 3],
    ['pemakaian_air', 'Meretan Sibel 02', 'number', 'M³', 0, 999999, 4],
    ['pemakaian_air', 'Meretan Sibel 03', 'number', 'M³', 0, 999999, 5],
    ['pemakaian_air', 'Meretan Sibel 04', 'number', 'M³', 0, 999999, 6],
    ['pemakaian_air', 'Meretan Sibel 05', 'number', 'M³', 0, 999999, 7],
    ['pemakaian_air', 'Meretan Sibel 06', 'number', 'M³', 0, 999999, 8],
    ['pemakaian_gas', 'Meteran Gas Awal', 'number', 'm3', 0, 999999, 1],
    ['pemakaian_gas', 'Meteran Gas Akhir', 'number', 'm3', 0, 999999, 2],
    ['pemakaian_gas', 'Total Pemakaian', 'number', 'm3', 0, 999999, 3],
    ['pemakaian_gas', 'Tekanan Gas', 'number', 'mbar', 0, 500, 4],
    ['pemakaian_gas', 'Catatan', 'text', '', null, null, 5],
    ['suhu_trafo', 'Suhu Trafo Fasa R', 'number', 'C', 0, 150, 1],
    ['suhu_trafo', 'Suhu Trafo Fasa S', 'number', 'C', 0, 150, 2],
    ['suhu_trafo', 'Suhu Trafo Fasa T', 'number', 'C', 0, 150, 3],
    ['suhu_trafo', 'Suhu Oil', 'number', 'C', 0, 100, 4],
    ['suhu_trafo', 'Kondisi Trafo', 'text', '', null, null, 5],
    ['suhu_trafo', 'Catatan', 'text', '', null, null, 6],
    ['listrik_trafo', 'Tegangan Primer', 'number', 'kV', 0, 30, 1],
    ['listrik_trafo', 'Tegangan Sekunder', 'number', 'V', 350, 450, 2],
    ['listrik_trafo', 'Arus Primer', 'number', 'A', 0, 1000, 3],
    ['listrik_trafo', 'Arus Sekunder', 'number', 'A', 0, 5000, 4],
    ['listrik_trafo', 'Daya (kVA)', 'number', 'kVA', 0, 5000, 5],
    ['listrik_trafo', 'Power Factor', 'number', '', 0, 1, 6],
    ['listrik_trafo', 'Frekuensi', 'number', 'Hz', 49, 51, 7],
    ['listrik_trafo', 'Kondisi Trafo', 'text', '', null, null, 8],
    ['listrik_trafo', 'Catatan', 'text', '', null, null, 9],
  ];
  templates.forEach(t => {
    db.run('INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)', t);
  });

  db.run(`INSERT INTO job_descriptions (job_type, title, description, sort_order) VALUES ('operator_wtp', 'Operator WTP', 'Bertanggung jawab atas operasional Water Treatment Plant, Boiler, dan Kompressor.', 1)`);
  db.run(`INSERT INTO job_descriptions (job_type, title, description, sort_order) VALUES ('operator_n2', 'Operator N2', 'Bertanggung jawab atas operasional N2 Generator, Kompressor, LVMDP, dan Air Tandon.', 2)`);
  db.run(`INSERT INTO job_descriptions (job_type, title, description, sort_order) VALUES ('facility', 'Facility', 'Bertanggung jawab atas pemakaian air, gas, suhu trafo, listrik trafo, dan pekerjaan facility.', 3)`);

  db.run(`INSERT INTO utility_profile (section, title, description, sort_order) VALUES ('team_profile', 'Profil Tim Utility', 'Tim utility bertanggung jawab untuk memastikan kelancaran operasional seluruh sistem pendukung di area produksi.', 1)`);
  db.run(`INSERT INTO utility_profile (section, title, description, sort_order) VALUES ('jobdesk', 'Jobdesk Utility', 'Tim utility terdiri dari 3 job utama: Operator WTP, Operator N2, dan Facility.', 2)`);

  // Seed landing page content
  const landingContent = [
    ['welcome_title', 'Selamat Datang di Sistem Utility', null],
    ['welcome_subtitle', 'Pengajuan Bantuan & Tracking Pekerjaan Utility', null],
    ['welcome_description', 'Sistem ini memudahkan Anda untuk mengajukan bantuan terkait utility (air, listrik, gas, HVAC) dan memantau progress pengerjaannya secara realtime.', null],
    ['welcome_image', null, '/uploads/photos/default-utility.jpg'],
    ['btn_submit_text', 'Input Pengajuan', null],
    ['btn_tracking_text', 'Tracking Pengajuan', null],
  ];
  landingContent.forEach(function(c) {
    db.run(`INSERT OR IGNORE INTO utility_landing_content (content_key, content_value, content_image) VALUES (?, ?, ?)`, c);
  });
}

function migratePemakaianAir() {
  try {
    const existing = dbAll("SELECT COUNT(*) as cnt FROM checklist_templates WHERE category = 'pemakaian_air'");
    if (existing[0] && existing[0].cnt > 0) {
      const hasNewFields = dbAll("SELECT COUNT(*) as cnt FROM checklist_templates WHERE category = 'pemakaian_air' AND parameter_name = 'Meretan Sibel 01'");
      if (hasNewFields[0] && hasNewFields[0].cnt > 0) return;
      db.run("DELETE FROM checklist_values WHERE template_id IN (SELECT id FROM checklist_templates WHERE category = 'pemakaian_air')");
      db.run("DELETE FROM checklist_templates WHERE category = 'pemakaian_air'");
    }
    const newTemplates = [
      ['pemakaian_air', 'Jam Monitoring', 'time', '', null, null, 1],
      ['pemakaian_air', 'Tanggal Monitoring', 'date', '', null, null, 2],
      ['pemakaian_air', 'Meretan Sibel 01', 'number', 'M³', 0, 999999, 3],
      ['pemakaian_air', 'Meretan Sibel 02', 'number', 'M³', 0, 999999, 4],
      ['pemakaian_air', 'Meretan Sibel 03', 'number', 'M³', 0, 999999, 5],
      ['pemakaian_air', 'Meretan Sibel 04', 'number', 'M³', 0, 999999, 6],
      ['pemakaian_air', 'Meretan Sibel 05', 'number', 'M³', 0, 999999, 7],
      ['pemakaian_air', 'Meretan Sibel 06', 'number', 'M³', 0, 999999, 8],
    ];
    newTemplates.forEach(t => {
      db.run('INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)', t);
    });
    saveDb();
    console.log('Migration: pemakaian_air templates updated to air sumur format');
  } catch (err) {
    console.error('Migration error:', err);
  }
}

function migrateLvmdp() {
  try {
    const existing = dbAll("SELECT COUNT(*) as cnt FROM checklist_templates WHERE category = 'lvmdp'");
    if (existing[0] && existing[0].cnt > 0) {
      const hasNewFields = dbAll("SELECT COUNT(*) as cnt FROM checklist_templates WHERE category = 'lvmdp' AND parameter_name = 'Jam Monitoring'");
      if (hasNewFields[0] && hasNewFields[0].cnt > 0) return;
      db.run("DELETE FROM checklist_values WHERE template_id IN (SELECT id FROM checklist_templates WHERE category = 'lvmdp')");
      db.run("DELETE FROM checklist_templates WHERE category = 'lvmdp'");
    }
    const newTemplates = [
      ['lvmdp', 'Jam Monitoring', 'time', '', null, null, 1],
      ['lvmdp', 'Tanggal Monitoring', 'date', '', null, null, 2],
      ['lvmdp', 'LVMDP 147 KVA - P Total', 'number', 'kW', 0, 999999, 3],
      ['lvmdp', 'LVMDP 147 KVA - Q Total', 'number', 'kVAR', 0, 999999, 4],
      ['lvmdp', 'LVMDP 147 KVA - S Total', 'number', 'kVA', 0, 999999, 5],
      ['lvmdp', 'LVMDP 147 KVA - V Average', 'number', 'V', 0, 999999, 6],
      ['lvmdp', 'LVMDP 147 KVA - I Average', 'number', 'A', 0, 999999, 7],
      ['lvmdp', 'LVMDP 147 KVA - PF', 'number', '', 0, 1, 8],
      ['lvmdp', 'LVMDP 147 KVA - Voltage Balance', 'select', '', null, null, 9],
      ['lvmdp', 'LVMDP 147 KVA - Ampere Balance', 'select', '', null, null, 10],
      ['lvmdp', 'LVMDP 197 KVA - P Total', 'number', 'kW', 0, 999999, 11],
      ['lvmdp', 'LVMDP 197 KVA - Q Total', 'number', 'kVAR', 0, 999999, 12],
      ['lvmdp', 'LVMDP 197 KVA - S Total', 'number', 'kVA', 0, 999999, 13],
      ['lvmdp', 'LVMDP 197 KVA - V Average', 'number', 'V', 0, 999999, 14],
      ['lvmdp', 'LVMDP 197 KVA - I Average', 'number', 'A', 0, 999999, 15],
      ['lvmdp', 'LVMDP 197 KVA - PF', 'number', '', 0, 1, 16],
      ['lvmdp', 'LVMDP 197 KVA - Voltage Balance', 'select', '', null, null, 17],
      ['lvmdp', 'LVMDP 197 KVA - Ampere Balance', 'select', '', null, null, 18],
      ['lvmdp', 'LVMDP 555 KVA - P Total', 'number', 'kW', 0, 999999, 19],
      ['lvmdp', 'LVMDP 555 KVA - Q Total', 'number', 'kVAR', 0, 999999, 20],
      ['lvmdp', 'LVMDP 555 KVA - S Total', 'number', 'kVA', 0, 999999, 21],
      ['lvmdp', 'LVMDP 555 KVA - V Average', 'number', 'V', 0, 999999, 22],
      ['lvmdp', 'LVMDP 555 KVA - I Average', 'number', 'A', 0, 999999, 23],
      ['lvmdp', 'LVMDP 555 KVA - PF', 'number', '', 0, 1, 24],
      ['lvmdp', 'LVMDP 555 KVA - Voltage Balance', 'select', '', null, null, 25],
      ['lvmdp', 'LVMDP 555 KVA - Ampere Balance', 'select', '', null, null, 26],
      ['lvmdp', 'Trafo 630 KVA - Temperature Busbar', 'number', '°C', 0, 200, 27],
      ['lvmdp', 'Trafo 630 KVA - Temperature Oil', 'number', '°C', 0, 200, 28],
      ['lvmdp', 'Trafo 630 KVA - Level Oli', 'select_oli', '', null, null, 29],
      ['lvmdp', 'Trafo 630 KVA - Kebocoran Oli', 'select_bocor', '', null, null, 30],
      ['lvmdp', 'Trafo 2000 KVA - Temperature Busbar', 'number', '°C', 0, 200, 31],
      ['lvmdp', 'Trafo 2000 KVA - Temperature Oil', 'number', '°C', 0, 200, 32],
      ['lvmdp', 'Trafo 2000 KVA - Level Oli', 'select_oli', '', null, null, 33],
      ['lvmdp', 'Trafo 2000 KVA - Kebocoran Oli', 'select_bocor', '', null, null, 34],
    ];
    newTemplates.forEach(t => {
      db.run('INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)', t);
    });
    saveDb();
    console.log('Migration: lvmdp templates updated to new format');
  } catch (err) {
    console.error('Migration error:', err);
  }
}

function migrateEnergiListrik() {
  try {
    const existing = dbAll("SELECT COUNT(*) as cnt FROM checklist_templates WHERE category = 'listrik_trafo'");
    const existingNew = dbAll("SELECT COUNT(*) as cnt FROM checklist_templates WHERE category = 'energi_listrik'");
    if (existingNew[0] && existingNew[0].cnt > 0) return;
    if (existing[0] && existing[0].cnt > 0) {
      db.run("DELETE FROM checklist_values WHERE template_id IN (SELECT id FROM checklist_templates WHERE category = 'listrik_trafo')");
      db.run("DELETE FROM checklist_templates WHERE category = 'listrik_trafo'");
      db.run("UPDATE checklist_entries SET category = 'energi_listrik' WHERE category = 'listrik_trafo'");
    }
    const newTemplates = [
      ['energi_listrik', 'Jam Monitoring', 'time', '', null, null, 1],
      ['energi_listrik', 'Tanggal Monitoring', 'date', '', null, null, 2],
      ['energi_listrik', '147 KVA - KWH WBP', 'number', 'kWh', 0, 999999, 3],
      ['energi_listrik', '147 KVA - KWH LWBP', 'number', 'kWh', 0, 999999, 4],
      ['energi_listrik', '197 KVA - KWH WBP', 'number', 'kWh', 0, 999999, 5],
      ['energi_listrik', '197 KVA - KWH LWBP', 'number', 'kWh', 0, 999999, 6],
      ['energi_listrik', '555 KVA - KWH WBP', 'number', 'kWh', 0, 999999, 7],
      ['energi_listrik', '555 KVA - KWH LWBP', 'number', 'kWh', 0, 999999, 8],
      ['energi_listrik', 'PF Capacitor Bank 125 KVAR', 'number', '', 0, 1, 9],
      ['energi_listrik', 'PF Capacitor Bank 150 KVAR', 'number', '', 0, 1, 10],
      ['energi_listrik', 'PF Capacitor Bank 300 KVAR', 'number', '', 0, 1, 11],
    ];
    newTemplates.forEach(t => {
      db.run('INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)', t);
    });
    saveDb();
    console.log('Migration: energi_listrik templates updated');
  } catch (err) {
    console.error('Migration error:', err);
  }
}

function migrateOvertimeTables() {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS overtime_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      overtime_date TEXT NOT NULL,
      shift TEXT NOT NULL,
      schedule_type TEXT NOT NULL,
      job TEXT NOT NULL,
      assigned_job TEXT,
      status TEXT DEFAULT 'pending',
      submitted_by INTEGER REFERENCES users(id),
      admin_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS overtime_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER REFERENCES overtime_submissions(id) ON DELETE CASCADE,
      member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(submission_id, member_id)
    )`);
    saveDb();
  } catch (err) {
    console.error('Migration error:', err);
  }
}

function migrateChecklistWtp() {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS checklist_wtp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER REFERENCES users(id),
      shift TEXT NOT NULL,
      jam_monitoring TEXT,
      tanggal_monitoring TEXT,
      jenis_kegiatan TEXT NOT NULL,
      status_operasional TEXT,
      pompa_gd4_arus REAL,
      pompa_gd4_temp REAL,
      pompa_booster_arus REAL,
      pompa_booster_temp REAL,
      motor_hpp_arus REAL,
      motor_hpp_temp REAL,
      motor_gd7_arus REAL,
      motor_gd7_temp REAL,
      premate_membran_ro REAL,
      reject_membran_ro REAL,
      mmf_inlet_pressure REAL,
      catridge_pressure REAL,
      membran_pressure REAL,
      nilai_tds REAL,
      nilai_conductivity REAL,
      chemical_wtp TEXT,
      level_tandon_ro1 REAL,
      level_tandon_ro2 REAL,
      level_tandon_ro_gd4 TEXT,
      backwash_mmf TEXT,
      backwash_sebelum TEXT,
      backwash_sesudah TEXT,
      regenerasi_softener TEXT,
      status_mesin_uv TEXT,
      penggantian_membran_ro TEXT,
      penggantian_membran_ro_comment TEXT,
      penggantian_media_softener TEXT,
      penggantian_media_softener_comment TEXT,
      penggantian_media_carbon TEXT,
      penggantian_media_carbon_comment TEXT,
      penggantian_media_mn_zeloit TEXT,
      penggantian_media_mn_zeloit_comment TEXT,
      penggantian_catridge_filter TEXT,
      penggantian_catridge_filter_comment TEXT,
      foto_url TEXT,
      photo_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    saveDb();
  } catch (err) {
    console.error('Migration error:', err);
  }
}

function migrateChecklistBoiler() {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS checklist_boiler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER REFERENCES users(id),
      shift TEXT NOT NULL,
      jam_monitoring TEXT,
      tanggal_monitoring TEXT,
      jenis_kegiatan TEXT NOT NULL,
      status_operasional TEXT,
      boiler_capacity TEXT,
      steam_pressure REAL,
      flue_gas_temp REAL,
      feed_water_temp REAL,
      scale_monitor_temp REAL,
      pressure_gas REAL,
      pressure_header REAL,
      garam_softener TEXT,
      chemical_boiler TEXT,
      blowdown TEXT,
      cleaning_strainer TEXT,
      preventive_maintener TEXT,
      preventive_aktivitas TEXT,
      preventive_deskripsi TEXT,
      preventive_foto_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    saveDb();
  } catch (err) {
    console.error('Migration error:', err);
  }
}

function migrateChecklistN2() {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS checklist_n2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER REFERENCES users(id),
      shift TEXT NOT NULL,
      jam_monitoring TEXT,
      tanggal_monitoring TEXT,
      jenis_kegiatan TEXT NOT NULL,
      status_operasional TEXT,
      pilih_mesin TEXT,
      temperature_area REAL,
      running_hour REAL,
      pressure REAL,
      temperature_mesin REAL,
      freq_min REAL,
      freq_max REAL,
      power_min REAL,
      power_max REAL,
      drayer_temp_high REAL,
      drayer_temp_low REAL,
      purify_percent REAL,
      purify_flow REAL,
      gas_compressor REAL,
      gas_drayer REAL,
      gas_absorption_a REAL,
      gas_absorption_b REAL,
      gas_nitrogen REAL,
      gas_filter REAL,
      change_air_filter_6 TEXT,
      change_oil_filter_6 TEXT,
      change_oil_water_sep_6 TEXT,
      change_air_filter_t_12 TEXT,
      change_air_filter_a_12 TEXT,
      change_air_filter_x_12 TEXT,
      check_electromagnetic TEXT,
      foto_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    try { db.run("ALTER TABLE checklist_n2 ADD COLUMN temperature_mesin REAL"); } catch (e) {}
    saveDb();
  } catch (err) {
    console.error('Migration error:', err);
  }
}

function migrateChecklistKompressor() {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS checklist_kompressor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER REFERENCES users(id),
      shift TEXT NOT NULL,
      jam_monitoring TEXT,
      tanggal_monitoring TEXT,
      jenis_kegiatan TEXT NOT NULL,
      status_operasional TEXT,
      air_compressor TEXT,
      mode TEXT,
      running_hour REAL,
      system_pressure REAL,
      flow_rate REAL,
      motor_temperature REAL,
      oil_temperature REAL,
      bunyi_abnormal TEXT,
      kebocoran_oli TEXT,
      drayer_status TEXT,
      drayer_humidity_temp TEXT,
      change_filter_mat TEXT,
      oil_change TEXT,
      change_oil_filter TEXT,
      change_air_filter TEXT,
      change_belt_coupling TEXT,
      change_oil_separator TEXT,
      check_ecodrain TEXT,
      bearing_lube_drive TEXT,
      change_bearing TEXT,
      check_electrical TEXT,
      bearing_lube TEXT,
      check_valve TEXT,
      foto_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    saveDb();
  } catch (err) {
    console.error('Migration error:', err);
  }
}

function migrateUtilityRequests() {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS utility_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_name TEXT NOT NULL,
      position TEXT,
      whatsapp TEXT,
      work_area TEXT,
      building TEXT,
      issue TEXT,
      priority TEXT DEFAULT 'Medium',
      photo_url TEXT,
      status TEXT DEFAULT 'open',
      repair_notes TEXT DEFAULT '',
      repair_percentage REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS utility_request_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER REFERENCES utility_requests(id) ON DELETE CASCADE,
      member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(request_id, member_id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS utility_landing_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_key TEXT NOT NULL UNIQUE,
      content_value TEXT,
      content_image TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`INSERT OR IGNORE INTO utility_landing_content (content_key, content_value, content_image) VALUES (?, ?, ?)`,
      ['welcome_title', 'Selamat Datang di Sistem Utility', null]);
    db.run(`INSERT OR IGNORE INTO utility_landing_content (content_key, content_value, content_image) VALUES (?, ?, ?)`,
      ['welcome_subtitle', 'Pengajuan Bantuan & Tracking Pekerjaan Utility', null]);
    db.run(`INSERT OR IGNORE INTO utility_landing_content (content_key, content_value, content_image) VALUES (?, ?, ?)`,
      ['welcome_description', 'Sistem ini memudahkan Anda untuk mengajukan bantuan terkait utility (air, listrik, gas, HVAC) dan memantau progress pengerjaannya secara realtime.', null]);
    db.run(`INSERT OR IGNORE INTO utility_landing_content (content_key, content_value, content_image) VALUES (?, ?, ?)`,
      ['welcome_image', null, '/uploads/photos/default-utility.jpg']);
    db.run(`INSERT OR IGNORE INTO utility_landing_content (content_key, content_value, content_image) VALUES (?, ?, ?)`,
      ['btn_submit_text', 'Input Pengajuan', null]);
    db.run(`INSERT OR IGNORE INTO utility_landing_content (content_key, content_value, content_image) VALUES (?, ?, ?)`,
      ['btn_tracking_text', 'Tracking Pengajuan', null]);
    saveDb();
  } catch (err) {
    console.error('Migration utility_requests error:', err);
  }
}

function migrateChecklistEntriesPhoto() {
  try {
    db.run("ALTER TABLE checklist_entries ADD COLUMN photo_url TEXT");
    saveDb();
  } catch (e) {
    // kolom sudah ada, skip
  }
}

// Helper: run query that returns rows
function dbAll(sql, params = []) {
  const d = db.exec(sql, params);
  if (d.length === 0) return [];
  const columns = d[0].columns;
  return d[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

// Helper: run query that returns first row
function dbGet(sql, params = []) {
  const rows = dbAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: run statement
function dbRun(sql, params = []) {
  db.run(sql, params);
  const lastID = db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0];
  saveDb();
  return { lastID };
}

module.exports = { getDb, saveDb, dbAll, dbGet, dbRun };
