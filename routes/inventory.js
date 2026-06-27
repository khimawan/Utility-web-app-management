const express = require('express');
const router = express.Router();
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const alat = dbAll("SELECT * FROM inventory_items WHERE category = 'alat' ORDER BY item_name");
    const part = dbAll("SELECT * FROM inventory_items WHERE category = 'part' ORDER BY item_name");
    const bahan = dbAll("SELECT * FROM inventory_items WHERE category = 'bahan' ORDER BY item_name");
    res.render('pages/inventory/index', { alat, part, bahan });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { category, item_name, specification, quantity } = req.body;
    const existing = dbGet('SELECT * FROM inventory_items WHERE item_name = ? AND category = ?', [item_name, category]);
    if (existing) {
      dbRun('UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?', [parseInt(quantity), existing.id]);
    } else {
      dbRun('INSERT INTO inventory_items (category, item_name, specification, quantity) VALUES (?, ?, ?, ?)',
        [category, item_name, specification, parseInt(quantity)]);
    }
    res.redirect('/inventory');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, specification, quantity } = req.body;
    dbRun('UPDATE inventory_items SET item_name=?, specification=?, quantity=? WHERE id=?',
      [item_name, specification, parseInt(quantity), parseInt(id)]);
    res.redirect('/inventory');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    dbRun('DELETE FROM inventory_items WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/inventory');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
