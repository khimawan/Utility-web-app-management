const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'public', 'uploads', 'works');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'work-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|mp4|webm|quicktime/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Hanya file JPG, JPEG, PNG, MP4, atau WebM yang diizinkan'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

const utilityStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'public', 'uploads', 'utility_requests');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'utility-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadUtility = multer({
  storage: utilityStorage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|mp4|webm|quicktime/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Hanya file JPG, JPEG, PNG, MP4, atau WebM yang diizinkan'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'public', 'uploads', 'photos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|mp4|webm|quicktime/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Hanya file JPG, JPEG, PNG, MP4, atau WebM yang diizinkan'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const profile = dbAll('SELECT * FROM utility_profile ORDER BY sort_order');
    const photos = dbAll('SELECT * FROM gallery_photos ORDER BY created_at DESC');
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    res.render('pages/awal/index', { profile, photos, members });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/summary', isAuthenticated, async (req, res) => {
  try {
    const categories = [
      'wtp', 'boiler', 'kompressor01', 'kompressor02', 'kompressor03', 'kompressor04',
      'n2_generator', 'lvmdp', 'air_tandon', 'pemakaian_air', 'pemakaian_gas', 'suhu_trafo', 'energi_listrik'
    ];
    const templates = dbAll('SELECT * FROM checklist_templates WHERE is_active = 1 ORDER BY category, sort_order');
    res.render('pages/awal/summary', { categories, templates });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/api/summary-data', isAuthenticated, async (req, res) => {
  try {
    const { category, period } = req.query;
    let dateFilter = "date(ce.entry_date) >= date('now', '-7 days')";
    if (period === 'month') dateFilter = "date(ce.entry_date) >= date('now', '-1 month')";
    if (period === 'year') dateFilter = "date(ce.entry_date) >= date('now', '-1 year')";

    const result = dbAll(`
      SELECT ce.id, ce.entry_date, ce.shift, ct.parameter_name, ct.parameter_type, ct.unit,
             cv.parameter_value, cv.photo_url
      FROM checklist_entries ce
      JOIN checklist_values cv ON ce.id = cv.entry_id
      JOIN checklist_templates ct ON cv.template_id = ct.id
      WHERE ce.category = ? AND ${dateFilter}
      ORDER BY ce.entry_date, ce.shift
    `, [category]);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

const picCategories = ['pemakaian_air', 'energi_listrik', 'pemakaian_gas', 'suhu_trafo'];

router.get('/api/template-csv/:category', isAuthenticated, async (req, res) => {
  try {
    const { category } = req.params;
    const templates = dbAll('SELECT * FROM checklist_templates WHERE category = ? AND is_active = 1 ORDER BY sort_order', [category]);
    if (templates.length === 0) return res.status(404).send('Template tidak ditemukan');

    const hasPic = picCategories.includes(category);
    const header = ['Tanggal', 'Shift'];
    if (hasPic) header.push('PIC');
    templates.forEach(function(t) {
      let colName = t.parameter_name;
      header.push('"' + colName.replace(/"/g, '""') + '"');
    });

    const sampleRow = ['2025-01-15', '1'];
    if (hasPic) sampleRow.push('Nama PIC');
    templates.forEach(function(t) {
      sampleRow.push(t.parameter_type === 'number' ? '0' : '');
    });

    const csv = '\uFEFF' + header.join(',') + '\n' + sampleRow.join(',') + '\n';
    const blob = Buffer.from(csv, 'utf-8');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="template_' + category + '.csv"');
    res.send(blob);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/api/import-csv', isAuthenticated, async (req, res) => {
  try {
    const { category, csv_data } = req.body;
    const templates = dbAll('SELECT * FROM checklist_templates WHERE category = ? AND is_active = 1 ORDER BY sort_order', [category]);
    if (templates.length === 0) return res.status(400).json({ error: 'Template tidak ditemukan' });

    const hasPic = picCategories.includes(category);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    const lines = csv_data.split('\n').filter(function(l) { return l.trim(); });
    if (lines.length < 2) return res.status(400).json({ error: 'CSV kosong atau tidak ada data' });

    const headerLine = lines[0];
    const rows = lines.slice(1);
    let imported = 0;
    let errors = [];

    rows.forEach(function(line, idx) {
      try {
        const cols = parseCSVLine(line);
        const entryDate = cols[0] ? cols[0].trim() : '';
        const shift = cols[1] ? cols[1].trim() : '1';
        if (!entryDate) {
          errors.push('Baris ' + (idx + 2) + ': Tanggal kosong');
          return;
        }

        let picId = null;
        let valueStart = 2;
        if (hasPic) {
          const picName = cols[2] ? cols[2].trim() : '';
          valueStart = 3;
          const member = members.find(function(m) { return m.name.toLowerCase() === picName.toLowerCase(); });
          if (member) picId = member.id;
        }

        const entry = dbRun(
          `INSERT INTO checklist_entries (category, entry_date, shift, machine_id, input_by, notes) VALUES (?, ?, ?, ?, ?, ?)`,
          [category, entryDate, shift, picId, req.session.user.id, 'Imported from CSV']
        );
        const entryId = entry.lastID;

        for (let i = 0; i < templates.length; i++) {
          const val = cols[valueStart + i] ? cols[valueStart + i].trim() : '';
          dbRun('INSERT INTO checklist_values (entry_id, template_id, parameter_value) VALUES (?, ?, ?)',
            [entryId, templates[i].id, val]);
        }
        imported++;
      } catch (e) {
        errors.push('Baris ' + (idx + 2) + ': ' + e.message);
      }
    });

    res.json({ success: true, imported: imported, errors: errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

router.get('/warnings', isAuthenticated, async (req, res) => {
  try {
    const warnings = dbAll(`
      SELECT w.*, GROUP_CONCAT(u.name, ', ') as member_names
      FROM warnings w
      LEFT JOIN warning_members wm ON w.id = wm.warning_id
      LEFT JOIN users u ON wm.member_id = u.id
      GROUP BY w.id
      ORDER BY CASE WHEN w.repair_percentage >= 100 THEN 1 ELSE 0 END, w.warning_date DESC, w.created_at DESC
    `);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    res.render('pages/awal/warnings', { warnings, members });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/warnings', isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    const { warning_date, machine_name, description, repair_notes, repair_percentage, member_ids } = req.body;
    const photo_url = req.file ? '/uploads/works/' + req.file.filename : null;
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
    dbRun(
      `INSERT INTO activity_logs (activity_type, reference_id, reference_table, member_id, shift, job, description, activity_date)
       VALUES ('warning_input', ?, 'warnings', ?, ?, ?, ?, ?)`,
      [warningId, req.session.user.id, null, req.session.user.job, `Warning input: ${machine_name}`, warning_date]
    );
    res.redirect('/awal/warnings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/warnings/:id', isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { warning_date, machine_name, description, repair_notes, repair_percentage, member_ids, delete_photo } = req.body;
    const existing = dbGet('SELECT photo_url FROM warnings WHERE id = ?', [parseInt(id)]);
    let photo_url = existing ? existing.photo_url : null;

    if (delete_photo === '1' && photo_url) {
      const filePath = path.join(__dirname, '..', 'public', photo_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      photo_url = null;
    }

    if (req.file) {
      if (photo_url) {
        const oldPath = path.join(__dirname, '..', 'public', photo_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      photo_url = '/uploads/works/' + req.file.filename;
    }

    dbRun(
      `UPDATE warnings SET warning_date=?, machine_name=?, description=?, repair_notes=?, repair_percentage=?, photo_url=? WHERE id=?`,
      [warning_date, machine_name, description, repair_notes, repair_percentage, photo_url, parseInt(id)]
    );
    dbRun('DELETE FROM warning_members WHERE warning_id = ?', [parseInt(id)]);
    const ids = Array.isArray(member_ids) ? member_ids : (member_ids ? [member_ids] : []);
    ids.forEach(mid => {
      dbRun('INSERT INTO warning_members (warning_id, member_id) VALUES (?, ?)', [parseInt(id), parseInt(mid)]);
    });
    res.redirect('/awal/warnings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/warnings/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const existing = dbGet('SELECT photo_url FROM warnings WHERE id = ?', [parseInt(req.params.id)]);
    if (existing && existing.photo_url) {
      const filePath = path.join(__dirname, '..', 'public', existing.photo_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    dbRun('DELETE FROM warnings WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/awal/warnings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/works', isAuthenticated, async (req, res) => {
  try {
    const works = dbAll(`
      SELECT w.*, GROUP_CONCAT(u.name, ', ') as member_names
      FROM works w
      LEFT JOIN work_members wm ON w.id = wm.work_id
      LEFT JOIN users u ON wm.member_id = u.id
      GROUP BY w.id
      ORDER BY CASE WHEN w.repair_percentage >= 100 THEN 1 ELSE 0 END, w.work_date DESC, w.created_at DESC
    `);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    res.render('pages/awal/works', { works, members });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/works', isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    const { work_date, area, description, repair_notes, repair_percentage, member_ids } = req.body;
    const photo_url = req.file ? '/uploads/works/' + req.file.filename : null;
    const result = dbRun(
      `INSERT INTO works (work_date, area, description, repair_notes, repair_percentage, photo_url, input_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [work_date, area, description, repair_notes || '', repair_percentage || 0, photo_url, req.session.user.id]
    );
    const workId = result.lastID;
    const ids = Array.isArray(member_ids) ? member_ids : (member_ids ? [member_ids] : []);
    ids.forEach(mid => {
      dbRun('INSERT INTO work_members (work_id, member_id) VALUES (?, ?)', [workId, parseInt(mid)]);
    });
    res.redirect('/awal/works');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/works/:id', isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { work_date, area, description, repair_notes, repair_percentage, member_ids, delete_photo } = req.body;
    const existing = dbGet('SELECT photo_url FROM works WHERE id = ?', [parseInt(id)]);
    let photo_url = existing ? existing.photo_url : null;

    if (delete_photo === '1' && photo_url) {
      const filePath = path.join(__dirname, '..', 'public', photo_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      photo_url = null;
    }

    if (req.file) {
      if (photo_url) {
        const oldPath = path.join(__dirname, '..', 'public', photo_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      photo_url = '/uploads/works/' + req.file.filename;
    }

    dbRun(
      `UPDATE works SET work_date=?, area=?, description=?, repair_notes=?, repair_percentage=?, photo_url=? WHERE id=?`,
      [work_date, area, description, repair_notes || '', repair_percentage || 0, photo_url, parseInt(id)]
    );
    dbRun('DELETE FROM work_members WHERE work_id = ?', [parseInt(id)]);
    const ids = Array.isArray(member_ids) ? member_ids : (member_ids ? [member_ids] : []);
    ids.forEach(mid => {
      dbRun('INSERT INTO work_members (work_id, member_id) VALUES (?, ?)', [parseInt(id), parseInt(mid)]);
    });
    res.redirect('/awal/works');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/works/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const existing = dbGet('SELECT photo_url FROM works WHERE id = ?', [parseInt(req.params.id)]);
    if (existing && existing.photo_url) {
      const filePath = path.join(__dirname, '..', 'public', existing.photo_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    dbRun('DELETE FROM works WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/awal/works');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Utility Request Management (for logged-in members/admin)
router.get('/utility-requests', isAuthenticated, async (req, res) => {
  try {
    const requests = dbAll(`
      SELECT ur.*,
        GROUP_CONCAT(u.name, ', ') as member_names
      FROM utility_requests ur
      LEFT JOIN utility_request_members urm ON ur.id = urm.request_id
      LEFT JOIN users u ON urm.member_id = u.id
      GROUP BY ur.id
      ORDER BY CASE WHEN ur.repair_percentage >= 100 THEN 1 ELSE 0 END, ur.created_at DESC
    `);
    const open = requests.filter(function(r) { return r.status === 'open'; });
    const closed = requests.filter(function(r) { return r.status === 'closed'; });
    const outOfScope = requests.filter(function(r) { return r.status === 'diluar_scoope'; });
    const onHold = requests.filter(function(r) { return r.status === 'on_hold'; });
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    res.render('pages/awal/utility_requests', { open, closed, outOfScope, onHold, members });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/utility-requests/:id', isAuthenticated, uploadUtility.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, repair_notes, repair_percentage, member_ids, delete_photo } = req.body;
    const existing = dbGet('SELECT photo_url FROM utility_requests WHERE id = ?', [parseInt(id)]);
    let photo_url = existing ? existing.photo_url : null;

    let finalStatus = status;
    let finalPercentage = parseFloat(repair_percentage) || 0;

    if (finalStatus === 'closed') finalPercentage = 100;
    if (finalPercentage >= 100) finalStatus = 'closed';

    if (delete_photo === '1' && photo_url) {
      const filePath = path.join(__dirname, '..', 'public', photo_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      photo_url = null;
    }

    if (req.file) {
      if (photo_url) {
        const oldPath = path.join(__dirname, '..', 'public', photo_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      photo_url = '/uploads/utility_requests/' + req.file.filename;
    }

    dbRun(
      `UPDATE utility_requests SET status=?, repair_notes=?, repair_percentage=?, photo_url=?, updated_at=datetime('now') WHERE id=?`,
      [finalStatus, repair_notes || '', finalPercentage, photo_url, parseInt(id)]
    );
    dbRun('DELETE FROM utility_request_members WHERE request_id = ?', [parseInt(id)]);
    const ids = Array.isArray(member_ids) ? member_ids : (member_ids ? [member_ids] : []);
    ids.forEach(mid => {
      dbRun('INSERT INTO utility_request_members (request_id, member_id) VALUES (?, ?)', [parseInt(id), parseInt(mid)]);
    });

    // Log activity
    dbRun(
      `INSERT INTO activity_logs (activity_type, reference_id, reference_table, member_id, shift, job, description, activity_date)
       VALUES ('utility_request_update', ?, 'utility_requests', ?, ?, ?, ?, date('now'))`,
      [parseInt(id), req.session.user.id, null, req.session.user.job, `Status: ${finalStatus}, Progress: ${finalPercentage}%`]
    );

    res.redirect('/awal/utility-requests');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/utility-requests/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const existing = dbGet('SELECT photo_url FROM utility_requests WHERE id = ?', [parseInt(req.params.id)]);
    if (existing && existing.photo_url) {
      const filePath = path.join(__dirname, '..', 'public', existing.photo_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    dbRun('DELETE FROM utility_request_members WHERE request_id = ?', [parseInt(req.params.id)]);
    dbRun('DELETE FROM utility_requests WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/awal/utility-requests');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Admin landing page content management
router.get('/admin/landing-content', isAuthenticated, async (req, res) => {
  try {
    if (req.session.user.position !== 'admin') return res.status(403).send('Akses ditolak');
    const contents = dbAll('SELECT * FROM utility_landing_content');
    const content = {};
    contents.forEach(function(c) { content[c.content_key] = c; });
    res.render('pages/awal/admin_landing', { content });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/admin/landing-content', isAuthenticated, uploadPhoto.single('content_image'), async (req, res) => {
  try {
    if (req.session.user.position !== 'admin') return res.status(403).send('Akses ditolak');
    const keys = ['welcome_title', 'welcome_subtitle', 'welcome_description', 'btn_submit_text', 'btn_tracking_text'];
    keys.forEach(function(key) {
      const val = req.body[key];
      if (val !== undefined) {
        dbRun('UPDATE utility_landing_content SET content_value=?, updated_at=datetime(\'now\') WHERE content_key=?', [val, key]);
      }
    });
    if (req.file) {
      const imageUrl = '/uploads/photos/' + req.file.filename;
      dbRun('UPDATE utility_landing_content SET content_image=?, updated_at=datetime(\'now\') WHERE content_key=?', [imageUrl, 'welcome_image']);
    }
    res.redirect('/awal/admin/landing-content');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
