const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 1000 : 20,
    message: { error: 'Too many login attempts, please try again later' }
});

const submissionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: isDev ? 1000 : 60,
    message: { error: 'Too many submission attempts, please try again in a minute' }
});

const actionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: isDev ? 1000 : 180,
    message: { error: 'Action rate limit reached. Please wait a moment.' }
});

module.exports = {
    loginLimiter,
    submissionLimiter,
    actionLimiter
};
