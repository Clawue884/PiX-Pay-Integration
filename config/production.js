module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  piApiKey: process.env.PI_API_KEY,
  xApiKey: process.env.X_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  rateLimit: { windowMs: 15 * 60 * 1000, max: 500 },  // Higher for prod
  logging: { level: 'error', file: 'logs/prod.log' },
  corsOrigin: ['https://yourdomain.com'],  // Restrict origins
  enable2FA: true,
  monitoring: true
};
