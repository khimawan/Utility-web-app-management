const express = require('express');
const router = express.Router();
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

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const records = dbAll(`
      SELECT p.*, u.name as input_by_name
      FROM pemakaian_part p
      LEFT JOIN users u ON p.input_by = u.id
      ORDER BY p.created_at DESC
    `);
    const items = dbAll("SELECT * FROM inventory_items WHERE category IN ('part', 'bahan') ORDER BY item_name ASC");
    const members = dbAll("SELECT * FROM users WHERE is_active = 1 ORDER BY name ASC");
    res.render('pages/awal/pemakaian', { records, items, members, page: 'pemakaian' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { project_name, member_ids, items } = req.body;
    const parsedItems = stock.parseItems(items);

    // Work out what is actually available before deducting. Recording 99 while
    // only 2 existed and clamping the stock to 0 would leave the record claiming
    // 99, and deleting it later would hand 99 back - inventing inventory.
    parsedItems.forEach(function (item) {
      const want = stock.roundQty(item.qty);
      if (!item || item.id === undefined || item.id === null || want === null || want <= 0) {
        item.taken = 0;
        return;
      }
      const have = stock.getStock(item.id);
      item.taken = Math.min(want, have);
    });

    dbRun(
      `INSERT INTO pemakaian_part (project_name, member_ids, items, input_by)
       VALUES (?, ?, ?, ?)`,
      [project_name, member_ids, JSON.stringify(parsedItems), req.session.user.id]
    );

    parsedItems.forEach(function (item) {
      if (item.taken > 0) stock.adjustStock(item.id, -item.taken);
    });

    res.redirect('/pemakaian');
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
      const rec = dbGet('SELECT items FROM pemakaian_part WHERE id = ?', [id]);
      if (rec && rec.items) {
        // Give back exactly what was taken. `taken` was written when the stock
        // was clamped; legacy rows without it fall back to the recorded qty.
        stock.parseItems(rec.items).forEach(function (item) {
          const qty = stock.roundQty(item.taken !== undefined ? item.taken : item.qty);
          if (!qty || qty <= 0) return;
          stock.adjustStock(item.id, qty);
        });
      }
      dbRun('DELETE FROM pemakaian_part WHERE id = ?', [id]);
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const rec = dbGet('SELECT items FROM pemakaian_part WHERE id = ?', [parseInt(req.params.id)]);
    if (rec && rec.items) {
      stock.parseItems(rec.items).forEach(function (item) {
        const qty = stock.roundQty(item.taken !== undefined ? item.taken : item.qty);
        if (!qty || qty <= 0) return;
        stock.adjustStock(item.id, qty);
      });
    }
    dbRun('DELETE FROM pemakaian_part WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/pemakaian');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
