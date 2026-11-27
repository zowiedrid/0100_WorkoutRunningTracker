require('express-async-errors');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { requireAuth } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/auth', require('./routes/auth'));
app.use('/exercises', requireAuth, require('./routes/exercises'));
app.use('/sessions', requireAuth, require('./routes/sessions'));
app.use('/records', requireAuth, require('./routes/records'));

app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }));
// express-async-errors meneruskan error async ke handler ini
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Kesalahan server' }); });

const port = Number(process.env.PORT || 3100);
if (require.main === module) app.listen(port, '0.0.0.0', () => console.log(`Workout & Running Tracker API berjalan di http://0.0.0.0:${port}`));
module.exports = app;
