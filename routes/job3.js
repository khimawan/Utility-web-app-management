const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

function getDateSubdir() {
  const d = new Date();
  return d.getFullYear() + '/' +
    String(d.getMonth() + 1).padStart(2, '0') + '/' +
    String(d.getDate()).padStart(2, '0');
}

function getChecklistDest(req) {
  const cat = req.params.category || 'general';
  return path.join(__dirname, '..', 'public', 'uploads', 'checklist', cat, getDateSubdir());
}

const checklistStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = getChecklistDest(req);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'checklist-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadChecklist = multer({
  storage: checklistStorage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Hanya file JPG, JPEG, dan PNG yang diizinkan'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const workStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'public', 'uploads', 'works', getDateSubdir());
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'work-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadWork = multer({
  storage: workStorage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|mp4|webm|quicktime/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Hanya file JPG, JPEG, PNG, MP4, atau WebM yang diizinkan'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

const job3Categories = ['pemakaian_air', 'pemakaian_gas', 'suhu_trafo', 'listrik_trafo', 'energi_listrik'];

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const description = dbAll("SELECT * FROM job_descriptions WHERE job_type = 'facility'");
    const machines = dbAll("SELECT * FROM machines WHERE job_type = 'facility'");
    const works = dbAll(`
      SELECT w.*, GROUP_CONCAT(u.name, ', ') as member_names
      FROM works w
      LEFT JOIN work_members wm ON w.id = wm.work_id
      LEFT JOIN users u ON wm.member_id = u.id
      GROUP BY w.id
      ORDER BY CASE WHEN w.repair_percentage >= 100 THEN 1 ELSE 0 END, w.work_date DESC LIMIT 10
    `);
    res.render('pages/job3/index', { description, machines, works });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist/:category', isAuthenticated, async (req, res) => {
  try {
    const { category } = req.params;
    if (!job3Categories.includes(category)) return res.status(404).send('Not Found');
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
      pemakaian_air: 'Checklist Pemakaian Air Sumur', pemakaian_gas: 'Checklist Pemakaian Gas',
      suhu_trafo: 'Checklist Suhu Trafo', energi_listrik: 'Checklist Energi Listrik'
    };
    res.render('pages/job3/checklist', { category, categoryName: categoryNames[category], templates, entries, members });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/checklist/:category', isAuthenticated, uploadChecklist.single('foto_dokumentasi'), async (req, res) => {
  try {
    const { category } = req.params;
    const { entry_date, shift, notes, templates, values, machine_id } = req.body;
    const fotoUrl = req.file ? '/uploads/checklist/' + category + '/' + getDateSubdir() + '/' + req.file.filename : null;
    let finalEntryDate = entry_date;
    if ((category === 'pemakaian_air' || category === 'energi_listrik' || category === 'pemakaian_gas' || category === 'suhu_trafo') && !entry_date) {
      const tplIdsArr = Array.isArray(templates) ? templates : (templates ? [templates] : []);
      const valsArr = Array.isArray(values) ? values : (values ? [values] : []);
      for (let i = 0; i < tplIdsArr.length; i++) {
        const tpl = dbGet('SELECT * FROM checklist_templates WHERE id = ?', [parseInt(tplIdsArr[i])]);
        if (tpl && tpl.parameter_type === 'date' && valsArr[i]) {
          finalEntryDate = valsArr[i];
          break;
        }
      }
    }
    if (!finalEntryDate) finalEntryDate = new Date().toISOString().slice(0, 10);
    const entry = dbRun(
      `INSERT INTO checklist_entries (category, entry_date, shift, machine_id, input_by, notes, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category, finalEntryDate, shift, machine_id || null, req.session.user.id, notes || '', fotoUrl]
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
      [entryId, req.session.user.id, shift, req.session.user.job, `Checklist ${category} submitted`, finalEntryDate]
    );
    res.redirect(`/job3/checklist/${category}`);
  } catch (err) {
    console.error('POST /job3/checklist/:category error:', err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/checklist/entry/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const entry = dbGet('SELECT category FROM checklist_entries WHERE id = ?', [parseInt(req.params.id)]);
    dbRun('DELETE FROM checklist_values WHERE entry_id = ?', [parseInt(req.params.id)]);
    dbRun('DELETE FROM checklist_entries WHERE id = ?', [parseInt(req.params.id)]);
    const category = entry ? entry.category : 'pemakaian_air';
    res.redirect(`/job3/checklist/${category}`);
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
      ORDER BY CASE WHEN w.repair_percentage >= 100 THEN 1 ELSE 0 END, w.work_date DESC
    `);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    res.render('pages/job3/works', { works, members });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/works', isAuthenticated, uploadWork.single('photo'), async (req, res) => {
  try {
    const { work_date, area, description, repair_notes, repair_percentage, member_ids } = req.body;
    const photo_url = req.file ? '/uploads/works/' + getDateSubdir() + '/' + req.file.filename : null;
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
    res.redirect('/job3/works');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/works/:id', isAuthenticated, uploadWork.single('photo'), async (req, res) => {
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
      photo_url = '/uploads/works/' + getDateSubdir() + '/' + req.file.filename;
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
    res.redirect('/job3/works');
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
    res.redirect('/job3/works');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
