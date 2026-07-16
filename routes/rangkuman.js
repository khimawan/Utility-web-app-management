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

    const utilityRequests = dbAll(`
      SELECT ur.*, GROUP_CONCAT(u.name, ', ') as member_names
      FROM utility_requests ur
      LEFT JOIN utility_request_members urm ON ur.id = urm.request_id
      LEFT JOIN users u ON urm.member_id = u.id
      WHERE date(ur.created_at) = ? OR date(ur.updated_at) = ?
      GROUP BY ur.id
      ORDER BY ur.created_at
    `, [date, date]);

    const wtpPredictive = dbAll(`
      SELECT cw.*, u.name as member_name
      FROM checklist_wtp cw
      LEFT JOIN users u ON cw.member_id = u.id
      WHERE cw.tanggal_monitoring = ? AND cw.jenis_kegiatan = 'predictive'
      ORDER BY cw.shift, cw.jam_monitoring
    `, [date]);

    const wtpPreventive = dbAll(`
      SELECT cw.*, u.name as member_name
      FROM checklist_wtp cw
      LEFT JOIN users u ON cw.member_id = u.id
      WHERE cw.tanggal_monitoring = ? AND cw.jenis_kegiatan = 'preventive'
      ORDER BY cw.shift, cw.jam_monitoring
    `, [date]);

    const boilerPredictive = dbAll(`
      SELECT cb.*, u.name as member_name
      FROM checklist_boiler cb
      LEFT JOIN users u ON cb.member_id = u.id
      WHERE cb.tanggal_monitoring = ? AND cb.jenis_kegiatan = 'predictive'
      ORDER BY cb.shift, cb.jam_monitoring
    `, [date]);

    const boilerPreventive = dbAll(`
      SELECT cb.*, u.name as member_name
      FROM checklist_boiler cb
      LEFT JOIN users u ON cb.member_id = u.id
      WHERE cb.tanggal_monitoring = ? AND cb.jenis_kegiatan = 'preventive'
      ORDER BY cb.shift, cb.jam_monitoring
    `, [date]);

    const n2Predictive = dbAll(`
      SELECT cn.*, u.name as member_name
      FROM checklist_n2 cn
      LEFT JOIN users u ON cn.member_id = u.id
      WHERE cn.tanggal_monitoring = ? AND cn.jenis_kegiatan = 'predictive'
      ORDER BY cn.shift, cn.jam_monitoring
    `, [date]);

    const n2Preventive = dbAll(`
      SELECT cn.*, u.name as member_name
      FROM checklist_n2 cn
      LEFT JOIN users u ON cn.member_id = u.id
      WHERE cn.tanggal_monitoring = ? AND cn.jenis_kegiatan = 'preventive'
      ORDER BY cn.shift, cn.jam_monitoring
    `, [date]);

    const kompresorPredictive = dbAll(`
      SELECT ck.*, u.name as member_name
      FROM checklist_kompressor ck
      LEFT JOIN users u ON ck.member_id = u.id
      WHERE ck.tanggal_monitoring = ? AND ck.jenis_kegiatan = 'predictive'
      ORDER BY ck.shift, ck.jam_monitoring
    `, [date]);

    const kompresorPreventive = dbAll(`
      SELECT ck.*, u.name as member_name
      FROM checklist_kompressor ck
      LEFT JOIN users u ON ck.member_id = u.id
      WHERE ck.tanggal_monitoring = ? AND ck.jenis_kegiatan = 'preventive'
      ORDER BY ck.shift, ck.jam_monitoring
    `, [date]);

    res.render('pages/rangkuman/index', {
      selectedDate: date,
      activities,
      warnings,
      works,
      checklists,
      utilityRequests,
      wtpPredictive, wtpPreventive,
      boilerPredictive, boilerPreventive,
      n2Predictive, n2Preventive,
      kompresorPredictive, kompresorPreventive
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
