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

const invStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'public', 'uploads', 'inventory', getDateSubdir());
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const uploadInv = multer({ storage: invStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const alat = dbAll("SELECT * FROM inventory_items WHERE category = 'alat' ORDER BY item_name");
    const part = dbAll("SELECT * FROM inventory_items WHERE category = 'part' ORDER BY item_name");
    const bahan = dbAll("SELECT * FROM inventory_items WHERE category = 'bahan' ORDER BY item_name");
    res.render('pages/inventory/index', { alat, part, bahan, importCount: parseInt(req.query.import) || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/download-template', isAuthenticated, async (req, res) => {
  const header = 'category,item_name,specification,quantity\n';
  const example = 'alat,Kunci Pas 10mm,Kunci pas ukuran 10mm,5\n';
  const csv = header + example;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=template_inventory.csv');
  res.send(csv);
});

router.post('/', isAuthenticated, uploadInv.single('photo'), async (req, res) => {
  try {
    const { category, item_name, specification, quantity } = req.body;
    const photo_url = req.file ? '/uploads/inventory/' + getDateSubdir() + '/' + req.file.filename : null;
    const existing = dbGet('SELECT * FROM inventory_items WHERE item_name = ? AND category = ?', [item_name, category]);
    if (existing) {
      let upd = 'UPDATE inventory_items SET quantity = quantity + ?';
      const params = [parseInt(quantity)];
      if (photo_url) { upd += ', photo_url = ?'; params.push(photo_url); }
      upd += ' WHERE id = ?';
      params.push(existing.id);
      dbRun(upd, params);
    } else {
      dbRun('INSERT INTO inventory_items (category, item_name, specification, quantity, photo_url) VALUES (?, ?, ?, ?, ?)',
        [category, item_name, specification, parseInt(quantity), photo_url]);
    }
    res.redirect('/inventory');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/import-csv', isAuthenticated, uploadInv.single('csv_file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('File CSV tidak ditemukan');
    const content = fs.readFileSync(req.file.path, 'utf-8').trim();
    const lines = content.split('\n');
    if (lines.length < 2) return res.status(400).send('CSV tidak memiliki data');
    const header = lines[0].split(',').map(h => h.trim());
    const expected = ['category', 'item_name', 'specification', 'quantity'];
    for (const col of expected) {
      if (!header.includes(col)) return res.status(400).send('Kolom ' + col + ' tidak ditemukan di CSV');
    }
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < expected.length) continue;
      const category = cols[header.indexOf('category')];
      const item_name = cols[header.indexOf('item_name')];
      const specification = cols[header.indexOf('specification')] || '';
      const quantity = parseInt(cols[header.indexOf('quantity')]) || 1;
      if (!['alat', 'part', 'bahan'].includes(category) || !item_name) continue;
      dbRun('INSERT INTO inventory_items (category, item_name, specification, quantity) VALUES (?, ?, ?, ?)',
        [category, item_name, specification, quantity]);
      count++;
    }
    fs.unlinkSync(req.file.path);
    res.redirect('/inventory?import=' + count);
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
      const item = dbGet('SELECT photo_url FROM inventory_items WHERE id = ?', [id]);
      if (item && item.photo_url) {
        const fp = path.join(__dirname, '..', 'public', item.photo_url);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      dbRun('DELETE FROM inventory_items WHERE id = ?', [id]);
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/:id', isAuthenticated, uploadInv.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, specification, quantity } = req.body;
    let photo_url = null;
    if (req.file) {
      photo_url = '/uploads/inventory/' + getDateSubdir() + '/' + req.file.filename;
      const old = dbGet('SELECT photo_url FROM inventory_items WHERE id = ?', [parseInt(id)]);
      if (old && old.photo_url) {
        const fp = path.join(__dirname, '..', 'public', old.photo_url);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    }
    if (photo_url) {
      dbRun('UPDATE inventory_items SET item_name=?, specification=?, quantity=?, photo_url=? WHERE id=?',
        [item_name, specification, parseInt(quantity), photo_url, parseInt(id)]);
    } else {
      dbRun('UPDATE inventory_items SET item_name=?, specification=?, quantity=? WHERE id=?',
        [item_name, specification, parseInt(quantity), parseInt(id)]);
    }
    res.redirect('/inventory');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const item = dbGet('SELECT photo_url FROM inventory_items WHERE id = ?', [parseInt(req.params.id)]);
    if (item && item.photo_url) {
      const fp = path.join(__dirname, '..', 'public', item.photo_url);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    dbRun('DELETE FROM inventory_items WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/inventory');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
