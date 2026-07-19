const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

function getDateSubdir() {
  const d = new Date();
  return d.getFullYear() + '/' +
    String(d.getMonth() + 1).padStart(2, '0') + '/' +
    String(d.getDate()).padStart(2, '0');
}

const peminjamanStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'public', 'uploads', 'peminjaman', getDateSubdir());
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const uploadPeminjaman = multer({
  storage: peminjamanStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const records = dbAll(`
      SELECT p.*, u.name as input_by_name
      FROM peminjaman_alat p
      LEFT JOIN users u ON p.input_by = u.id
      ORDER BY
        CASE WHEN p.status='dipinjam' THEN 0 ELSE 1 END,
        p.borrow_date DESC
    `);
    const items = dbAll("SELECT * FROM inventory_items WHERE category = 'alat' ORDER BY item_name ASC");
    res.render('pages/awal/peminjaman', { records, items, importCount: parseInt(req.query.import) || 0, page: 'peminjaman' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/download-template', isAuthenticated, async (req, res) => {
  const header = 'borrower_name,division,location,borrow_time,borrow_date,items,duration_days,duration_hours,duration_minutes\n';
  const example = 'John Doe,Produksi,Workshop A,08:00,2025-01-15,"Kunci Pas 10mm, Obeng",3,2,30\n';
  const csv = header + example;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=template_peminjaman.csv');
  res.send(csv);
});

router.post('/', isAuthenticated, uploadPeminjaman.single('photo'), async (req, res) => {
  try {
    const { borrower_name, division, location, borrow_time, borrow_date, items, duration_days, duration_hours, duration_minutes } = req.body;
    const photo_url = req.file ? '/uploads/peminjaman/' + getDateSubdir() + '/' + req.file.filename : null;
    dbRun(
      `INSERT INTO peminjaman_alat (borrower_name, division, location, borrow_time, borrow_date, items, duration_days, duration_hours, duration_minutes, status, input_by, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [borrower_name, division, location, borrow_time, borrow_date, items, parseInt(duration_days) || 0, parseInt(duration_hours) || 0, parseInt(duration_minutes) || 0, 'dipinjam', req.session.user.id, photo_url]
    );
    res.redirect('/peminjaman');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/import-csv', isAuthenticated, uploadPeminjaman.single('csv_file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('File CSV tidak ditemukan');
    const csvPath = req.file.path;
    const content = fs.readFileSync(csvPath, 'utf-8').trim();
    const lines = content.split('\n');
    if (lines.length < 2) return res.status(400).send('CSV tidak memiliki data');
    const header = lines[0].split(',').map(h => h.trim());
    const expected = ['borrower_name', 'division', 'location', 'borrow_time', 'borrow_date', 'items', 'duration_days', 'duration_hours', 'duration_minutes'];
    for (let i = 0; i < expected.length; i++) {
      if (!header.includes(expected[i])) return res.status(400).send('Kolom ' + expected[i] + ' tidak ditemukan di CSV');
    }
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < expected.length) continue;
      const borrower_name = cols[header.indexOf('borrower_name')];
      const division = cols[header.indexOf('division')] || '';
      const location = cols[header.indexOf('location')] || '';
      const borrow_time = cols[header.indexOf('borrow_time')] || '00:00';
      const borrow_date = cols[header.indexOf('borrow_date')] || new Date().toISOString().slice(0, 10);
      const items = cols[header.indexOf('items')] || '';
      const duration_days = parseInt(cols[header.indexOf('duration_days')]) || 0;
      const duration_hours = parseInt(cols[header.indexOf('duration_hours')]) || 0;
      const duration_minutes = parseInt(cols[header.indexOf('duration_minutes')]) || 0;
      if (!borrower_name) continue;
      dbRun(
        `INSERT INTO peminjaman_alat (borrower_name, division, location, borrow_time, borrow_date, items, duration_days, duration_hours, duration_minutes, status, input_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [borrower_name, division, location, borrow_time, borrow_date, items, duration_days, duration_hours, duration_minutes, 'dipinjam', req.session.user.id]
      );
      count++;
    }
    fs.unlinkSync(csvPath);
    res.redirect('/peminjaman?import=' + count);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/delete-multiple', isAuthenticated, async (req, res) => {
  try {
    const { ids } = req.body;
    const idList = Array.isArray(ids) ? ids.map(Number).filter(Boolean) : [];
    idList.forEach(function(id) {
      const rec = dbGet('SELECT photo_url FROM peminjaman_alat WHERE id = ?', [id]);
      if (rec && rec.photo_url) {
        const filePath = path.join(__dirname, '..', 'public', rec.photo_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      dbRun('DELETE FROM peminjaman_alat WHERE id = ?', [id]);
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/:id', isAuthenticated, uploadPeminjaman.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { borrower_name, division, location, borrow_time, borrow_date, items, duration_days, duration_hours, duration_minutes, status } = req.body;
    let photo_url = null;
    if (req.file) {
      photo_url = '/uploads/peminjaman/' + getDateSubdir() + '/' + req.file.filename;
      const old = dbGet('SELECT photo_url FROM peminjaman_alat WHERE id = ?', [parseInt(id)]);
      if (old && old.photo_url) {
        const oldPath = path.join(__dirname, '..', 'public', old.photo_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    if (photo_url) {
      dbRun('UPDATE peminjaman_alat SET borrower_name=?, division=?, location=?, borrow_time=?, borrow_date=?, items=?, duration_days=?, duration_hours=?, duration_minutes=?, status=?, photo_url=? WHERE id=?',
        [borrower_name, division, location, borrow_time, borrow_date, items, parseInt(duration_days) || 0, parseInt(duration_hours) || 0, parseInt(duration_minutes) || 0, status || 'dipinjam', photo_url, parseInt(id)]);
    } else {
      dbRun('UPDATE peminjaman_alat SET borrower_name=?, division=?, location=?, borrow_time=?, borrow_date=?, items=?, duration_days=?, duration_hours=?, duration_minutes=?, status=? WHERE id=?',
        [borrower_name, division, location, borrow_time, borrow_date, items, parseInt(duration_days) || 0, parseInt(duration_hours) || 0, parseInt(duration_minutes) || 0, status || 'dipinjam', parseInt(id)]);
    }
    res.redirect('/peminjaman');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const rec = dbGet('SELECT photo_url FROM peminjaman_alat WHERE id = ?', [parseInt(req.params.id)]);
    if (rec && rec.photo_url) {
      const filePath = path.join(__dirname, '..', 'public', rec.photo_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    dbRun('DELETE FROM peminjaman_alat WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/peminjaman');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
