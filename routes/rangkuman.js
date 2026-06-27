const express = require('express');
const router = express.Router();
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const activities = dbAll(`
      SELECT al.*, u.name as member_name
      FROM activity_logs al
      LEFT JOIN users u ON al.member_id = u.id
      WHERE al.activity_date = ?
      ORDER BY al.activity_time
    `, [date]);

    const warnings = dbAll(`
      SELECT w.*, GROUP_CONCAT(u.name, ', ') as member_names
      FROM warnings w
      LEFT JOIN warning_members wm ON w.id = wm.warning_id
      LEFT JOIN users u ON wm.member_id = u.id
      WHERE w.warning_date = ?
      GROUP BY w.id
      ORDER BY w.created_at
    `, [date]);

    const works = dbAll(`
      SELECT w.*, GROUP_CONCAT(u.name, ', ') as member_names
      FROM works w
      LEFT JOIN work_members wm ON w.id = wm.work_id
      LEFT JOIN users u ON wm.member_id = u.id
      WHERE w.work_date = ?
      GROUP BY w.id
      ORDER BY w.created_at
    `, [date]);

    const checklists = dbAll(`
      SELECT ce.*, u.name as input_by_name
      FROM checklist_entries ce
      LEFT JOIN users u ON ce.input_by = u.id
      WHERE ce.entry_date = ?
      ORDER BY ce.shift, ce.category
    `, [date]);

    res.render('pages/rangkuman/index', {
      selectedDate: date,
      activities,
      warnings,
      works,
      checklists
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
