const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getDb, saveDb } = require('./config/database');
const { setLocals } = require('./middleware/auth');

const app = express();
const PORT = 3000;

// Session secret must come from the environment. A hardcoded secret that is
// also committed to git lets anyone forge an admin session cookie.
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET is not set — generated a random secret for this process.');
  console.warn('WARNING: all sessions will be invalidated on restart. Set SESSION_SECRET in .env');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Traffic arrives via the cloudflared container, so without this every request
// looks like it comes from the tunnel's own IP and per-client rate limiting
// would treat all visitors as one caller.
app.set('trust proxy', true);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(setLocals);

app.use('/utility', require('./routes/utility'));
app.use('/', require('./routes/auth'));
app.use('/awal', require('./routes/awal'));
app.use('/awal/spareparts', require('./routes/sparepart'));
app.use('/awal/member', require('./routes/member'));
app.use('/job1', require('./routes/job1'));
app.use('/job2', require('./routes/job2'));
app.use('/job3', require('./routes/job3'));
app.use('/inventory', require('./routes/inventory'));
app.use('/peminjaman', require('./routes/peminjaman'));
app.use('/pemakaian', require('./routes/pemakaian'));
app.use('/rangkuman', require('./routes/rangkuman'));
app.use('/admin', require('./routes/admin'));

app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.redirect('/awal');
});

// Global error handler for multer and other errors
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).send('<script>alert("File terlalu besar! Maksimal 50MB.");window.history.back();</script>');
  }
  if (err.message && err.message.includes('diizinkan')) {
    return res.status(400).send('<script>alert("' + err.message + '");window.history.back();</script>');
  }
  res.status(500).send('Server Error: ' + err.message);
});

// Save DB periodically
setInterval(() => { saveDb(); }, 30000);

// Graceful shutdown
process.on('SIGINT', () => { saveDb(); process.exit(0); });
process.on('SIGTERM', () => { saveDb(); process.exit(0); });

async function start() {
  await getDb();
  console.log('Database initialized');
  const uploadDirs = ['works', 'utility_requests', 'photos', 'checklist'];
  uploadDirs.forEach(dir => {
    const p = path.join(__dirname, 'public', 'uploads', dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
