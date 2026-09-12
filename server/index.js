const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { initializeDatabase, prisma } = require('./db/database');

const app = express();
initializeDatabase();

// CORS Configuration
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS origin not permitted'));
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1 as healthy`;
        res.json({
            status: 'ok',
            database: 'connected',
            server_time: new Date().toISOString()
        });
    } catch (err) {
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            server_time: new Date().toISOString()
        });
    }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin/teams', require('./routes/admin/teams'));
app.use('/api/admin/events', require('./routes/admin/events'));
app.use('/api/admin/questions', require('./routes/admin/questions'));
app.use('/api/admin/dashboard', require('./routes/admin/dashboard'));
app.use('/api/admin/results', require('./routes/admin/results'));
app.use('/api/admin/audit', require('./routes/admin/audit'));

app.use('/api/participant/dashboard', require('./routes/participant/dashboard'));
app.use('/api/participant/code-scramble', require('./routes/participant/code-scramble'));
app.use('/api/participant/hidden-tech', require('./routes/participant/hidden-tech'));
app.use('/api/participant/event', require('./routes/participant/event'));

app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// Production error handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
