const express = require('express');
const router = express.Router();
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, async (req, res) => {
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
    res.render('pages/awal/member', { schedules, members, selectedDate: date });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/schedule', isAuthenticated, async (req, res) => {
  try {
    const { schedule_date, shift, member_id, job } = req.body;
    const existing = dbGet('SELECT id FROM schedules WHERE schedule_date = ? AND shift = ? AND member_id = ?',
      [schedule_date, shift, parseInt(member_id)]);
    if (existing) {
      dbRun('UPDATE schedules SET job = ? WHERE id = ?', [job, existing.id]);
    } else {
      dbRun(
        `INSERT INTO schedules (schedule_date, shift, member_id, job, created_by) VALUES (?, ?, ?, ?, ?)`,
        [schedule_date, shift, parseInt(member_id), job, req.session.user.id]
      );
    }
    res.redirect(`/awal/member?date=${schedule_date}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/schedule/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const schedule = dbGet('SELECT schedule_date FROM schedules WHERE id = ?', [parseInt(req.params.id)]);
    dbRun('DELETE FROM schedules WHERE id = ?', [parseInt(req.params.id)]);
    const date = schedule ? schedule.schedule_date : new Date().toISOString().split('T')[0];
    res.redirect(`/awal/member?date=${date}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
