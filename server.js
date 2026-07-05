const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { getDb, saveDb } = require('./config/database');
const { setLocals } = require('./middleware/auth');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'utility-management-secret-key-2024',
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
  const uploadsDir = path.join(__dirname, 'public', 'uploads', 'works');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const utilityDir = path.join(__dirname, 'public', 'uploads', 'utility_requests');
  if (!fs.existsSync(utilityDir)) fs.mkdirSync(utilityDir, { recursive: true });
  const photosDir = path.join(__dirname, 'public', 'uploads', 'photos');
  if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
