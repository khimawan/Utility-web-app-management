const express = require('express');
const router = express.Router();
const { getDb, dbAll, dbGet, dbRun } = require('../config/database');
const { hashPassword, verifyPassword } = require('../config/password');
const rateLimit = require('../middleware/rateLimit');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Throttle before touching the database so brute force costs as little as possible.
  const gate = rateLimit.inspect(req, username);
  if (gate.blocked) {
    res.set('Retry-After', String(gate.retryAfterSeconds));
    return res.status(429).render('auth/login', {
      error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(gate.retryAfterSeconds / 60)} menit.`
    });
  }

  try {
    const user = dbGet('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    if (!user) {
      rateLimit.recordFailure(req, username);
      return res.render('auth/login', { error: 'Username atau password salah' });
    }
    const { ok, needsRehash } = verifyPassword(user.password, password);
    if (!ok) {
      rateLimit.recordFailure(req, username);
      return res.render('auth/login', { error: 'Username atau password salah' });
    }
    rateLimit.recordSuccess(req, username);
    // Legacy plaintext row: now that the password is known good, upgrade it.
    if (needsRehash) {
      try {
        dbRun('UPDATE users SET password = ? WHERE id = ?', [hashPassword(password), user.id]);
        console.log(`Upgraded password hash for user: ${user.username}`);
      } catch (e) {
        console.error('Password hash upgrade failed:', e);
      }
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
