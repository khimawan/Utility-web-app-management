const { dbGet, dbRun } = require('./database');

/**
 * Shared stock arithmetic for inventory_items.quantity (REAL, max 1 decimal).
 *
 * Two rules the rest of the app relies on:
 *
 *  1. Stock never goes below 0. Every movement is clamped in SQL with
 *     MAX(0, ...), so even a bad request cannot produce a negative stock.
 *
 *  2. Only items carrying an explicit numeric `qty` move stock. Records written
 *     before quantity existed have items like {id, name} with no qty, and
 *     nothing was ever deducted for them - returning "stock" for such a record
 *     would invent inventory that never existed.
 */

/** Round to 1 decimal and strip float dust. Returns null for non-numbers. */
function roundQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

/**
 * Parse a quantity typed by a user or coming from a spreadsheet.
 * Optional `allowZero` keeps an empty field as 0 instead of rejecting it.
 */
function parseQty(raw, allowZero) {
  if (raw === null || raw === undefined || raw === '') {
    return allowZero ? { ok: true, value: 0 } : { ok: false, reason: 'jumlah wajib diisi' };
  }
  const s = String(raw).trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(s)) {
    return { ok: false, reason: 'jumlah "' + raw + '" bukan angka yang valid' };
  }
  const n = roundQty(s);
  if (n === null) return { ok: false, reason: 'jumlah "' + raw + '" tidak valid' };
  if (!allowZero && n <= 0) return { ok: false, reason: 'jumlah harus lebih dari 0' };
  if (n < 0) return { ok: false, reason: 'jumlah tidak boleh negatif' };
  return { ok: true, value: n };
}

/** Current stock for one inventory item, rounded. Missing item reads as 0. */
function getStock(itemId) {
  const row = dbGet('SELECT quantity FROM inventory_items WHERE id = ?', [itemId]);
  return row ? (roundQty(row.quantity) || 0) : 0;
}

/**
 * Add delta to an item's stock. Negative delta deducts and is clamped at 0.
 * ROUND() keeps 1.3 - 0.7 from landing on 0.6000000000000001.
 */
function adjustStock(itemId, delta) {
  const d = roundQty(delta);
  if (d === null || d === 0) return getStock(itemId);
  if (d < 0) {
    dbRun('UPDATE inventory_items SET quantity = MAX(0, ROUND(quantity + ?, 1)) WHERE id = ?', [d, itemId]);
  } else {
    dbRun('UPDATE inventory_items SET quantity = ROUND(quantity + ?, 1) WHERE id = ?', [d, itemId]);
  }
  return getStock(itemId);
}

/** Total requested per item id, summing duplicate rows and skipping legacy entries. */
function requestedByItem(items) {
  const wanted = {};
  (Array.isArray(items) ? items : []).forEach(function (it) {
    if (!it || it.id === undefined || it.id === null) return;
    if (typeof it.qty !== 'number' && typeof it.qty !== 'string') return;  // legacy row
    const q = roundQty(it.qty);
    if (q === null || q <= 0) return;
    const id = Number(it.id);
    wanted[id] = roundQty((wanted[id] || 0) + q);
  });
  return wanted;
}

/**
 * Verify every requested item exists and has enough stock.
 *
 * `credit` is a list of items whose quantity is already out of inventory (an
 * open loan being edited). Those units belong to this record, so they count as
 * available - otherwise saving an unchanged loan of 5 out of 5 would fail,
 * because the inventory shows 0 while the tools are legitimately with the user.
 *
 * Returns a list of problems; an empty list means the request is satisfiable.
 */
function checkAvailability(items, credit) {
  const wanted = requestedByItem(items);
  const credited = credit ? requestedByItem(credit) : {};
  const problems = [];
  Object.keys(wanted).forEach(function (key) {
    const id = Number(key);
    const need = wanted[key];
    const row = dbGet('SELECT item_name, quantity FROM inventory_items WHERE id = ?', [id]);
    if (!row) {
      problems.push({ id: id, reason: 'item tidak ditemukan di inventory' });
      return;
    }
    const have = roundQty((roundQty(row.quantity) || 0) + (credited[id] || 0));
    if (need > have) {
      problems.push({
        id: id,
        name: row.item_name,
        need: need,
        have: have,
        reason: 'stok ' + row.item_name + ' hanya ' + have + ', diminta ' + need
      });
    }
  });
  return problems;
}

/**
 * Apply a stock movement for every item in `items`.
 * sign = -1 deducts (borrowing), sign = +1 returns (giving back).
 */
function applyStock(items, sign) {
  const wanted = requestedByItem(items);
  Object.keys(wanted).forEach(function (key) {
    adjustStock(Number(key), sign * wanted[key]);
  });
}

/** Safe parse of a stored items JSON column. Never throws. */
function parseItems(raw) {
  let parsed = [];
  try { parsed = JSON.parse(raw || '[]'); } catch (e) { parsed = []; }
  return Array.isArray(parsed) ? parsed : [];
}

module.exports = {
  roundQty,
  parseQty,
  getStock,
  adjustStock,
  requestedByItem,
  checkAvailability,
  applyStock,
  parseItems
};