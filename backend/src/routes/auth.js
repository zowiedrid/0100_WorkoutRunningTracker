const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sha256, signAccess, issueRefresh, requireAuth } = require('../auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function tokenResponse(user) {
  return {
    accessToken: signAccess(user),
    refreshToken: await issueRefresh(user.id),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Nama minimal 2 karakter' });
  if (!EMAIL_RE.test(email || '')) return res.status(400).json({ error: 'Format email tidak valid' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Kata sandi minimal 8 karakter' });
  const [dup] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (dup.length) return res.status(409).json({ error: 'Email sudah terdaftar' });
  const hash = await bcrypt.hash(password, 10);
  const [r] = await db.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name.trim(), email, hash]);
  const user = { id: r.insertId, name: name.trim(), email, role: 'user' };
  res.status(201).json(await tokenResponse(user));
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email || '']);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password || '', u.password_hash))) {
    return res.status(401).json({ error: 'Email atau kata sandi salah' });
  }
  res.json(await tokenResponse(u));
});

// Refresh Token dengan rotasi: token lama dicabut, token baru diterbitkan
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken wajib diisi' });
  const h = sha256(refreshToken);
  const [rows] = await db.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > NOW()', [h]);
  if (!rows.length) return res.status(401).json({ error: 'Refresh token tidak valid' });
  await db.query('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', [rows[0].id]);
  const [us] = await db.query('SELECT * FROM users WHERE id = ?', [rows[0].user_id]);
  if (!us.length) return res.status(401).json({ error: 'Pengguna tidak ditemukan' });
  res.json(await tokenResponse(us[0]));
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await db.query('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?', [sha256(refreshToken)]);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
  res.json(rows[0]);
});

module.exports = router;
