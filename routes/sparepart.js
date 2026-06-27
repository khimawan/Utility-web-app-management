const express = require('express');
const router = express.Router();
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

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
    res.render('pages/awal/spareparts', { spareparts });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { request_date, item_name, specification, quantity, category, urgency, progress } = req.body;
    dbRun(
      `INSERT INTO spareparts (request_date, item_name, specification, quantity, category, urgency, progress, input_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [request_date, item_name, specification, parseInt(quantity), category, urgency, progress || 'belum_dipesan', req.session.user.id]
    );
    res.redirect('/awal/spareparts');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, specification, quantity, category, urgency, progress } = req.body;
    dbRun(
      `UPDATE spareparts SET item_name=?, specification=?, quantity=?, category=?, urgency=?, progress=? WHERE id=?`,
      [item_name, specification, parseInt(quantity), category, urgency, progress, parseInt(id)]
    );
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
    dbRun('DELETE FROM spareparts WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/awal/spareparts');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
