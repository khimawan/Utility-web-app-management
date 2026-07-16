const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

function getDateSubdir() {
  const d = new Date();
  return d.getFullYear() + '/' +
    String(d.getMonth() + 1).padStart(2, '0') + '/' +
    String(d.getDate()).padStart(2, '0');
}

function ensureChecklistDir(cb) {
  const dir = path.join(__dirname, '..', 'public', 'uploads', 'checklist', getDateSubdir());
  fs.mkdirSync(dir, { recursive: true });
  cb(null, dir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) { ensureChecklistDir(cb); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'checklist-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Hanya file JPG, JPEG, dan PNG yang diizinkan'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

function ensureWorksDir(cb) {
  const dir = path.join(__dirname, '..', 'public', 'uploads', 'works', getDateSubdir());
  fs.mkdirSync(dir, { recursive: true });
  cb(null, dir);
}

const warningStorage = multer.diskStorage({
  destination: function (req, file, cb) { ensureWorksDir(cb); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'warning-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadWarning = multer({
  storage: warningStorage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|mp4|webm|quicktime/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Hanya file JPG, JPEG, PNG, MP4, atau WebM yang diizinkan'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

const job1Categories = ['kompressor01', 'kompressor02'];

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const description = dbAll("SELECT * FROM job_descriptions WHERE job_type = 'operator_wtp'");
    const machines = dbAll("SELECT * FROM machines WHERE job_type = 'operator_wtp'");
    const warnings = dbAll(`
      SELECT w.*, GROUP_CONCAT(u.name, ', ') as member_names
      FROM warnings w
      LEFT JOIN warning_members wm ON w.id = wm.warning_id
      LEFT JOIN users u ON wm.member_id = u.id
      WHERE w.machine_name IN ('wtp', 'boiler', 'kompressor01', 'kompressor02')
      GROUP BY w.id
      ORDER BY w.warning_date DESC LIMIT 10
    `);
    const instructions = dbAll("SELECT * FROM working_instructions WHERE job_type = 'operator_wtp' ORDER BY created_at DESC");
    res.render('pages/job1/index', { description, machines, warnings, instructions });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist/wtp', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const entries = dbAll(`
      SELECT cw.*, u.name as member_name
      FROM checklist_wtp cw
      LEFT JOIN users u ON cw.member_id = u.id
      ORDER BY cw.created_at DESC
      LIMIT 50
    `);
    res.render('pages/job1/checklist-wtp', { user, entries });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/checklist/wtp', isAuthenticated, upload.single('foto_dokumentasi'), async (req, res) => {
  try {
    const user = req.session.user;
    const b = req.body;
    const fotoUrl = req.file ? '/uploads/checklist/' + getDateSubdir() + '/' + req.file.filename : null;
    dbRun(
      `INSERT INTO checklist_wtp (
        member_id, shift, jam_monitoring, tanggal_monitoring, jenis_kegiatan,
        status_operasional,
        pompa_gd4_arus, pompa_gd4_temp,
        pompa_booster_arus, pompa_booster_temp,
        motor_hpp_arus, motor_hpp_temp,
        motor_gd7_arus, motor_gd7_temp,
        premate_membran_ro, reject_membran_ro,
        mmf_inlet_pressure, catridge_pressure, membran_pressure,
        nilai_tds, nilai_conductivity, chemical_wtp,
        level_tandon_ro1, level_tandon_ro2, level_tandon_ro_gd4,
        backwash_mmf, backwash_sebelum, backwash_sesudah,
        regenerasi_softener, status_mesin_uv,
        penggantian_membran_ro, penggantian_membran_ro_comment,
        penggantian_media_softener, penggantian_media_softener_comment,
        penggantian_media_carbon, penggantian_media_carbon_comment,
        penggantian_media_mn_zeloit, penggantian_media_mn_zeloit_comment,
        penggantian_catridge_filter, penggantian_catridge_filter_comment,
        foto_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id, b.shift, b.jam_monitoring, b.tanggal_monitoring, b.jenis_kegiatan,
        b.status_operasional || null,
        b.pompa_gd4_arus || null, b.pompa_gd4_temp || null,
        b.pompa_booster_arus || null, b.pompa_booster_temp || null,
        b.motor_hpp_arus || null, b.motor_hpp_temp || null,
        b.motor_gd7_arus || null, b.motor_gd7_temp || null,
        b.premate_membran_ro || null, b.reject_membran_ro || null,
        b.mmf_inlet_pressure || null, b.catridge_pressure || null, b.membran_pressure || null,
        b.nilai_tds || null, b.nilai_conductivity || null, b.chemical_wtp || null,
        b.level_tandon_ro1 || null, b.level_tandon_ro2 || null, b.level_tandon_ro_gd4 || null,
        b.backwash_mmf || null, b.backwash_sebelum || null, b.backwash_sesudah || null,
        b.regenerasi_softener || null, b.status_mesin_uv || null,
        b.penggantian_membran_ro || null, b.penggantian_membran_ro_comment || null,
        b.penggantian_media_softener || null, b.penggantian_media_softener_comment || null,
        b.penggantian_media_carbon || null, b.penggantian_media_carbon_comment || null,
        b.penggantian_media_mn_zeloit || null, b.penggantian_media_mn_zeloit_comment || null,
        b.penggantian_catridge_filter || null, b.penggantian_catridge_filter_comment || null,
        fotoUrl
      ]
    );
    dbRun(
      `INSERT INTO activity_logs (activity_type, reference_id, reference_table, member_id, shift, job, description, activity_date)
       VALUES ('checklist_submit', ?, 'checklist_wtp', ?, ?, ?, ?, ?)`,
      [dbGet('SELECT last_insert_rowid() as id').id, user.id, b.shift, user.job, 'Checklist WTP submitted', b.tanggal_monitoring]
    );
    res.redirect('/job1/checklist/wtp');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist/wtp/:id/delete', isAuthenticated, async (req, res) => {
  try {
    dbRun('DELETE FROM checklist_wtp WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/job1/checklist/wtp');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist/boiler', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const entries = dbAll(`
      SELECT cb.*, u.name as member_name
      FROM checklist_boiler cb
      LEFT JOIN users u ON cb.member_id = u.id
      ORDER BY cb.created_at DESC
      LIMIT 50
    `);
    res.render('pages/job1/checklist-boiler', { user, entries });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/checklist/boiler', isAuthenticated, upload.single('preventive_foto'), async (req, res) => {
  try {
    const user = req.session.user;
    const b = req.body;
    const fotoUrl = req.file ? '/uploads/checklist/' + getDateSubdir() + '/' + req.file.filename : null;
    dbRun(
      `INSERT INTO checklist_boiler (
        member_id, shift, jam_monitoring, tanggal_monitoring, jenis_kegiatan,
        status_operasional, boiler_capacity, steam_pressure, flue_gas_temp,
        feed_water_temp, scale_monitor_temp, pressure_gas, pressure_header,
        garam_softener, chemical_boiler, blowdown, cleaning_strainer,
        preventive_maintener, preventive_aktivitas, preventive_deskripsi, preventive_foto_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id, b.shift, b.jam_monitoring, b.tanggal_monitoring, b.jenis_kegiatan,
        b.status_operasional || null, b.boiler_capacity || null,
        b.steam_pressure || null, b.flue_gas_temp || null,
        b.feed_water_temp || null, b.scale_monitor_temp || null,
        b.pressure_gas || null, b.pressure_header || null,
        b.garam_softener || null, b.chemical_boiler || null,
        b.blowdown || null, b.cleaning_strainer || null,
        b.preventive_maintener || null, b.preventive_aktivitas || null,
        b.preventive_deskripsi || null, fotoUrl
      ]
    );
    dbRun(
      `INSERT INTO activity_logs (activity_type, reference_id, reference_table, member_id, shift, job, description, activity_date)
       VALUES ('checklist_submit', ?, 'checklist_boiler', ?, ?, ?, ?, ?)`,
      [dbGet('SELECT last_insert_rowid() as id').id, user.id, b.shift, user.job, 'Checklist Boiler submitted', b.tanggal_monitoring]
    );
    res.redirect('/job1/checklist/boiler');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist/boiler/:id/delete', isAuthenticated, async (req, res) => {
  try {
    dbRun('DELETE FROM checklist_boiler WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/job1/checklist/boiler');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist/kompressor', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const entries = dbAll(`
      SELECT ck.*, u.name as member_name
      FROM checklist_kompressor ck
      LEFT JOIN users u ON ck.member_id = u.id
      ORDER BY ck.created_at DESC
      LIMIT 50
    `);
    res.render('pages/job1/checklist-kompressor-form', { user, entries, backUrl: '/job1', formAction: '/job1/checklist/kompressor', deletePrefix: '/job1' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/checklist/kompressor', isAuthenticated, upload.single('foto_dokumentasi'), async (req, res) => {
  try {
    const user = req.session.user;
    const b = req.body;
    const fotoUrl = req.file ? '/uploads/checklist/' + getDateSubdir() + '/' + req.file.filename : null;
    dbRun(
      `INSERT INTO checklist_kompressor (
        member_id, shift, jam_monitoring, tanggal_monitoring, jenis_kegiatan,
        status_operasional, air_compressor, mode, running_hour,
        system_pressure, flow_rate, motor_temperature, oil_temperature,
        bunyi_abnormal, kebocoran_oli, drayer_status, drayer_humidity_temp,
        change_filter_mat, oil_change, change_oil_filter, change_air_filter,
        change_belt_coupling, change_oil_separator, check_ecodrain,
        bearing_lube_drive, change_bearing, check_electrical, bearing_lube,
        check_valve, foto_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id, b.shift, b.jam_monitoring, b.tanggal_monitoring, b.jenis_kegiatan,
        b.status_operasional || null, b.air_compressor || null, b.mode || null,
        b.running_hour || null, b.system_pressure || null, b.flow_rate || null,
        b.motor_temperature || null, b.oil_temperature || null,
        b.bunyi_abnormal || null, b.kebocoran_oli || null,
        b.drayer_status || null, b.drayer_humidity_temp || null,
        b.change_filter_mat || null, b.oil_change || null, b.change_oil_filter || null,
        b.change_air_filter || null, b.change_belt_coupling || null,
        b.change_oil_separator || null, b.check_ecodrain || null,
        b.bearing_lube_drive || null, b.change_bearing || null,
        b.check_electrical || null, b.bearing_lube || null,
        b.check_valve || null, fotoUrl
      ]
    );
    dbRun(
      `INSERT INTO activity_logs (activity_type, reference_id, reference_table, member_id, shift, job, description, activity_date)
       VALUES ('checklist_submit', ?, 'checklist_kompressor', ?, ?, ?, ?, ?)`,
      [dbGet('SELECT last_insert_rowid() as id').id, user.id, b.shift, user.job, 'Checklist Kompressor submitted', b.tanggal_monitoring]
    );
    res.redirect('/job1/checklist/kompressor');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist/kompressor/:id/delete', isAuthenticated, async (req, res) => {
  try {
    dbRun('DELETE FROM checklist_kompressor WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/job1/checklist/kompressor');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist/:category', isAuthenticated, async (req, res) => {
  try {
    const { category } = req.params;
    if (!job1Categories.includes(category)) return res.status(404).send('Not Found');
    const templates = dbAll('SELECT * FROM checklist_templates WHERE category = ? AND is_active = 1 ORDER BY sort_order', [category]);
    const entries = dbAll(`
      SELECT ce.*, u.name as input_by_name
      FROM checklist_entries ce
      LEFT JOIN users u ON ce.input_by = u.id
      WHERE ce.category = ?
      ORDER BY ce.entry_date DESC, ce.shift
      LIMIT 50
    `, [category]);
    const categoryNames = {
      wtp: 'Checklist WTP', boiler: 'Checklist Boiler',
      kompressor01: 'Checklist Kompressor 01', kompressor02: 'Checklist Kompressor 02'
    };
    res.render('pages/job1/checklist', { category, categoryName: categoryNames[category], templates, entries });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/checklist/:category', isAuthenticated, async (req, res) => {
  try {
    const { category } = req.params;
    const { entry_date, shift, notes, templates, values } = req.body;
    const entry = dbRun(
      `INSERT INTO checklist_entries (category, entry_date, shift, input_by, notes) VALUES (?, ?, ?, ?, ?)`,
      [category, entry_date, shift, req.session.user.id, notes || '']
    );
    const entryId = entry.lastID;
    const tplIds = Array.isArray(templates) ? templates : (templates ? [templates] : []);
    const vals = Array.isArray(values) ? values : (values ? [values] : []);
    for (let i = 0; i < tplIds.length; i++) {
      dbRun('INSERT INTO checklist_values (entry_id, template_id, parameter_value) VALUES (?, ?, ?)',
        [entryId, parseInt(tplIds[i]), vals[i] || '']);
    }
    dbRun(
      `INSERT INTO activity_logs (activity_type, reference_id, reference_table, member_id, shift, job, description, activity_date)
       VALUES ('checklist_submit', ?, 'checklist_entries', ?, ?, ?, ?, ?)`,
      [entryId, req.session.user.id, shift, req.session.user.job, `Checklist ${category} submitted`, entry_date]
    );
    if (category === 'kompressor01' || category === 'kompressor02') {
      res.redirect('/job1/checklist/kompressor');
    } else {
      res.redirect(`/job1/checklist/${category}`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

function deleteChecklistEntry(id) {
  dbRun('DELETE FROM checklist_values WHERE entry_id = ?', [parseInt(id)]);
  dbRun('DELETE FROM checklist_entries WHERE id = ?', [parseInt(id)]);
}

router.get('/checklist/entry/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const entry = dbGet('SELECT category FROM checklist_entries WHERE id = ?', [parseInt(req.params.id)]);
    deleteChecklistEntry(req.params.id);
    const category = entry ? entry.category : 'wtp';
    if (category === 'kompressor01' || category === 'kompressor02') {
      res.redirect('/job1/checklist/kompressor');
    } else {
      res.redirect(`/job1/checklist/${category}`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/checklist/entry/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const entry = dbGet('SELECT category FROM checklist_entries WHERE id = ?', [parseInt(req.params.id)]);
    deleteChecklistEntry(req.params.id);
    const category = entry ? entry.category : 'wtp';
    if (category === 'kompressor01' || category === 'kompressor02') {
      res.redirect('/job1/checklist/kompressor');
    } else {
      res.redirect(`/job1/checklist/${category}`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/warning', isAuthenticated, async (req, res) => {
  try {
    const machines = ['wtp', 'boiler', 'kompressor01', 'kompressor02'];
    const warnings = dbAll(`
      SELECT w.*, GROUP_CONCAT(u.name, ', ') as member_names
      FROM warnings w
      LEFT JOIN warning_members wm ON w.id = wm.warning_id
      LEFT JOIN users u ON wm.member_id = u.id
      WHERE w.machine_name IN ('wtp', 'boiler', 'kompressor01', 'kompressor02')
      GROUP BY w.id
      ORDER BY CASE WHEN w.repair_percentage >= 100 THEN 1 ELSE 0 END, w.warning_date DESC
    `);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    res.render('pages/job1/warning', { warnings, members, machines });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/warning', isAuthenticated, uploadWarning.single('photo'), async (req, res) => {
  try {
    const { warning_date, machine_name, description, repair_notes, repair_percentage, member_ids } = req.body;
    const photo_url = req.file ? '/uploads/works/' + getDateSubdir() + '/' + req.file.filename : null;
    const result = dbRun(
      `INSERT INTO warnings (warning_date, machine_name, description, repair_notes, repair_percentage, photo_url, input_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [warning_date, machine_name, description, repair_notes || '', repair_percentage || 0, photo_url, req.session.user.id]
    );
    const warningId = result.lastID;
    const ids = Array.isArray(member_ids) ? member_ids : (member_ids ? [member_ids] : []);
    ids.forEach(mid => {
      dbRun('INSERT INTO warning_members (warning_id, member_id) VALUES (?, ?)', [warningId, parseInt(mid)]);
    });
    res.redirect('/job1/warning');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/instructions', isAuthenticated, async (req, res) => {
  try {
    const instructions = dbAll("SELECT * FROM working_instructions WHERE job_type = 'operator_wtp' ORDER BY created_at DESC");
    res.render('pages/job1/instructions', { instructions });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
