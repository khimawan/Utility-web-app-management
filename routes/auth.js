const express = require('express');
const router = express.Router();
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = dbGet('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    if (!user) {
      return res.render('auth/login', { error: 'Username atau password salah' });
    }
    if (user.password !== password) {
      return res.render('auth/login', { error: 'Username atau password salah' });
    }
    req.session.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      position: user.position,
      job: user.job
    };
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('auth/login', { error: 'Terjadi kesalahan server' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
