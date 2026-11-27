const router = require('express').Router();
const db = require('../db');

const DISTANCES = ['5K', '10K', '21K', '42K'];
const KM = { '5K': 5, '10K': 10, '21K': 21.0975, '42K': 42.195 };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const map = (r) => ({
  id: r.id, distance: r.distance, durationSeconds: r.duration_seconds, runDate: r.run_date, notes: r.notes,
  paceSecondsPerKm: Math.round(r.duration_seconds / KM[r.distance]),
});

function validate(b) {
  if (!DISTANCES.includes(b.distance)) return 'Jarak harus 5K, 10K, 21K, atau 42K';
  if (!Number.isInteger(b.durationSeconds) || b.durationSeconds < 300 || b.durationSeconds > 86400) return 'Durasi tidak masuk akal (5 menit - 24 jam)';
  if (!DATE_RE.test(b.runDate || '')) return 'Tanggal harus format yyyy-MM-dd';
  return null;
}

router.get('/', async (req, res) => {
  const { distance, q } = req.query;
  const where = ['user_id = ?']; const args = [req.user.id];
  if (distance && DISTANCES.includes(distance)) { where.push('distance = ?'); args.push(distance); }
  if (q) { where.push('notes LIKE ?'); args.push(`%${q}%`); }
  const [rows] = await db.query(`SELECT * FROM run_records WHERE ${where.join(' AND ')} ORDER BY run_date DESC, id DESC`, args);
  res.json(rows.map(map));
});

// PB per jarak: catatan waktu tercepat untuk masing-masing 5K/10K/21K/42K
router.get('/best', async (req, res) => {
  const [rows] = await db.query(
    `SELECT r.* FROM run_records r
      WHERE r.user_id = ? AND r.duration_seconds = (SELECT MIN(duration_seconds) FROM run_records WHERE user_id = r.user_id AND distance = r.distance)
      ORDER BY FIELD(r.distance,'5K','10K','21K','42K'), r.run_date`, [req.user.id]);
  const best = {};
  for (const r of rows) if (!best[r.distance]) best[r.distance] = map(r);
  res.json(DISTANCES.map((d) => best[d] || { distance: d, durationSeconds: null }));
});

router.post('/', async (req, res) => {
  const err = validate(req.body || {}); if (err) return res.status(400).json({ error: err });
  const { distance, durationSeconds, runDate, notes } = req.body;
  const [prev] = await db.query('SELECT MIN(duration_seconds) AS best FROM run_records WHERE user_id=? AND distance=?', [req.user.id, distance]);
  const [r] = await db.query('INSERT INTO run_records (user_id, distance, duration_seconds, run_date, notes) VALUES (?,?,?,?,?)',
    [req.user.id, distance, durationSeconds, runDate, notes || null]);
  const isPb = prev[0].best === null || durationSeconds < prev[0].best;
  res.status(201).json({ ...map({ id: r.insertId, distance, duration_seconds: durationSeconds, run_date: runDate, notes: notes || null }), newPersonalBest: isPb });
});

router.put('/:id', async (req, res) => {
  const err = validate(req.body || {}); if (err) return res.status(400).json({ error: err });
  const { distance, durationSeconds, runDate, notes } = req.body;
  const [r] = await db.query('UPDATE run_records SET distance=?, duration_seconds=?, run_date=?, notes=? WHERE id=? AND user_id=?',
    [distance, durationSeconds, runDate, notes || null, req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Catatan lari tidak ditemukan' });
  res.json(map({ id: Number(req.params.id), distance, duration_seconds: durationSeconds, run_date: runDate, notes: notes || null }));
});

router.delete('/:id', async (req, res) => {
  const [r] = await db.query('DELETE FROM run_records WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Catatan lari tidak ditemukan' });
  res.json({ ok: true });
});

module.exports = router;
