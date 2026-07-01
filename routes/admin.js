const express = require('express');
const router = express.Router();
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.use(isAuthenticated, isAdmin);

router.get('/', async (req, res) => {
  try {
    const members = dbAll('SELECT * FROM users ORDER BY position, name');
    const schedules = [];
    const templates = dbAll('SELECT * FROM checklist_templates ORDER BY category, sort_order');
    res.render('pages/admin/index', { members, schedules, templates });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/members', async (req, res) => {
  try {
    const { name, username, password, position, job } = req.body;
    const existing = dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      const members = dbAll('SELECT * FROM users ORDER BY position, name');
      return res.render('pages/admin/index', { members, schedules: [], templates: [], error: 'Username sudah digunakan' });
    }
    dbRun('INSERT INTO users (name, username, password, position, job) VALUES (?, ?, ?, ?, ?)',
      [name, username, password, position || 'member', job || null]);
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, password, position, job } = req.body;
    if (password && password.trim() !== '') {
      dbRun('UPDATE users SET name=?, username=?, password=?, position=?, job=? WHERE id=?',
        [name, username, password, position, job || null, parseInt(id)]);
    } else {
      dbRun('UPDATE users SET name=?, username=?, position=?, job=? WHERE id=?',
        [name, username, position, job || null, parseInt(id)]);
    }
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/members/:id/delete', async (req, res) => {
  try {
    dbRun('UPDATE users SET is_active = 0 WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/schedules', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const schedules = dbAll(`
      SELECT s.*, u.name as member_name
      FROM schedules s
      LEFT JOIN users u ON s.member_id = u.id
      WHERE s.schedule_date = ?
      ORDER BY s.shift, u.name
    `, [date]);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    res.render('pages/admin/schedules', { schedules, members, selectedDate: date });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/schedules', async (req, res) => {
  try {
    const { schedule_date, shift, member_id, job } = req.body;
    dbRun('INSERT INTO schedules (schedule_date, shift, member_id, job, created_by) VALUES (?, ?, ?, ?, ?)',
      [schedule_date, shift, parseInt(member_id), job, req.session.user.id]);
    res.redirect(`/admin/schedules?date=${schedule_date}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/schedules/:id/delete', async (req, res) => {
  try {
    const schedule = dbGet('SELECT schedule_date FROM schedules WHERE id = ?', [parseInt(req.params.id)]);
    dbRun('DELETE FROM schedules WHERE id = ?', [parseInt(req.params.id)]);
    const date = schedule ? schedule.schedule_date : new Date().toISOString().split('T')[0];
    res.redirect(`/admin/schedules?date=${date}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/checklist-templates', async (req, res) => {
  try {
    const templates = dbAll('SELECT * FROM checklist_templates ORDER BY category, sort_order');
    res.render('pages/admin/templates', { templates });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/checklist-templates', async (req, res) => {
  try {
    const { category, parameter_name, parameter_type, unit, min_value, max_value } = req.body;
    const maxRow = dbGet('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM checklist_templates WHERE category = ?', [category]);
    dbRun(
      `INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category, parameter_name, parameter_type, unit || null, min_value || null, max_value || null, maxRow ? maxRow.next_order : 1]
    );
    res.redirect('/admin/checklist-templates');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/checklist-templates/:id/delete', async (req, res) => {
  try {
    dbRun('DELETE FROM checklist_templates WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/admin/checklist-templates');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/overtime', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const submissions = dbAll(`
      SELECT os.*, u.name as submitted_by_name,
        GROUP_CONCAT(u2.name, ', ') as member_names
      FROM overtime_submissions os
      LEFT JOIN users u ON os.submitted_by = u.id
      LEFT JOIN overtime_members om ON os.id = om.submission_id
      LEFT JOIN users u2 ON om.member_id = u2.id
      GROUP BY os.id
      ORDER BY os.created_at DESC
    `);
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    const schedules = dbAll(`
      SELECT s.*, u.name as member_name
      FROM schedules s
      LEFT JOIN users u ON s.member_id = u.id
      WHERE s.schedule_date = ?
      ORDER BY s.shift, u.name
    `, [date]);
    res.render('pages/admin/overtime', { submissions, members, schedules, selectedDate: date });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/overtime/schedule', async (req, res) => {
  try {
    const { schedule_date, shift, member_id, job } = req.body;
    dbRun('INSERT INTO schedules (schedule_date, shift, member_id, job, created_by) VALUES (?, ?, ?, ?, ?)',
      [schedule_date, shift, parseInt(member_id), job, req.session.user.id]);
    res.redirect(`/admin/overtime?date=${schedule_date}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/overtime/schedule/:id/delete', async (req, res) => {
  try {
    const schedule = dbGet('SELECT schedule_date FROM schedules WHERE id = ?', [parseInt(req.params.id)]);
    dbRun('DELETE FROM schedules WHERE id = ?', [parseInt(req.params.id)]);
    const date = schedule ? schedule.schedule_date : new Date().toISOString().split('T')[0];
    res.redirect(`/admin/overtime?date=${date}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/overtime/:id/approve', async (req, res) => {
  try {
    const { assigned_job, admin_notes } = req.body;
    const submission = dbGet('SELECT * FROM overtime_submissions WHERE id = ?', [parseInt(req.params.id)]);
    const overtimeMembers = dbAll('SELECT om.member_id FROM overtime_members om WHERE om.submission_id = ?', [parseInt(req.params.id)]);
    const finalJob = (submission && submission.job === 'Opsional' && assigned_job) ? assigned_job : submission.job;

    if (submission && submission.job === 'Opsional' && assigned_job) {
      dbRun('UPDATE overtime_submissions SET status = ?, assigned_job = ?, admin_notes = ?, updated_at = datetime("now") WHERE id = ?',
        ['approved', assigned_job, admin_notes || '', parseInt(req.params.id)]);
      overtimeMembers.forEach(m => {
        dbRun('UPDATE users SET job = ? WHERE id = ?', [assigned_job, m.member_id]);
      });
    } else {
      dbRun('UPDATE overtime_submissions SET status = ?, admin_notes = ?, updated_at = datetime("now") WHERE id = ?',
        ['approved', admin_notes || '', parseInt(req.params.id)]);
    }

    overtimeMembers.forEach(m => {
      const existing = dbGet('SELECT id FROM schedules WHERE schedule_date = ? AND shift = ? AND member_id = ?',
        [submission.overtime_date, submission.shift, m.member_id]);
      if (!existing) {
        dbRun('INSERT OR IGNORE INTO schedules (schedule_date, shift, member_id, job, created_by) VALUES (?, ?, ?, ?, ?)',
          [submission.overtime_date, submission.shift, m.member_id, finalJob, req.session.user.id]);
      }
    });

    res.redirect('/admin/overtime');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/overtime/:id/reject', async (req, res) => {
  try {
    const { admin_notes } = req.body;
    dbRun('UPDATE overtime_submissions SET status = ?, admin_notes = ?, updated_at = datetime("now") WHERE id = ?',
      ['rejected', admin_notes || '', parseInt(req.params.id)]);
    res.redirect('/admin/overtime');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/overtime/:id/delete', async (req, res) => {
  try {
    dbRun('DELETE FROM overtime_members WHERE submission_id = ?', [parseInt(req.params.id)]);
    dbRun('DELETE FROM overtime_submissions WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/admin/overtime');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
