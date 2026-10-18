const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
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

// Accepts both CSV and Excel. The extension is not trusted - detectFormat()
// below sniffs the actual bytes, so a .csv renamed to .xlsx still imports as CSV.
const ALLOWED_EXT = new Set(['.csv', '.xlsx', '.xlsm', '.xls']);
const uploadAny = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error('Format file harus .xlsx (Excel) atau .csv. File lain tidak didukung.'));
    }
    cb(null, true);
  }
});

// Content sniffing beats the filename: users rename files, and Excel is a ZIP
// container. Anything that is not a known container is treated as CSV.
function detectFormat(buffer) {
  if (buffer.length >= 4 &&
      buffer[0] === 0x50 && buffer[1] === 0x4B &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)) {
    return 'xlsx';
  }
  // Legacy OLE2 compound-file header (.xls, Excel 97-2003)
  if (buffer.length >= 8 && buffer[0] === 0xD0 && buffer[1] === 0xCF &&
      buffer[2] === 0x11 && buffer[3] === 0xE0) {
    return 'xls';
  }
  return 'csv';
}

// RFC4180-style CSV reader. The old implementation was a plain String.split(','),
// which shredded any specification containing a comma and silently shifted the
// quantity column. This one honours quoted fields, doubled quotes, CRLF and BOM.
function parseCsvRows(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  function pushField() { row.push(field); field = ''; }
  function pushRow() { pushField(); rows.push(row); row = []; }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { pushField(); continue; }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      pushRow();
      continue;
    }
    field += ch;
  }
  if (field !== '' || row.length) pushRow();
  return rows;
}

// Both readers produce a dense array of string rows so the header lookup and
// validation below are literally the same code for CSV and Excel.
async function readRows(buffer) {
  const format = detectFormat(buffer);
  if (format === 'xls') {
    return {
      ok: false,
      fatal: 'File .xls (Excel 97-2003) belum didukung. Buka di Excel lalu pilih Save As \u2192 Excel Workbook (.xlsx).'
    };
  }
  if (format === 'xlsx') {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.getWorksheet('Data') ||
      wb.worksheets.find(function (s) { return s.name.toLowerCase() === 'data'; }) ||
      wb.worksheets[0];
    if (!ws) return { ok: false, fatal: 'File Excel tidak berisi worksheet.' };
    const rows = [];
    for (let r = 1; r <= ws.rowCount; r++) {
      rows.push(ws.getRow(r).values.slice(1).map(cellText));
    }
    return { ok: true, format: 'Excel (.xlsx)', rows: rows };
  }
  const rows = parseCsvRows(buffer.toString('utf8'));
  return { ok: true, format: 'CSV', rows: rows };
}

// Single place that re-renders the inventory page, so an import result can be
// shown inline (no redirect) and a rejected upload can reuse the same layout.
function renderInventoryPage(res, extra) {
  res.render('pages/inventory/index', Object.assign({
    alat: dbAll("SELECT * FROM inventory_items WHERE category = 'alat' ORDER BY item_name"),
    part: dbAll("SELECT * FROM inventory_items WHERE category = 'part' ORDER BY item_name"),
    bahan: dbAll("SELECT * FROM inventory_items WHERE category = 'bahan' ORDER BY item_name"),
    importCount: 0
  }, extra || {}));
}

// multer rejects the file in the middleware layer, so a route-level try/catch
// never sees it - without this wrapper a bad extension produced a bare HTTP 500
// with no explanation on screen.
function handleUpload(req, res, next) {
  uploadAny.single('data_file')(req, res, function (err) {
    if (!err) return next();
    let msg;
    if (err.code === 'LIMIT_FILE_SIZE') {
      msg = 'Ukuran file melebihi batas 5 MB.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      msg = 'Field file tidak dikenali.';
    } else {
      msg = err.message || 'Upload gagal.';
    }
    return renderInventoryPage(res, { importResult: { fatal: msg } });
  });
}

// ---------------------------------------------------------------------------
// Excel import helpers
// ---------------------------------------------------------------------------

const REQUIRED_COLUMNS = ['category', 'item_name', 'specification', 'quantity'];
const ALLOWED_CATEGORIES = ['alat', 'part', 'bahan'];
const MAX_IMPORT_ROWS = 2000;
const MAX_NAME_LEN = 200;

// Common wrong spellings accepted and normalised, so a near-miss is not a
// silent rejection. Anything still unmatched is reported back to the user.
const CATEGORY_ALIASES = {
  'peralatan': 'alat', 'tools': 'alat', 'tool': 'alat',
  'sparepart': 'part', 'spareparts': 'part', 'parts': 'part', 'partss': 'part',
  'barang': 'bahan', 'material': 'bahan', 'bahan baku': 'bahan', 'bhn': 'bahan'
};

// exceljs hands back rich-text/formula/date objects for some cells. Flatten
// all of them to a trimmed string so validation sees plain text.
function cellText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map(function (t) { return t.text; }).join('');
    if (value.hyperlink !== undefined && value.text !== undefined) return String(value.text);
    if (value.result !== undefined && value.result !== null) return String(value.result);
    if (value.text !== undefined) return String(value.text);
    return '';
  }
  return String(value).trim();
}

// Quantity is a decimal, max 1 place: "5", "1.3", "0.7". A comma decimal
// separator is accepted because Indonesian Excel writes "1,3".
// Still rejects "1,000" (thousand separator - ambiguous), "5 pcs", "-2", "abc".
function parseQuantity(raw) {
  let s = cellText(raw);
  if (s === '') return { ok: true, value: 0 };

  const comma = /^\d+(\.\d{3})*,(\d+)$/.exec(s);
  if (comma) {
    // Exactly one digit after the comma is a decimal separator (Indonesian
    // Excel writes 1,3). Two or more is a thousands separator, which we refuse
    // rather than guess - "1,000" must not silently become 1.
    if (comma[2].length === 1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      return {
        ok: false,
        reason: 'jumlah "' + cellText(raw) + '" ambigu: pakai titik untuk desimal (mis. 1.3), bukan koma pemisah ribuan'
      };
    }
  } else if (s.indexOf(',') !== -1) {
    return { ok: false, reason: 'jumlah "' + cellText(raw) + '" bukan angka yang valid' };
  }

  if (!/^\d+(\.\d+)?$/.test(s)) {
    return { ok: false, reason: 'jumlah "' + cellText(raw) + '" bukan angka yang valid' };
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return { ok: false, reason: 'jumlah "' + cellText(raw) + '" tidak valid' };

  // Round away binary float dust: 0.1+0.2 style artefacts must not surface.
  const rounded = Math.round(n * 10) / 10;
  if (Math.abs(rounded - n) > 1e-9) {
    return { ok: false, reason: 'jumlah "' + cellText(raw) + '" maksimal 1 angka di belakang koma' };
  }
  return { ok: true, value: rounded };
}

function parseCategory(raw) {
  const s = cellText(raw).toLowerCase().replace(/\s+/g, ' ');
  if (ALLOWED_CATEGORIES.indexOf(s) !== -1) return { ok: true, value: s };
  if (CATEGORY_ALIASES[s]) return { ok: true, value: CATEGORY_ALIASES[s], corrected: true };
  return {
    ok: false,
    reason: 'kategori "' + cellText(raw) + '" tidak dikenal (pilihan: alat, part, bahan)'
  };
}

router.get('/', isAuthenticated, async (req, res) => {
  try {
    renderInventoryPage(res, { importCount: parseInt(req.query.import) || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/download-template', isAuthenticated, async (req, res) => {
  // specifications with commas are quoted so the value survives the round-trip
  const header = 'category,item_name,specification,quantity\r\n';
  const rows = [
    'alat,Kunci Pas 10mm,Kunci pas ukuran 10mm,5',
    'part,Bearing 6204,"Bearing SKF 6204-2RS",2',
    'bahan,Minyak Compressor,"ISO VG 46, 1 L",3'
  ];
  const csv = header + rows.join('\r\n') + '\r\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=template_inventory.csv');
  res.send('\uFEFF' + csv);   // BOM so Excel on Windows opens it as UTF-8
});

router.post('/', isAuthenticated, uploadInv.single('photo'), async (req, res) => {
  try {
    const { category, item_name, specification, quantity } = req.body;
    const photo_url = req.file ? '/uploads/inventory/' + getDateSubdir() + '/' + req.file.filename : null;
    const existing = dbGet('SELECT * FROM inventory_items WHERE item_name = ? AND category = ?', [item_name, category]);
    const qty = parseQuantity(quantity);
    if (!qty.ok) return res.status(400).send('Jumlah tidak valid: ' + qty.reason);

    if (existing) {
      let upd = 'UPDATE inventory_items SET quantity = quantity + ?';
      const params = [qty.value];
      if (photo_url) { upd += ', photo_url = ?'; params.push(photo_url); }
      upd += ' WHERE id = ?';
      params.push(existing.id);
      dbRun(upd, params);
    } else {
      dbRun('INSERT INTO inventory_items (category, item_name, specification, quantity, photo_url) VALUES (?, ?, ?, ?, ?)',
        [category, item_name, specification, qty.value, photo_url]);
    }
    res.redirect('/inventory');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// The old /import-csv route is gone. It split on a bare ',' and `continue`d on
// any bad row without a word, so a specification containing a comma shifted the
// quantity column and stored the wrong number silently. POST /import handles CSV
// and Excel through one validator.

router.get('/download-template-excel', isAuthenticated, async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Utility Management';
    wb.created = new Date();

    // --- Sheet 1: Data ---------------------------------------------------
    const ws = wb.addWorksheet('Data');
    ws.columns = [
      { header: 'category', key: 'category', width: 16 },
      { header: 'item_name', key: 'item_name', width: 30 },
      { header: 'specification', key: 'specification', width: 40 },
      { header: 'quantity', key: 'quantity', width: 12 }
    ];
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3C72' } };
    head.alignment = { vertical: 'middle' };
    head.height = 22;
    // Up to one decimal place, and no thousand separator - this is what stops
    // Excel turning 1500 into "1.500" on an Indonesian locale.
    ws.getColumn('quantity').numFmt = '0.0';

    // Example rows - these are real, valid examples of each category.
    ws.addRow({ category: 'alat', item_name: 'Kunci Pas 10mm', specification: 'Kunci pas ukuran 10mm', quantity: 5 });
    ws.addRow({ category: 'part', item_name: 'Bearing 6204', specification: 'Bearing SKF 6204-2RS', quantity: 2 });
    ws.addRow({ category: 'bahan', item_name: 'Minyak Compressor', specification: 'ISO VG 46, 1 L', quantity: 3 });
    ws.addRow({ category: 'bahan', item_name: 'Minyak Hydraulic', specification: 'ISO VG 68', quantity: 1.3 });

    ws.getRow(2).eachCell(function (c) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF4EA' } }; });
    ws.getRow(3).eachCell(function (c) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF4EA' } }; });
    ws.getRow(4).eachCell(function (c) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF4EA' } }; });

    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: 'A1', to: 'D1' };

    // --- Sheet 2: Panduan -----------------------------------------------
    const g = wb.addWorksheet('Panduan');
    g.columns = [
      { key: 'a', width: 24 },
      { key: 'b', width: 44 },
      { key: 'c', width: 40 }
    ];
    const title = g.addRow(['PANDUAN IMPORT EXCEL - ALAT & BAHAN']);
    title.font = { bold: true, size: 14, color: { argb: 'FF1E3C72' } };
    g.mergeCells('A1:C1');

    const put = function (cells, opts) {
      const r = g.addRow(cells);
      if (opts && opts.bold) r.font = { bold: true };
      if (opts && opts.fill) {
        r.eachCell(function (c) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } }; });
      }
      return r;
    };

    put(['Isi data pada sheet "Data"', '', ''], { bold: true, fill: 'FFD9E2F3' });
    put(['1', 'Hapus 3 baris contoh (baris 2-4) sebelum mengisi data asli.', '']);
    put(['2', 'Jangan mengubah, menghapus, atau mengetik ulang nama kolom di baris 1.', '']);
    put(['3', 'Urutan kolom bebas, sistem membaca berdasarkan nama kolom.', '']);
    put(['4', 'Baris kosong otomatis dilewati.', '']);
    put(['5', 'Maksimal ' + MAX_IMPORT_ROWS + ' baris per file.', '']);
    put(['', '', '']);

    put(['Kolom', 'Isi yang benar', 'Contoh salah (ditolak)'], { bold: true, fill: 'FFD9E2F3' });
    put(['category', 'alat / part / bahan (tidak_case-sensitive)', 'Alat, PERALATAN, spare, "alat," (ada koma)']);
    put(['item_name', 'Nama barang, wajib diisi, maksimal ' + MAX_NAME_LEN + ' karakter', '(kosong), spasi saja']);
    put(['specification', 'Teks bebas, boleh dikosongkan', '-']);
    put(['quantity', 'Angka >= 0, boleh desimal maksimal 1 angka di belakang koma. Boleh kosong = 0', '1,000 / 5 pcs / -2 / 1.25 / abc']);
    put(['', '', '']);

    put(['Contoh input BENAR', '', ''], { bold: true, fill: 'FFE2EFDA' });
    put(['alat | Kunci Pas 10mm | Kunci pas ukuran 10mm | 5', '', '']);
    put(['part | Bearing 6204 | Bearing SKF 6204-2RS | 2', '', '']);
    put(['bahan | Minyak Compressor | ISO VG 46, 1 L | 3', '', '']);
    put(['bahan | Minyak Hydraulic | ISO VG 68 | 1.3', '', '']);
    put(['bahan | Cat Epoksi | Aduk 1 kg | 0.7', '', '']);
    put(['', '', '']);

    put(['Contoh input SALAH', '', ''], { bold: true, fill: 'FFFCE4E4' });
    put(['alat | Kunci Pas | | 1,000', '', ''], { fill: 'FFFCE4E4' });
    put(['peralatan | Tangga Lipat | Aluminium 3 meter | 1', '', '']);
    put(['part | Bearing | | 1.25', '', ''], { fill: 'FFFCE4E4' });
    put(['', '', '']);

    put(['Perilaku import', '', ''], { bold: true, fill: 'FFD9E2F3' });
    put(['Item dengan kategori + nama yang sudah ada akan DIPERBARUI (spesifikasi & jumlah diganti), bukan digandakan.', '', '']);
    put(['Item yang belum ada akan DITAMBAHKAN sebagai baris baru.', '', '']);
    put(['Import bisa diulang berkali-kali dengan hasil akhir yang sama.', '', '']);
    put(['Baris gagal tidak membuat data parsial - hanya baris yang lolos validasi yang disimpan.', '', '']);

    // Build the workbook in memory first. Piping wb.xlsx.write() straight into
    // the Express response truncates the download - the stream ends before
    // exceljs has flushed the final zip chunk.
    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template_inventory.xlsx"');
    res.setHeader('Content-Length', buf.byteLength);
    res.end(Buffer.from(buf));
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal membuat template');
  }
});

// Header lookup is forgiving: if someone typed a title above the header row,
// scan the first 10 rows instead of failing outright. Works on the plain row
// arrays produced by both readers, so CSV and Excel behave identically.
function locateHeaderRow(rows) {
  const limit = Math.min(rows.length, 10);
  for (let r = 0; r < limit; r++) {
    const map = {};
    const cells = rows[r] || [];
    for (let c = 0; c < cells.length; c++) {
      const key = cellText(cells[c]).toLowerCase().replace(/\s+/g, ' ').replace(/^\uFEFF/, '');
      if (key) map[key] = c;
    }
    const missing = REQUIRED_COLUMNS.filter(function (col) { return map[col] === undefined; });
    if (!missing.length) return { index: r, map: map };
  }
  return null;
}

// One import endpoint for both CSV and Excel.
router.post('/import', isAuthenticated, handleUpload, async (req, res) => {
  const renderWith = function (result) {
    renderInventoryPage(res, { importResult: result });
  };

  try {
    if (!req.file) {
      return renderWith({ fatal: 'File tidak ditemukan. Pilih file .xlsx atau .csv lalu tekan Import.' });
    }

    const read = await readRows(req.file.buffer);
    if (!read.ok) return renderWith({ fatal: read.fatal });

    const found = locateHeaderRow(read.rows);
    if (!found) {
      return renderWith({
        fatal: 'Baris judul kolom tidak ditemukan. Pastikan ada baris yang memuat keempat nama kolom: ' +
               REQUIRED_COLUMNS.join(', ') + '. Jangan mengubah ejaan/nama kolom.'
      });
    }

    const { index: headerIndex, map } = found;
    const errors = [];
    let added = 0;
    let updated = 0;

    for (let r = headerIndex + 1; r < read.rows.length; r++) {
      if (errors.length >= 100) break;   // cap the report so the page stays usable
      const rowNo = r + 1;              // 1-based, matches what Excel shows
      const cells = read.rows[r] || [];

      const rawCategory = cells[map.category];
      const rawName = cells[map.item_name];
      const rawSpec = cells[map.specification];
      const rawQty = cells[map.quantity];

      // A row where every data cell is blank is just padding - skip silently.
      if (!cellText(rawCategory) && !cellText(rawName) && !cellText(rawSpec) && !cellText(rawQty)) continue;

      const cat = parseCategory(rawCategory);
      if (!cat.ok) { errors.push({ row: rowNo, reason: cat.reason }); continue; }

      const itemName = cellText(rawName);
      if (!itemName) { errors.push({ row: rowNo, reason: 'item_name kosong' }); continue; }
      if (itemName.length > MAX_NAME_LEN) {
        errors.push({ row: rowNo, reason: 'item_name lebih dari ' + MAX_NAME_LEN + ' karakter' });
        continue;
      }

      const qty = parseQuantity(rawQty);
      if (!qty.ok) { errors.push({ row: rowNo, reason: qty.reason }); continue; }

      const spec = cellText(rawSpec).slice(0, 1000);

      const existing = dbGet(
        'SELECT id FROM inventory_items WHERE item_name = ? AND category = ?',
        [itemName, cat.value]
      );
      if (existing) {
        dbRun(
          'UPDATE inventory_items SET specification = ?, quantity = ?, updated_at = datetime(\'now\') WHERE id = ?',
          [spec, qty.value, existing.id]
        );
        updated++;
      } else {
        dbRun(
          'INSERT INTO inventory_items (category, item_name, specification, quantity) VALUES (?, ?, ?, ?)',
          [cat.value, itemName, spec, qty.value]
        );
        added++;
      }
    }

    const total = added + updated;
    renderWith({
      added: added,
      updated: updated,
      errors: errors,
      truncated: errors.length >= 100,
      format: read.format,
      fatal: total === 0 && errors.length === 0
        ? 'Tidak ada baris data yang terbaca. Pastikan file sudah berisi data di bawah baris judul kolom.'
        : null
    });
  } catch (err) {
    console.error(err);
    renderWith({
      fatal: 'File tidak bisa dibaca. Pastikan file .xlsx/.csv tidak rusak, dan file .xlsx bukan hasil ' +
             'Save As dari Excel versi lama. (' + (err && err.message ? err.message : 'unknown') + ')'
    });
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
    const qty = parseQuantity(quantity);
    if (!qty.ok) return res.status(400).send('Jumlah tidak valid: ' + qty.reason);
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
        [item_name, specification, qty.value, photo_url, parseInt(id)]);
    } else {
      dbRun('UPDATE inventory_items SET item_name=?, specification=?, quantity=? WHERE id=?',
        [item_name, specification, qty.value, parseInt(id)]);
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
