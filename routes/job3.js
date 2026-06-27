const express = require('express');
const router = express.Router();
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

const job3Categories = ['pemakaian_air', 'pemakaian_gas', 'suhu_trafo', 'listrik_trafo'];

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
      ORDER BY w.work_date DESC LIMIT 10
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
      SELECT ce.*, u.name as input_by_name
      FROM checklist_entries ce
      LEFT JOIN users u ON ce.input_by = u.id
      WHERE ce.category = ?
      ORDER BY ce.entry_date DESC, ce.shift
      LIMIT 50
    `, [category]);
    const categoryNames = {
      pemakaian_air: 'Checklist Pemakaian Air', pemakaian_gas: 'Checklist Pemakaian Gas',
      suhu_trafo: 'Checklist Suhu Trafo', listrik_trafo: 'Checklist Listrik Trafo'
    };
    res.render('pages/job3/checklist', { category, categoryName: categoryNames[category], templates, entries });
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
    res.redirect(`/job3/checklist/${category}`);
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
      ORDER BY w.work_date DESC
    `);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    res.render('pages/job3/works', { works, members });
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
    res.redirect('/job3/works');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/works/:id/delete', isAuthenticated, async (req, res) => {
  try {
    dbRun('DELETE FROM works WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/job3/works');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
