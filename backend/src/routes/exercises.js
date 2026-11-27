const router = require('express').Router();
const db = require('../db');

const SPLITS = ['push', 'pull', 'legs', 'core'];

// Search + filter: gerakan global ATAU milik sendiri
router.get('/', async (req, res) => {
  const { q, split } = req.query;
  const where = ['(owner_id IS NULL OR owner_id = ?)'];
  const args = [req.user.id];
  if (q) { where.push('(name LIKE ? OR muscle_group LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  if (split && SPLITS.includes(split)) { where.push('split = ?'); args.push(split); }
  const [rows] = await db.query(
    `SELECT id, name, muscle_group AS muscleGroup, split, owner_id AS ownerId
       FROM exercises WHERE ${where.join(' AND ')} ORDER BY split, name`, args);
  res.json(rows);
});

function validate(b) {
  if (!b.name || b.name.trim().length < 2) return 'Nama gerakan minimal 2 karakter';
  if (!b.muscleGroup || !b.muscleGroup.trim()) return 'Kelompok otot wajib diisi';
  if (!SPLITS.includes(b.split)) return 'Split harus push, pull, legs, atau core';
  return null;
}

// Otorisasi: admin membuat gerakan global (global=true); user hanya membuat gerakan pribadi
router.post('/', async (req, res) => {
  const err = validate(req.body || {});
  if (err) return res.status(400).json({ error: err });
  const { name, muscleGroup, split, global } = req.body;
  if (global && req.user.role !== 'admin') return res.status(403).json({ error: 'Hanya admin yang boleh membuat gerakan global' });
  const owner = global ? null : req.user.id;
  const [r] = await db.query('INSERT INTO exercises (name, muscle_group, split, owner_id) VALUES (?,?,?,?)',
    [name.trim(), muscleGroup.trim(), split, owner]);
  res.status(201).json({ id: r.insertId, name: name.trim(), muscleGroup: muscleGroup.trim(), split, ownerId: owner });
});

async function loadEditable(req, res) {
  const [rows] = await db.query('SELECT * FROM exercises WHERE id = ?', [req.params.id]);
  const ex = rows[0];
  if (!ex) { res.status(404).json({ error: 'Gerakan tidak ditemukan' }); return null; }
  const isAdmin = req.user.role === 'admin';
  const allowed = ex.owner_id === null ? isAdmin : ex.owner_id === req.user.id || isAdmin;
  if (!allowed) { res.status(403).json({ error: 'Tidak boleh mengubah gerakan ini' }); return null; }
  return ex;
}

router.put('/:id', async (req, res) => {
  const ex = await loadEditable(req, res); if (!ex) return;
  const err = validate(req.body || {});
  if (err) return res.status(400).json({ error: err });
  const { name, muscleGroup, split } = req.body;
  await db.query('UPDATE exercises SET name=?, muscle_group=?, split=? WHERE id=?', [name.trim(), muscleGroup.trim(), split, ex.id]);
  res.json({ id: ex.id, name: name.trim(), muscleGroup: muscleGroup.trim(), split, ownerId: ex.owner_id });
});

router.delete('/:id', async (req, res) => {
  const ex = await loadEditable(req, res); if (!ex) return;
  await db.query('DELETE FROM exercises WHERE id = ?', [ex.id]);
  res.json({ ok: true });
});

module.exports = router;
