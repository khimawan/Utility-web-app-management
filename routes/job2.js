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

const job2Categories = ['kompressor03', 'kompressor04', 'lvmdp', 'air_tandon'];

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const description = dbAll("SELECT * FROM job_descriptions WHERE job_type = 'operator_n2'");
    const machines = dbAll("SELECT * FROM machines WHERE job_type = 'operator_n2'");
    const warnings = dbAll(`
      SELECT w.*, GROUP_CONCAT(u.name, ', ') as member_names
      FROM warnings w
      LEFT JOIN warning_members wm ON w.id = wm.warning_id
      LEFT JOIN users u ON wm.member_id = u.id
      WHERE w.machine_name IN ('n2_generator', 'kompressor03', 'kompressor04')
      GROUP BY w.id
      ORDER BY w.warning_date DESC LIMIT 10
    `);
    const instructions = dbAll("SELECT * FROM working_instructions WHERE job_type = 'operator_n2' ORDER BY created_at DESC");
    res.render('pages/job2/index', { description, machines, warnings, instructions });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist/n2_generator', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const entries = dbAll(`
      SELECT cn.*, u.name as member_name
      FROM checklist_n2 cn
      LEFT JOIN users u ON cn.member_id = u.id
      ORDER BY cn.created_at DESC
      LIMIT 50
    `);
    res.render('pages/job2/checklist-n2', { user, entries });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/checklist/n2_generator', isAuthenticated, upload.single('foto_dokumentasi'), async (req, res) => {
  try {
    const user = req.session.user;
    const b = req.body;
    const fotoUrl = req.file ? '/uploads/checklist/' + getDateSubdir() + '/' + req.file.filename : null;
    dbRun(
      `INSERT INTO checklist_n2 (
        member_id, shift, jam_monitoring, tanggal_monitoring, jenis_kegiatan,
        status_operasional, pilih_mesin,
        temperature_area, running_hour, pressure, temperature_mesin,
        freq_min, freq_max, power_min, power_max,
        drayer_temp_high, drayer_temp_low,
        purify_percent, purify_flow,
        gas_compressor, gas_drayer, gas_absorption_a, gas_absorption_b, gas_nitrogen, gas_filter,
        change_air_filter_6, change_oil_filter_6, change_oil_water_sep_6,
        change_air_filter_t_12, change_air_filter_a_12, change_air_filter_x_12,
        check_electromagnetic, foto_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id, b.shift, b.jam_monitoring, b.tanggal_monitoring, b.jenis_kegiatan,
        b.status_operasional || null, b.pilih_mesin || null,
        b.temperature_area || null, b.running_hour || null, b.pressure || null, b.temperature_mesin || null,
        b.freq_min || null, b.freq_max || null, b.power_min || null, b.power_max || null,
        b.drayer_temp_high || null, b.drayer_temp_low || null,
        b.purify_percent || null, b.purify_flow || null,
        b.gas_compressor || null, b.gas_drayer || null, b.gas_absorption_a || null,
        b.gas_absorption_b || null, b.gas_nitrogen || null, b.gas_filter || null,
        b.change_air_filter_6 || null, b.change_oil_filter_6 || null, b.change_oil_water_sep_6 || null,
        b.change_air_filter_t_12 || null, b.change_air_filter_a_12 || null, b.change_air_filter_x_12 || null,
        b.check_electromagnetic || null, fotoUrl
      ]
    );
    dbRun(
      `INSERT INTO activity_logs (activity_type, reference_id, reference_table, member_id, shift, job, description, activity_date)
       VALUES ('checklist_submit', ?, 'checklist_n2', ?, ?, ?, ?, ?)`,
      [dbGet('SELECT last_insert_rowid() as id').id, user.id, b.shift, user.job, 'Checklist N2 Generator submitted', b.tanggal_monitoring]
    );
    res.redirect('/job2/checklist/n2_generator');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist/n2_generator/:id/delete', isAuthenticated, async (req, res) => {
  try {
    dbRun('DELETE FROM checklist_n2 WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/job2/checklist/n2_generator');
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
    res.render('pages/job1/checklist-kompressor-form', { user, entries, backUrl: '/job2', formAction: '/job2/checklist/kompressor', deletePrefix: '/job2' });
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
    res.redirect('/job2/checklist/kompressor');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist/kompressor/:id/delete', isAuthenticated, async (req, res) => {
  try {
    dbRun('DELETE FROM checklist_kompressor WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/job2/checklist/kompressor');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist/:category', isAuthenticated, async (req, res) => {
  try {
    const { category } = req.params;
    if (!job2Categories.includes(category)) return res.status(404).send('Not Found');
    const templates = dbAll('SELECT * FROM checklist_templates WHERE category = ? AND is_active = 1 ORDER BY sort_order', [category]);
    const entries = dbAll(`
      SELECT ce.*, u.name as input_by_name, pu.name as pic_name
      FROM checklist_entries ce
      LEFT JOIN users u ON ce.input_by = u.id
      LEFT JOIN users pu ON ce.machine_id = pu.id
      WHERE ce.category = ?
      ORDER BY ce.entry_date DESC, ce.shift
      LIMIT 50
    `, [category]);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    const categoryNames = {
      n2_generator: 'Checklist N2 Generator', kompressor03: 'Checklist Kompressor 03',
      kompressor04: 'Checklist Kompressor 04', lvmdp: 'Checklist LVMDP', air_tandon: 'Checklist Air Tandon'
    };
    res.render('pages/job2/checklist', { category, categoryName: categoryNames[category], templates, entries, members });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/checklist/:category', isAuthenticated, async (req, res) => {
  try {
    const { category } = req.params;
    const { entry_date, shift, notes, templates, values, machine_id } = req.body;
    let finalEntryDate = entry_date;
    if (category === 'lvmdp' && !entry_date) {
      const tplIds = Array.isArray(templates) ? templates : (templates ? [templates] : []);
      const vals = Array.isArray(values) ? values : (values ? [values] : []);
      for (let i = 0; i < tplIds.length; i++) {
        const tpl = dbGet('SELECT * FROM checklist_templates WHERE id = ?', [parseInt(tplIds[i])]);
        if (tpl && tpl.parameter_type === 'date' && vals[i]) {
          finalEntryDate = vals[i];
          break;
        }
      }
    }
    if (!finalEntryDate) finalEntryDate = new Date().toISOString().slice(0, 10);
    const entry = dbRun(
      `INSERT INTO checklist_entries (category, entry_date, shift, machine_id, input_by, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [category, finalEntryDate, shift, machine_id || null, req.session.user.id, notes || '']
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
    if (category === 'kompressor03' || category === 'kompressor04') {
      res.redirect('/job2/checklist/kompressor');
    } else {
      res.redirect(`/job2/checklist/${category}`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/checklist/entry/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const entry = dbGet('SELECT category FROM checklist_entries WHERE id = ?', [parseInt(req.params.id)]);
    dbRun('DELETE FROM checklist_values WHERE entry_id = ?', [parseInt(req.params.id)]);
    dbRun('DELETE FROM checklist_entries WHERE id = ?', [parseInt(req.params.id)]);
    const category = entry ? entry.category : 'n2_generator';
    if (category === 'kompressor03' || category === 'kompressor04') {
      res.redirect('/job2/checklist/kompressor');
    } else {
      res.redirect(`/job2/checklist/${category}`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/warning', isAuthenticated, async (req, res) => {
  try {
    const machines = ['n2_generator', 'kompressor03', 'kompressor04'];
    const warnings = dbAll(`
      SELECT w.*, GROUP_CONCAT(u.name, ', ') as member_names
      FROM warnings w
      LEFT JOIN warning_members wm ON w.id = wm.warning_id
      LEFT JOIN users u ON wm.member_id = u.id
      WHERE w.machine_name IN ('n2_generator', 'kompressor03', 'kompressor04')
      GROUP BY w.id
      ORDER BY CASE WHEN w.repair_percentage >= 100 THEN 1 ELSE 0 END, w.warning_date DESC
    `);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    res.render('pages/job2/warning', { warnings, members, machines });
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
    res.redirect('/job2/warning');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/instructions', isAuthenticated, async (req, res) => {
  try {
    const instructions = dbAll("SELECT * FROM working_instructions WHERE job_type = 'operator_n2' ORDER BY created_at DESC");
    res.render('pages/job2/instructions', { instructions });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
