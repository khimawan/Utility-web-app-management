const bcrypt = require('bcryptjs');

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
  next();
}

module.exports = { isAuthenticated, isAdmin, setLocals };
