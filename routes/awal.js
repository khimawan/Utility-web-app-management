const express = require('express');
const router = express.Router();
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

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

router.get('/warnings', isAuthenticated, async (req, res) => {
  try {
    const warnings = dbAll(`
      SELECT w.*, GROUP_CONCAT(u.name, ', ') as member_names
      FROM warnings w
      LEFT JOIN warning_members wm ON w.id = wm.warning_id
      LEFT JOIN users u ON wm.member_id = u.id
      GROUP BY w.id
      ORDER BY w.warning_date DESC, w.created_at DESC
    `);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    res.render('pages/awal/warnings', { warnings, members });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/warnings', isAuthenticated, async (req, res) => {
  try {
    const { warning_date, machine_name, description, repair_notes, repair_percentage, member_ids } = req.body;
    const result = dbRun(
      `INSERT INTO warnings (warning_date, machine_name, description, repair_notes, repair_percentage, input_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [warning_date, machine_name, description, repair_notes || '', repair_percentage || 0, req.session.user.id]
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

router.post('/warnings/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { warning_date, machine_name, description, repair_notes, repair_percentage, member_ids } = req.body;
    dbRun(
      `UPDATE warnings SET warning_date=?, machine_name=?, description=?, repair_notes=?, repair_percentage=? WHERE id=?`,
      [warning_date, machine_name, description, repair_notes, repair_percentage, id]
    );
    dbRun('DELETE FROM warning_members WHERE warning_id = ?', [id]);
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
    dbRun('DELETE FROM warnings WHERE id = ?', [req.params.id]);
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
      ORDER BY w.work_date DESC, w.created_at DESC
    `);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    res.render('pages/awal/works', { works, members });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/works', isAuthenticated, async (req, res) => {
  try {
    const { work_date, area, description, repair_notes, repair_percentage, member_ids } = req.body;
    const result = dbRun(
      `INSERT INTO works (work_date, area, description, repair_notes, repair_percentage, input_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [work_date, area, description, repair_notes || '', repair_percentage || 0, req.session.user.id]
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

router.post('/works/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { work_date, area, description, repair_notes, repair_percentage, member_ids } = req.body;
    dbRun(
      `UPDATE works SET work_date=?, area=?, description=?, repair_notes=?, repair_percentage=? WHERE id=?`,
      [work_date, area, description, repair_notes, repair_percentage, id]
    );
    dbRun('DELETE FROM work_members WHERE work_id = ?', [id]);
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
    dbRun('DELETE FROM works WHERE id = ?', [req.params.id]);
    res.redirect('/awal/works');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
