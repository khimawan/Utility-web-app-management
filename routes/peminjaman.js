const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const stock = require('../config/stock');
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
    res.render('pages/awal/peminjaman', { records, items, page: 'peminjaman', borrowError: null, borrowErrors: [] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

/**
 * Validate a borrow payload. Every selected item must carry a positive qty that
 * the inventory can cover. `credit` is the currently-held set of an open loan
 * being edited, so its own units count as available.
 * Returns {ok, items} or {ok:false, errors}.
 */
function validateBorrowPayload(items, credit) {
  const parsed = stock.parseItems(items);
  const errors = [];

  if (parsed.length === 0) errors.push('Pilih minimal satu alat yang dipinjam.');

  parsed.forEach(function (it, idx) {
    if (!it || it.id === undefined || it.id === null) {
      errors.push('Baris alat ke-' + (idx + 1) + ' tidak valid.');
      return;
    }
    const q = stock.parseQty(it.qty);
    if (!q.ok) {
      errors.push((it.name || 'Alat') + ': ' + q.reason);
      return;
    }
    it.qty = q.value;   // normalise so the stored JSON is canonical
  });

  if (errors.length === 0) {
    const short = stock.checkAvailability(parsed, credit);
    short.forEach(function (p) { errors.push(p.reason); });
  }

  return errors.length ? { ok: false, errors: errors } : { ok: true, items: parsed };
}

router.post('/', isAuthenticated, uploadPeminjaman.single('photo'), async (req, res) => {
  // A rejected request may still have uploaded a photo - drop it, otherwise
  // every failed borrow would leave an orphan file in public/uploads.
  const discardUpload = function () {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
  };

  const renderError = function (errors) {
    const records = dbAll(`
      SELECT p.*, u.name as input_by_name
      FROM peminjaman_alat p
      LEFT JOIN users u ON p.input_by = u.id
      ORDER BY
        CASE WHEN p.status='dipinjam' THEN 0 ELSE 1 END,
        p.borrow_date DESC
    `);
    const items = dbAll("SELECT * FROM inventory_items WHERE category = 'alat' ORDER BY item_name ASC");
    return res.status(400).render('pages/awal/peminjaman', {
      records, items, page: 'peminjaman', borrowError: errors[0], borrowErrors: errors
    });
  };

  try {
    const { borrower_name, division, location, borrow_time, borrow_date, items, duration_days, duration_hours, duration_minutes } = req.body;

    const checked = validateBorrowPayload(items);
    if (!checked.ok) {
      discardUpload();
      return renderError(checked.errors);
    }

    const photo_url = req.file ? '/uploads/peminjaman/' + getDateSubdir() + '/' + req.file.filename : null;
    dbRun(
      `INSERT INTO peminjaman_alat (borrower_name, division, location, borrow_time, borrow_date, items, duration_days, duration_hours, duration_minutes, status, input_by, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [borrower_name, division, location, borrow_time, borrow_date, JSON.stringify(checked.items), parseInt(duration_days) || 0, parseInt(duration_hours) || 0, parseInt(duration_minutes) || 0, 'dipinjam', req.session.user.id, photo_url]
    );

    // Stock leaves the inventory for as long as the loan is open.
    stock.applyStock(checked.items, -1);

    res.redirect('/peminjaman');
  } catch (err) {
    console.error(err);
    discardUpload();
    res.status(500).send('Server Error');
  }
});

router.post('/delete-multiple', isAuthenticated, async (req, res) => {
  try {
    const { ids } = req.body;
    const idList = Array.isArray(ids) ? ids.map(Number).filter(Boolean) : [];
    idList.forEach(function(id) {
      const rec = dbGet('SELECT photo_url, status, items FROM peminjaman_alat WHERE id = ?', [id]);
      if (rec && rec.photo_url) {
        const filePath = path.join(__dirname, '..', 'public', rec.photo_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      // Deleting an open loan means the tools come back.
      if (rec && rec.status === 'dipinjam') {
        stock.applyStock(stock.parseItems(rec.items), +1);
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
  const discardUpload = function () {
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
  };

  const renderError = function (errors) {
    const records = dbAll(`
      SELECT p.*, u.name as input_by_name
      FROM peminjaman_alat p
      LEFT JOIN users u ON p.input_by = u.id
      ORDER BY
        CASE WHEN p.status='dipinjam' THEN 0 ELSE 1 END,
        p.borrow_date DESC
    `);
    const items = dbAll("SELECT * FROM inventory_items WHERE category = 'alat' ORDER BY item_name ASC");
    return res.status(400).render('pages/awal/peminjaman', {
      records, items, page: 'peminjaman', borrowError: errors[0], borrowErrors: errors
    });
  };

  try {
    const { id } = req.params;
    const { borrower_name, division, location, borrow_time, borrow_date, items, duration_days, duration_hours, duration_minutes, status } = req.body;
    const newStatus = status || 'dipinjam';

    const existing = dbGet('SELECT status, items, photo_url FROM peminjaman_alat WHERE id = ?', [parseInt(id)]);
    if (!existing) {
      discardUpload();
      return res.status(404).redirect('/peminjaman');
    }

    const wasOpen = existing.status === 'dipinjam';
    const oldItems = stock.parseItems(existing.items);

    // Units this loan already holds are credited back for validation, so
    // saving an open loan without changing anything does not fail.
    const checked = validateBorrowPayload(items, wasOpen ? oldItems : []);
    if (!checked.ok) {
      discardUpload();
      return renderError(checked.errors);
    }

    let photo_url = null;
    if (req.file) {
      photo_url = '/uploads/peminjaman/' + getDateSubdir() + '/' + req.file.filename;
      if (existing.photo_url) {
        const oldPath = path.join(__dirname, '..', 'public', existing.photo_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    const setClause = photo_url
      ? 'UPDATE peminjaman_alat SET borrower_name=?, division=?, location=?, borrow_time=?, borrow_date=?, items=?, duration_days=?, duration_hours=?, duration_minutes=?, status=?, photo_url=? WHERE id=?'
      : 'UPDATE peminjaman_alat SET borrower_name=?, division=?, location=?, borrow_time=?, borrow_date=?, items=?, duration_days=?, duration_hours=?, duration_minutes=?, status=? WHERE id=?';
    const tail = photo_url ? [photo_url, parseInt(id)] : [parseInt(id)];
    dbRun(setClause, [borrower_name, division, location, borrow_time, borrow_date, JSON.stringify(checked.items),
      parseInt(duration_days) || 0, parseInt(duration_hours) || 0, parseInt(duration_minutes) || 0,
      newStatus].concat(tail));

    // Stock only moves on a status edge, never on a plain edit of a loan that
    // stayed open - otherwise saving twice would deduct the tools twice.
    const nowOpen = newStatus === 'dipinjam';
    const newItems = checked.items;

    if (wasOpen && !nowOpen) {
      stock.applyStock(oldItems, +1);                 // returned
    } else if (!wasOpen && nowOpen) {
      stock.applyStock(newItems, -1);                 // borrowed again
    } else if (wasOpen && nowOpen) {
      stock.applyStock(oldItems, +1);                 // give the old set back...
      stock.applyStock(newItems, -1);                 // ...then take the new one
    }

    res.redirect('/peminjaman');
  } catch (err) {
    console.error(err);
    discardUpload();
    res.status(500).send('Server Error');
  }
});

router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const rec = dbGet('SELECT photo_url, status, items FROM peminjaman_alat WHERE id = ?', [parseInt(req.params.id)]);
    if (rec && rec.photo_url) {
      const filePath = path.join(__dirname, '..', 'public', rec.photo_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    // Deleting an open loan means the tools come back.
    if (rec && rec.status === 'dipinjam') {
      stock.applyStock(stock.parseItems(rec.items), +1);
    }
    dbRun('DELETE FROM peminjaman_alat WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/peminjaman');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
