
'use strict';

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);

// Di Render, atur DATA_DIR=/var/data.
// Di komputer lokal, data disimpan di folder proyek.
const DATA_DIR = path.resolve(
  process.env.DATA_DIR || path.join(ROOT, 'data')
);
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'site-settings.json');

const TYPES = ['berita', 'pengumuman', 'galeri', 'guru', 'prestasi'];

const DEFAULT_CONTENT = {
  berita: [],
  pengumuman: [],
  galeri: [],
  guru: [],
  prestasi: []
};

const DEFAULT_SETTINGS = {
  hero1: '',
  hero2: '',
  hero3: '',
  principalPhoto: '',
  principalName: '',
  principalGreeting: '',
  heroTitle: '',
  heroSubtitle: ''
};

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD)
) {
  console.error(
    'Konfigurasi keamanan gagal: ADMIN_USER dan ADMIN_PASSWORD wajib diisi.'
  );
  process.exit(1);
}

if (ADMIN_PASSWORD && ADMIN_PASSWORD.length < 12) {
  console.error('ADMIN_PASSWORD harus minimal 12 karakter.');
  process.exit(1);
}

if (!ADMIN_PASSWORD) {
  console.warn(
    'PERINGATAN: password admin belum dikonfigurasi. ' +
    'Atur ADMIN_PASSWORD sebelum menggunakan CMS secara online.'
  );
}

// Buat folder dan file data apabila belum tersedia.
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

if (!fs.existsSync(CONTENT_FILE)) {
  fs.writeFileSync(
    CONTENT_FILE,
    JSON.stringify(DEFAULT_CONTENT, null, 2),
    'utf8'
  );
}

if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify(DEFAULT_SETTINGS, null, 2),
    'utf8'
  );
}

// Membaca data dan memastikan struktur dasarnya tersedia.
function readContent() {
  const parsed = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Struktur content.json tidak valid.');
  }

  const result = { ...DEFAULT_CONTENT, ...parsed };

  for (const type of TYPES) {
    if (!Array.isArray(result[type])) {
      throw new Error(`Data ${type} bukan array yang valid.`);
    }
  }

  return result;
}

function readSettings() {
  const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Struktur site-settings.json tidak valid.');
  }

  return { ...DEFAULT_SETTINGS, ...parsed };
}

// Penyimpanan atomik untuk mengurangi risiko file terpotong.
function writeJSON(file, value) {
  const tempFile = `${file}.${crypto.randomUUID()}.tmp`;

  try {
    fs.writeFileSync(tempFile, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(tempFile, file);
  } catch (error) {
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch (_) {}

    throw error;
  }
}

function saveContent(data) {
  writeJSON(CONTENT_FILE, data);
}

function saveSettings(data) {
  writeJSON(SETTINGS_FILE, data);
}

// Cookie parser yang tidak membuat server crash jika cookie tidak valid.
function cookies(req) {
  const result = {};
  const header = req.headers.cookie || '';

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;

    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    try {
      result[name] = decodeURIComponent(value);
    } catch (_) {
      // Abaikan cookie yang formatnya tidak valid.
    }
  }

  return result;
}

// Sesi login sementara disimpan di memori server.
const sessions = new Map();
const loginAttempts = new Map();

const SESSION_DURATION = 8 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000;

function getSession(req) {
  const token = cookies(req).cms_session;
  if (!token) return null;

  const current = sessions.get(token);
  if (!current) return null;

  if (Date.now() > current.expires) {
    sessions.delete(token);
    return null;
  }

  return current;
}

function auth(req, res, next) {
  if (!getSession(req)) {
    return res.status(401).json({
      error: 'Sesi login berakhir. Silakan login kembali.'
    });
  }

  next();
}

// Pemeriksaan asal permintaan untuk mencegah CSRF.
app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;

  if (!origin) {
    return res.status(403).json({
      error: 'Asal permintaan tidak dapat diverifikasi.'
    });
  }

  try {
    if (new URL(origin).host !== req.headers.host) {
      return res.status(403).json({
        error: 'Permintaan harus berasal dari website ini.'
      });
    }
  } catch (_) {
    return res.status(403).json({
      error: 'Header origin tidak valid.'
    });
  }

  next();
});

app.use(express.json({ limit: '100kb' }));

// Gambar yang sudah diunggah dapat dibaca website publik.
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    dotfiles: 'deny',
    index: false,
    fallthrough: false,
    maxAge: '1d'
  })
);

// Login admin.
app.post('/api/login', (req, res) => {
  const ip = req.ip;
  const attempt = loginAttempts.get(ip) || {
    count: 0,
    lockedUntil: 0
  };

  if (Date.now() < attempt.lockedUntil) {
    return res.status(429).json({
      error: 'Terlalu banyak percobaan login. Coba lagi nanti.'
    });
  }

  const username = String(req.body?.username || '');
  const password = String(req.body?.password || '');

  const hash = value =>
    crypto.createHash('sha256').update(value, 'utf8').digest();

  const usernameOK = crypto.timingSafeEqual(
    hash(username),
    hash(ADMIN_USER)
  );

  const passwordOK = ADMIN_PASSWORD
    ? crypto.timingSafeEqual(hash(password), hash(ADMIN_PASSWORD))
    : false;

  if (!usernameOK || !passwordOK) {
    attempt.count += 1;

    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
      attempt.lockedUntil = Date.now() + LOCK_DURATION;
      attempt.count = 0;
    }

    loginAttempts.set(ip, attempt);

    return res.status(401).json({
      error: 'Username atau password salah.'
    });
  }

  loginAttempts.delete(ip);

  const token = crypto.randomBytes(32).toString('hex');

  sessions.set(token, {
    expires: Date.now() + SESSION_DURATION
  });

  res.cookie('cms_session', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DURATION,
    path: '/'
  });

  res.json({ ok: true });
});

// Status login.
app.get('/api/me', (req, res) => {
  res.json({ authenticated: !!getSession(req) });
});

// Logout admin.
app.post('/api/logout', auth, (req, res) => {
  const token = cookies(req).cms_session;

  if (token) sessions.delete(token);

  res.clearCookie('cms_session', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });

  res.json({ ok: true });
});

// Pengaturan website.
app.get('/api/settings', (req, res, next) => {
  try {
    res.json(readSettings());
  } catch (error) {
    next(error);
  }
});

app.post('/api/settings', auth, (req, res, next) => {
  try {
    const nextSettings = readSettings();

    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (!(key in req.body)) continue;

      if (typeof req.body[key] !== 'string') {
        return res.status(400).json({
          error: `Format pengaturan ${key} tidak valid.`
        });
      }

      const value = req.body[key].trim();

      if (
        ['hero1', 'hero2', 'hero3', 'principalPhoto'].includes(key)
      ) {
        if (value && !/^\/uploads\/[a-zA-Z0-9._-]+$/.test(value)) {
          return res.status(400).json({
            error: 'Gambar harus diunggah melalui panel admin.'
          });
        }
      } else if (value.length > 1500) {
        return res.status(400).json({
          error: `Teks pengaturan ${key} terlalu panjang.`
        });
      }

      nextSettings[key] = value;
    }

    saveSettings(nextSettings);
    res.json(nextSettings);
  } catch (error) {
    next(error);
  }
});

// Mengambil konten publik atau seluruh konten untuk admin yang login.
app.get('/api/content/:type', (req, res, next) => {
  try {
    const type = req.params.type;

    if (!TYPES.includes(type)) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    }

    const data = readContent();
    const items = data[type];

    if (getSession(req)) {
      return res.json(items);
    }

    res.json(
      items
        .filter(item => item.published === true)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    );
  } catch (error) {
    next(error);
  }
});

// Menambah atau memperbarui berita, pengumuman, galeri, guru, prestasi.
app.post('/api/content/:type', auth, (req, res, next) => {
  try {
    const type = req.params.type;

    if (!TYPES.includes(type)) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    }

    const body = req.body || {};

    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const category = String(body.category || '').trim();
    const content = String(body.content || '').trim();
    const date = String(body.date || '').trim();
    const image = String(body.image || '').trim();

    if (
      !title ||
      title.length > 180 ||
      description.length > 2000 ||
      category.length > 70 ||
      content.length > 20000 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      (image && !/^\/uploads\/[a-zA-Z0-9._-]+$/.test(image))
    ) {
      return res.status(400).json({
        error: 'Data tidak valid. Periksa seluruh kolom.'
      });
    }

    const data = readContent();
    const existingIndex = body.id
      ? data[type].findIndex(item => item.id === body.id)
      : -1;

    const item = {
      id:
        existingIndex >= 0
          ? data[type][existingIndex].id
          : crypto.randomUUID(),
      title,
      description,
      category,
      content,
      date,
      image,
      published: body.published === true
    };

    if (existingIndex >= 0) {
      data[type][existingIndex] = item;
    } else {
      data[type].push(item);
    }

    saveContent(data);
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// Menghapus konten.
app.delete('/api/content/:type/:id', auth, (req, res, next) => {
  try {
    const type = req.params.type;

    if (!TYPES.includes(type)) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    }

    const data = readContent();
    const oldLength = data[type].length;

    data[type] = data[type].filter(
      item => item.id !== req.params.id
    );

    if (data[type].length === oldLength) {
      return res.status(404).json({ error: 'Konten tidak ditemukan.' });
    }

    saveContent(data);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Konfigurasi upload foto.
const ALLOWED_IMAGES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, UPLOAD_DIR);
  },
  filename: (req, file, callback) => {
    callback(
      null,
      `${crypto.randomUUID()}${ALLOWED_IMAGES[file.mimetype]}`
    );
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 4 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_IMAGES[file.mimetype]) {
      return callback(
        new Error('Gunakan gambar JPG, PNG, WEBP, atau GIF.')
      );
    }

    callback(null, true);
  }
});

function isValidImage(filePath) {
  const file = fs.readFileSync(filePath);

  const jpeg =
    file.length >= 3 &&
    file.subarray(0, 3).toString('hex') === 'ffd8ff';

  const png =
    file.length >= 8 &&
    file.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';

  const webp =
    file.length >= 12 &&
    file.subarray(0, 4).toString() === 'RIFF' &&
    file.subarray(8, 12).toString() === 'WEBP';

  const gif =
    file.length >= 6 &&
    ['GIF87a', 'GIF89a'].includes(file.subarray(0, 6).toString());

  return jpeg || png || webp || gif;
}

// Upload hanya boleh dilakukan admin.
app.post('/api/upload', auth, (req, res, next) => {
  upload.single('image')(req, res, error => {
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Pilih file JPG, PNG, WEBP, atau GIF.'
      });
    }

    try {
      if (!isValidImage(req.file.path)) {
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          error: 'Isi berkas bukan gambar yang valid.'
        });
      }

      res.json({
        url: `/uploads/${req.file.filename}`
      });
    } catch (uploadError) {
      next(uploadError);
    }
  });
});

// Jangan izinkan akses publik ke file internal aplikasi.
app.use((req, res, next) => {
  const pathname = decodeURI(req.path);
  const lower = pathname.toLowerCase();

  if (
    lower === '/server.js' ||
    lower === '/package.json' ||
    lower === '/package-lock.json' ||
    lower === '/readme.md' ||
    lower === '/.env' ||
    lower.startsWith('/.git/') ||
    lower.startsWith('/data/') ||
    lower.startsWith('/node_modules/') ||
    lower.endsWith('.map')
  ) {
    return res.sendStatus(404);
  }

  next();
});

// File HTML, CSS, JS, logo, dan aset website publik.
app.use(
  express.static(ROOT, {
    index: 'index.html',
    dotfiles: 'deny',
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.json')) {
        res.setHeader('Cache-Control', 'no-store');
      }
    }
  })
);

app.use((req, res) => {
  res.status(404).send('Halaman tidak ditemukan.');
});

// Penanganan error agar server tidak membeberkan detail internal.
app.use((error, req, res, next) => {
  console.error('Kesalahan server:', error.message);

  if (res.headersSent) return next(error);

  res.status(500).json({
    error: 'Terjadi kesalahan pada server. Silakan coba lagi.'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CMS SDI Dewi Masyithoh berjalan pada port ${PORT}`);
  console.log(`Direktori data: ${DATA_DIR}`);
});
