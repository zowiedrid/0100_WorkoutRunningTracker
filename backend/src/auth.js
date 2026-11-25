const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-secret-ganti-di-produksi';
const ACCESS_TTL = process.env.ACCESS_TTL || '15m';
const REFRESH_DAYS = Number(process.env.REFRESH_DAYS || 30);

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function signAccess(user) {
  return jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: ACCESS_TTL });
}

async function issueRefresh(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  const expires = new Date(Date.now() + REFRESH_DAYS * 86400 * 1000);
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, sha256(token), expires]
  );
  return token;
}

// Middleware: wajib login (Access Token JWT di header Authorization: Bearer ...)
function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' });
  try {
    const p = jwt.verify(token, SECRET);
    req.user = { id: p.sub, role: p.role };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' });
  }
}

// Middleware: otorisasi berbasis peran
const requireRole = (role) => (req, res, next) =>
  req.user && req.user.role === role
    ? next()
    : res.status(403).json({ error: 'Akses ditolak untuk peran ini' });

module.exports = { sha256, signAccess, issueRefresh, requireAuth, requireRole };
