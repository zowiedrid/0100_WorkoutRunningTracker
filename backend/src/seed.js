// Mengisi pustaka gerakan global + akun admin demo. Jalankan: npm run seed
const bcrypt = require('bcryptjs');
const db = require('./db');

const EXERCISES = [
  ['Chest Press', 'Dada', 'push'], ['Incline Dumbbell Press', 'Dada', 'push'], ['Cable Fly', 'Dada', 'push'],
  ['Shoulder Press', 'Bahu', 'push'], ['Lateral Raise', 'Bahu', 'push'], ['Triceps Pushdown', 'Triceps', 'push'], ['Skull Crusher', 'Triceps', 'push'],
  ['Lat Pulldown', 'Punggung', 'pull'], ['Seated Row', 'Punggung', 'pull'], ['Pull-up', 'Punggung', 'pull'], ['Barbell Curl', 'Biceps', 'pull'], ['Hammer Curl', 'Biceps', 'pull'],
  ['Back Squat', 'Paha', 'legs'], ['Leg Press', 'Paha', 'legs'], ['Romanian Deadlift', 'Hamstring', 'legs'], ['Calf Raise', 'Betis', 'legs'],
  ['Cable Crunch', 'Perut', 'core'], ['Hanging Leg Raise', 'Perut', 'core'], ['Plank', 'Perut', 'core'], ['Russian Twist', 'Oblique', 'core'],
];

(async () => {
  const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM exercises WHERE owner_id IS NULL');
  if (n === 0) {
    await db.query('INSERT INTO exercises (name, muscle_group, split) VALUES ?', [EXERCISES]);
    console.log(`Seed ${EXERCISES.length} gerakan global`);
  }
  const hash = await bcrypt.hash('admin12345', 10);
  await db.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('Admin FitLog','admin@fitlog.app',?, 'admin') ON DUPLICATE KEY UPDATE role='admin'", [hash]);
  console.log('Admin demo: admin@fitlog.app / admin12345');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
