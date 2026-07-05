const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'public', 'uploads', 'utility_requests');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'utility-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|mp4|webm|quicktime/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Hanya file JPG, JPEG, PNG, MP4, atau WebM yang diizinkan'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Landing page
router.get('/', async (req, res) => {
  try {
    const contents = dbAll('SELECT * FROM utility_landing_content');
    const content = {};
    contents.forEach(function(c) { content[c.content_key] = c; });
    res.render('pages/utility/landing', { content });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Submit form page
router.get('/submit', async (req, res) => {
  res.render('pages/utility/submit');
});

// Submit handler
router.post('/submit', upload.single('photo'), async (req, res) => {
  try {
    const { requester_name, position, whatsapp, work_area, building, issue, priority } = req.body;
    const photo_url = req.file ? '/uploads/utility_requests/' + req.file.filename : null;
    dbRun(
      `INSERT INTO utility_requests (requester_name, position, whatsapp, work_area, building, issue, priority, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [requester_name, position, whatsapp, work_area, building, issue, priority || 'Medium', photo_url]
    );
    res.redirect('/utility/tracking');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Tracking page
router.get('/tracking', async (req, res) => {
  try {
    const requests = dbAll(`
      SELECT ur.*,
        GROUP_CONCAT(u.name, ', ') as member_names
      FROM utility_requests ur
      LEFT JOIN utility_request_members urm ON ur.id = urm.request_id
      LEFT JOIN users u ON urm.member_id = u.id
      GROUP BY ur.id
      ORDER BY ur.created_at DESC
    `);
    const open = requests.filter(function(r) { return r.status === 'open'; });
    const closed = requests.filter(function(r) { return r.status === 'closed'; });
    const outOfScope = requests.filter(function(r) { return r.status === 'diluar_scoope'; });
    const onHold = requests.filter(function(r) { return r.status === 'on_hold'; });
    res.render('pages/utility/tracking', { open, closed, outOfScope, onHold });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
