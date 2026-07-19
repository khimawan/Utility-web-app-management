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

const sparepartStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'public', 'uploads', 'spareparts', getDateSubdir());
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const uploadSparepart = multer({
  storage: sparepartStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const spareparts = dbAll(`
      SELECT s.*, u.name as input_by_name
      FROM spareparts s
      LEFT JOIN users u ON s.input_by = u.id
      ORDER BY
        CASE WHEN s.urgency = 'urgent' THEN 0 ELSE 1 END,
        s.request_date DESC
    `);
    res.render('pages/awal/spareparts', { spareparts, importCount: parseInt(req.query.import) || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/download-template', isAuthenticated, async (req, res) => {
  const header = 'item_name,specification,quantity,category,urgency,progress\n';
  const example = 'Kunci Pas 10mm,Kunci pas ukuran 10mm,5,alat,tidak,belum_dipesan\n';
  const csv = header + example;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=template_sparepart.csv');
  res.send(csv);
});

router.post('/', isAuthenticated, uploadSparepart.single('photo'), async (req, res) => {
  try {
    const { request_date, item_name, specification, quantity, category, urgency, progress } = req.body;
    const photo_url = req.file ? '/uploads/spareparts/' + getDateSubdir() + '/' + req.file.filename : null;
    dbRun(
      `INSERT INTO spareparts (request_date, item_name, specification, quantity, category, urgency, progress, input_by, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [request_date, item_name, specification, parseInt(quantity), category, urgency, progress || 'belum_dipesan', req.session.user.id, photo_url]
    );
    res.redirect('/awal/spareparts');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/import-csv', isAuthenticated, uploadSparepart.single('csv_file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('File CSV tidak ditemukan');
    const csvPath = req.file.path;
    const content = fs.readFileSync(csvPath, 'utf-8').trim();
    const lines = content.split('\n');
    if (lines.length < 2) return res.status(400).send('CSV tidak memiliki data');
    const header = lines[0].split(',').map(h => h.trim());
    const expected = ['item_name', 'specification', 'quantity', 'category', 'urgency', 'progress'];
    for (let i = 0; i < expected.length; i++) {
      if (!header.includes(expected[i])) return res.status(400).send('Kolom ' + expected[i] + ' tidak ditemukan di CSV');
    }
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < expected.length) continue;
      const item_name = cols[header.indexOf('item_name')];
      const specification = cols[header.indexOf('specification')] || '';
      const quantity = parseInt(cols[header.indexOf('quantity')]) || 1;
      const category = cols[header.indexOf('category')] || 'alat';
      const urgency = cols[header.indexOf('urgency')] || 'tidak';
      const progress = cols[header.indexOf('progress')] || 'belum_dipesan';
      if (!item_name) continue;
      dbRun(
        `INSERT INTO spareparts (request_date, item_name, specification, quantity, category, urgency, progress, input_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [new Date().toISOString().slice(0, 10), item_name, specification, quantity, category, urgency, progress, req.session.user.id]
      );
      count++;
    }
    fs.unlinkSync(csvPath);
    res.redirect('/awal/spareparts?import=' + count);
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
      const sp = dbGet('SELECT photo_url FROM spareparts WHERE id = ?', [id]);
      if (sp && sp.photo_url) {
        const filePath = path.join(__dirname, '..', 'public', sp.photo_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      dbRun('DELETE FROM spareparts WHERE id = ?', [id]);
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/:id', isAuthenticated, uploadSparepart.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, specification, quantity, category, urgency, progress } = req.body;
    let photo_url = null;
    if (req.file) {
      photo_url = '/uploads/spareparts/' + getDateSubdir() + '/' + req.file.filename;
      const old = dbGet('SELECT photo_url FROM spareparts WHERE id = ?', [parseInt(id)]);
      if (old && old.photo_url) {
        const oldPath = path.join(__dirname, '..', 'public', old.photo_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    if (photo_url) {
      dbRun('UPDATE spareparts SET item_name=?, specification=?, quantity=?, category=?, urgency=?, progress=?, photo_url=? WHERE id=?',
        [item_name, specification, parseInt(quantity), category, urgency, progress, photo_url, parseInt(id)]);
    } else {
      dbRun('UPDATE spareparts SET item_name=?, specification=?, quantity=?, category=?, urgency=?, progress=? WHERE id=?',
        [item_name, specification, parseInt(quantity), category, urgency, progress, parseInt(id)]);
    }
    if (progress === 'barang_sampai') {
      const sp = dbGet('SELECT * FROM spareparts WHERE id = ?', [parseInt(id)]);
      if (sp) {
        const existing = dbGet('SELECT * FROM inventory_items WHERE item_name = ? AND category = ?', [sp.item_name, sp.category]);
        if (existing) {
          dbRun('UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?', [sp.quantity, existing.id]);
        } else {
          dbRun('INSERT INTO inventory_items (category, item_name, specification, quantity) VALUES (?, ?, ?, ?)',
            [sp.category, sp.item_name, sp.specification, sp.quantity]);
        }
      }
    }
    res.redirect('/awal/spareparts');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const sp = dbGet('SELECT photo_url FROM spareparts WHERE id = ?', [parseInt(req.params.id)]);
    if (sp && sp.photo_url) {
      const filePath = path.join(__dirname, '..', 'public', sp.photo_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    dbRun('DELETE FROM spareparts WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/awal/spareparts');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
