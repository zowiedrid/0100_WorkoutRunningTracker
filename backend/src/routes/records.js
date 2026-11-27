const router = require('express').Router();
const db = require('../db');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SELECT = `SELECT pr.id, pr.exercise_id AS exerciseId, e.name AS exerciseName, e.muscle_group AS muscleGroup, e.split,
                       pr.weight_kg AS weightKg, pr.reps, pr.sets, pr.achieved_at AS achievedAt
                  FROM personal_records pr JOIN exercises e ON e.id = pr.exercise_id`;

function validate(b) {
  if (!Number.isInteger(b.exerciseId)) return 'exerciseId wajib diisi';
  if (typeof b.weightKg !== 'number' || b.weightKg <= 0 || b.weightKg > 1000) return 'Beban harus lebih dari 0 dan maksimal 1000 kg';
  if (!Number.isInteger(b.reps) || b.reps < 1 || b.reps > 200) return 'Rep harus 1-200';
  if (!Number.isInteger(b.sets) || b.sets < 1 || b.sets > 50) return 'Set harus 1-50';
  if (!DATE_RE.test(b.achievedAt || '')) return 'Tanggal harus format yyyy-MM-dd';
  return null;
}

router.get('/', async (req, res) => {
  const { q, split } = req.query;
  const where = ['pr.user_id = ?']; const args = [req.user.id];
  if (q) { where.push('e.name LIKE ?'); args.push(`%${q}%`); }
  if (split) { where.push('e.split = ?'); args.push(split); }
  const [rows] = await db.query(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY e.split, e.name`, args);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [rows] = await db.query(`${SELECT} WHERE pr.id = ? AND pr.user_id = ?`, [req.params.id, req.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'Rekor tidak ditemukan' });
  // Riwayat beban tertinggi per sesi untuk grafik
  const [hist] = await db.query(
    `SELECT s.session_date AS date, MAX(ss.weight_kg) AS topWeightKg, SUM(ss.weight_kg*ss.reps) AS volumeKg, COUNT(*) AS sets
       FROM session_sets ss JOIN workout_sessions s ON s.id = ss.session_id
      WHERE s.user_id = ? AND ss.exercise_id = ? GROUP BY s.id, s.session_date ORDER BY s.session_date DESC LIMIT 6`,
    [req.user.id, rows[0].exerciseId]);
  res.json({ ...rows[0], history: hist.reverse() });
});

router.post('/', async (req, res) => {
  const err = validate(req.body || {}); if (err) return res.status(400).json({ error: err });
  const { exerciseId, weightKg, reps, sets, achievedAt } = req.body;
  const [ex] = await db.query('SELECT id FROM exercises WHERE id = ? AND (owner_id IS NULL OR owner_id = ?)', [exerciseId, req.user.id]);
  if (!ex.length) return res.status(404).json({ error: 'Gerakan tidak ditemukan' });
  const [dup] = await db.query('SELECT id FROM personal_records WHERE user_id=? AND exercise_id=?', [req.user.id, exerciseId]);
  if (dup.length) return res.status(409).json({ error: 'Rekor untuk gerakan ini sudah ada, gunakan edit' });
  const [r] = await db.query('INSERT INTO personal_records (user_id, exercise_id, weight_kg, reps, sets, achieved_at) VALUES (?,?,?,?,?,?)',
    [req.user.id, exerciseId, weightKg, reps, sets, achievedAt]);
  res.status(201).json({ id: r.insertId, exerciseId, weightKg, reps, sets, achievedAt });
});

router.put('/:id', async (req, res) => {
  const err = validate(req.body || {}); if (err) return res.status(400).json({ error: err });
  const { weightKg, reps, sets, achievedAt } = req.body;
  const [r] = await db.query('UPDATE personal_records SET weight_kg=?, reps=?, sets=?, achieved_at=? WHERE id=? AND user_id=?',
    [weightKg, reps, sets, achievedAt, req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Rekor tidak ditemukan' });
  res.json({ id: Number(req.params.id), weightKg, reps, sets, achievedAt });
});

router.delete('/:id', async (req, res) => {
  const [r] = await db.query('DELETE FROM personal_records WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Rekor tidak ditemukan' });
  res.json({ ok: true });
});

module.exports = router;
