const express = require('express');
const router = express.Router();
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const members = dbAll("SELECT * FROM users WHERE position = 'member' AND is_active = 1 ORDER BY name");
    const submissions = dbAll(`
      SELECT os.*, u.name as submitted_by_name,
        GROUP_CONCAT(u2.name, ', ') as member_names
      FROM overtime_submissions os
      LEFT JOIN users u ON os.submitted_by = u.id
      LEFT JOIN overtime_members om ON os.id = om.submission_id
      LEFT JOIN users u2 ON om.member_id = u2.id
      GROUP BY os.id
      ORDER BY os.created_at DESC
      LIMIT 50
    `);
    const schedules = dbAll(`
      SELECT s.*, u.name as member_name
      FROM schedules s
      LEFT JOIN users u ON s.member_id = u.id
      WHERE s.schedule_date = ?
      ORDER BY s.shift, u.name
    `, [date]);
    res.render('pages/awal/member', { members, submissions, schedules, selectedDate: date });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/overtime', isAuthenticated, async (req, res) => {
  try {
    const { overtime_date, shift, schedule_type, job, member_ids } = req.body;
    const result = dbRun(
      `INSERT INTO overtime_submissions (overtime_date, shift, schedule_type, job, submitted_by) VALUES (?, ?, ?, ?, ?)`,
      [overtime_date, shift, schedule_type, job, req.session.user.id]
    );
    const submissionId = result.lastID;
    const ids = Array.isArray(member_ids) ? member_ids : (member_ids ? [member_ids] : []);
    ids.forEach(mid => {
      dbRun('INSERT OR IGNORE INTO overtime_members (submission_id, member_id) VALUES (?, ?)', [submissionId, parseInt(mid)]);
    });
    res.redirect('/awal/member');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/overtime/:id/delete', isAuthenticated, async (req, res) => {
  try {
    dbRun('DELETE FROM overtime_members WHERE submission_id = ?', [parseInt(req.params.id)]);
    dbRun('DELETE FROM overtime_submissions WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/awal/member');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
