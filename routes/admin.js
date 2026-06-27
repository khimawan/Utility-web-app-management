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
    const existing = dbGet('SELECT id FROM schedules WHERE schedule_date = ? AND shift = ? AND member_id = ?',
      [schedule_date, shift, parseInt(member_id)]);
    if (existing) {
      dbRun('UPDATE schedules SET job = ? WHERE id = ?', [job, existing.id]);
    } else {
      dbRun('INSERT INTO schedules (schedule_date, shift, member_id, job, created_by) VALUES (?, ?, ?, ?, ?)',
        [schedule_date, shift, parseInt(member_id), job, req.session.user.id]);
    }
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

module.exports = router;
