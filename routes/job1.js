const express = require('express');
const router = express.Router();
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

const job1Categories = ['wtp', 'boiler', 'kompressor01', 'kompressor02'];

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
    res.redirect(`/job1/checklist/${category}`);
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
    const category = entry ? entry.category : 'wtp';
    res.redirect(`/job1/checklist/${category}`);
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
      ORDER BY w.warning_date DESC
    `);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    res.render('pages/job1/warning', { warnings, members, machines });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/warning', isAuthenticated, async (req, res) => {
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
