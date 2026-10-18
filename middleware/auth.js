const bcrypt = require('bcryptjs');

/**
 * Display a stock quantity without a pointless trailing ".0".
 * quantity is REAL so 1.3 L and 0.7 kg are possible; but 0 should read "0",
 * not "0.0", and 5 should read "5", not "5.0".
 */
function fmtQty(value) {
  if (value === null || value === undefined || value === '') return '0';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  // Clean up float dust (0.30000000000000004 -> 0.3) but only when the value is
  // genuinely close to 1 decimal - a real 12.04 must not be shown as "12".
  const rounded = Math.round(n * 10) / 10;
  if (Math.abs(rounded - n) < 1e-9) return String(rounded);
  return String(n);
}

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.position === 'admin') {
    return next();
  }
  res.status(403).send('Akses ditolak. Hanya admin yang dapat mengakses halaman ini.');
}

function setLocals(req, res, next) {
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.user && req.session.user.position === 'admin';
  res.locals.fmtQty = fmtQty;
  next();
}

module.exports = { isAuthenticated, isAdmin, setLocals, fmtQty };
