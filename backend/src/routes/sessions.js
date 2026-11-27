const router = require('express').Router();
const db = require('../db');

const SPLITS = ['push', 'pull', 'legs', 'core'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function ownSession(req, res) {
  const [rows] = await db.query('SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!rows.length) { res.status(404).json({ error: 'Sesi tidak ditemukan' }); return null; }
  return rows[0];
}

// Jika beban set melampaui PB (atau sama dengan rep lebih banyak), PB diperbarui otomatis
async function bumpPersonalRecord(userId, exerciseId, weight, reps, date) {
  const [rows] = await db.query('SELECT * FROM personal_records WHERE user_id = ? AND exercise_id = ?', [userId, exerciseId]);
  if (!rows.length) {
    await db.query('INSERT INTO personal_records (user_id, exercise_id, weight_kg, reps, sets, achieved_at) VALUES (?,?,?,?,1,?)',
      [userId, exerciseId, weight, reps, date]);
    return true;
  }
  const pr = rows[0];
  if (weight > pr.weight_kg || (weight === pr.weight_kg && reps > pr.reps)) {
    await db.query('UPDATE personal_records SET weight_kg=?, reps=?, achieved_at=? WHERE id=?', [weight, reps, date, pr.id]);
    return true;
  }
  return false;
}

const mapSession = (s) => ({ id: s.id, split: s.split, sessionDate: s.session_date, notes: s.notes });

// ---- Sesi: Create / Read (list + search) / Update / Delete ----
router.get('/', async (req, res) => {
  const { q, split } = req.query;
  const where = ['s.user_id = ?']; const args = [req.user.id];
  if (split && SPLITS.includes(split)) { where.push('s.split = ?'); args.push(split); }
  if (q) { where.push('(s.notes LIKE ? OR EXISTS (SELECT 1 FROM session_sets ss JOIN exercises e ON e.id = ss.exercise_id WHERE ss.session_id = s.id AND e.name LIKE ?))'); args.push(`%${q}%`, `%${q}%`); }
  const [rows] = await db.query(
    `SELECT s.*, (SELECT COUNT(*) FROM session_sets WHERE session_id = s.id) AS setCount,
            (SELECT COUNT(DISTINCT exercise_id) FROM session_sets WHERE session_id = s.id) AS exerciseCount
       FROM workout_sessions s WHERE ${where.join(' AND ')} ORDER BY s.session_date DESC, s.id DESC`, args);
  res.json(rows.map((s) => ({ ...mapSession(s), setCount: s.setCount, exerciseCount: s.exerciseCount })));
});

router.post('/', async (req, res) => {
  const { split, sessionDate, notes } = req.body || {};
  if (!SPLITS.includes(split)) return res.status(400).json({ error: 'Split tidak valid' });
  if (!DATE_RE.test(sessionDate || '')) return res.status(400).json({ error: 'Tanggal harus format yyyy-MM-dd' });
  const [r] = await db.query('INSERT INTO workout_sessions (user_id, split, session_date, notes) VALUES (?,?,?,?)',
    [req.user.id, split, sessionDate, notes || null]);
  res.status(201).json({ id: r.insertId, split, sessionDate, notes: notes || null });
});

router.get('/:id', async (req, res) => {
  const s = await ownSession(req, res); if (!s) return;
  const [sets] = await db.query(
    `SELECT ss.id, ss.exercise_id AS exerciseId, e.name AS exerciseName, ss.set_no AS setNo, ss.reps, ss.weight_kg AS weightKg
       FROM session_sets ss JOIN exercises e ON e.id = ss.exercise_id
      WHERE ss.session_id = ? ORDER BY ss.exercise_id, ss.set_no`, [s.id]);
  res.json({ ...mapSession(s), sets });
});

router.put('/:id', async (req, res) => {
  const s = await ownSession(req, res); if (!s) return;
  const { split, sessionDate, notes } = req.body || {};
  if (!SPLITS.includes(split)) return res.status(400).json({ error: 'Split tidak valid' });
  if (!DATE_RE.test(sessionDate || '')) return res.status(400).json({ error: 'Tanggal harus format yyyy-MM-dd' });
  await db.query('UPDATE workout_sessions SET split=?, session_date=?, notes=? WHERE id=?', [split, sessionDate, notes || null, s.id]);
  res.json({ id: s.id, split, sessionDate, notes: notes || null });
});

router.delete('/:id', async (req, res) => {
  const s = await ownSession(req, res); if (!s) return;
  await db.query('DELETE FROM workout_sessions WHERE id = ?', [s.id]);
  res.json({ ok: true });
});

// ---- Set per gerakan (anak dari sesi) ----
function validSet(b) {
  if (!Number.isInteger(b.exerciseId)) return 'exerciseId wajib diisi';
  if (!Number.isInteger(b.reps) || b.reps < 1 || b.reps > 200) return 'Rep harus 1-200';
  if (typeof b.weightKg !== 'number' || b.weightKg < 0 || b.weightKg > 1000) return 'Beban harus 0-1000 kg';
  return null;
}

router.post('/:id/sets', async (req, res) => {
  const s = await ownSession(req, res); if (!s) return;
  const err = validSet(req.body || {}); if (err) return res.status(400).json({ error: err });
  const { exerciseId, reps, weightKg } = req.body;
  const [n] = await db.query('SELECT COALESCE(MAX(set_no),0)+1 AS next FROM session_sets WHERE session_id=? AND exercise_id=?', [s.id, exerciseId]);
  const [r] = await db.query('INSERT INTO session_sets (session_id, exercise_id, set_no, reps, weight_kg) VALUES (?,?,?,?,?)',
    [s.id, exerciseId, n[0].next, reps, weightKg]);
  const newPr = await bumpPersonalRecord(req.user.id, exerciseId, weightKg, reps, s.session_date);
  res.status(201).json({ id: r.insertId, exerciseId, setNo: n[0].next, reps, weightKg, newPersonalRecord: newPr });
});

router.put('/:id/sets/:setId', async (req, res) => {
  const s = await ownSession(req, res); if (!s) return;
  const err = validSet(req.body || {}); if (err) return res.status(400).json({ error: err });
  const { exerciseId, reps, weightKg } = req.body;
  const [r] = await db.query('UPDATE session_sets SET exercise_id=?, reps=?, weight_kg=? WHERE id=? AND session_id=?', [exerciseId, reps, weightKg, req.params.setId, s.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Set tidak ditemukan' });
  const newPr = await bumpPersonalRecord(req.user.id, exerciseId, weightKg, reps, s.session_date);
  res.json({ id: Number(req.params.setId), exerciseId, reps, weightKg, newPersonalRecord: newPr });
});

router.delete('/:id/sets/:setId', async (req, res) => {
  const s = await ownSession(req, res); if (!s) return;
  const [r] = await db.query('DELETE FROM session_sets WHERE id=? AND session_id=?', [req.params.setId, s.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Set tidak ditemukan' });
  res.json({ ok: true });
});

module.exports = router;
