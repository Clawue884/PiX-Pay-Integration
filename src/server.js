require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const http = require('http');
const socketIo = require('socket.io');
const winston = require('winston');

// New imports for enhancements
const config = require('../config/' + (process.env.NODE_ENV || 'development'));
const { metricsMiddleware, register, transactionCounter, userGauge } = require('./monitoring/metrics');
const adminRoutes = require('./routes/admin');
const { require2FA } = require('./middleware/2fa');
const AdvancedAIEngine = require('./ai/advanced-ai-engine');
const NLPEngine = require('./ai/nlp-engine');
const Chatbot = require('./ai/chatbot');
const MarketPredictor = require('./ai/market-predictor');
const DynamicPricing = require('./ai/dynamic-pricing');
const aiRoutes = require('./routes/ai');

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');
const User = require('./models/User');

const logger = winston.createLogger({
  level: config.logging.level,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: config.logging.file })
  ]
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: config.corsOrigin } });

// Initialize Advanced AI Engines
const aiEngine = new AdvancedAIEngine();
const nlpEngine = new NLPEngine();
const chatbot = new Chatbot();
const marketPredictor = new MarketPredictor();
const dynamicPricing = new DynamicPricing();

// Train models on startup (async to avoid blocking)
Promise.all([
  aiEngine.trainModel().catch(logger.error),
  marketPredictor.trainOnHistoricalData().catch(logger.error),
  dynamicPricing.trainPricingModel([]).catch(logger.error)  // Pass empty array or load from DB
]).then(() => logger.info('All AI models initialized and trained'));

// Middleware with config
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit(config.rateLimit));
app.use(metricsMiddleware);  // Prometheus metrics

// Passport OAuth with config
passport.use(new TwitterStrategy({
  consumerKey: config.xApiKey,
  consumerSecret: config.xApiSecret,
  callbackURL: config.oauthCallbackUrl || process.env.OAUTH_CALLBACK_URL
}, async (token, tokenSecret, profile, done) => {
  try {
    let user = await User.findOne({ xUserId: profile.id });
    if (!user) {
      user = new User({ username: profile.username, email: `${profile.username}@x.com`, password: 'oauth', xUserId: profile.id });
      await user.save();
    }
    done(null, user);
  } catch (error) {
    done(error);
  }
}));

// Routes
app.use('/auth', authRoutes);
app.use('/wallet', walletRoutes);
app.use('/payments', paymentRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/admin', adminRoutes);  // Admin routes
app.use('/ai', aiRoutes);  // New AI routes
app.use(express.static('public')); // Serve frontend

// Metrics endpoint for Prometheus
if (config.monitoring) {
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
}

// Socket.io for real-time with metrics
io.on('connection', (socket) => {
  logger.info('User connected via socket');
  userGauge.inc();  // Increment active users
  socket.on('join', (userId) => socket.join(userId));
  socket.on('sendTip', (data) => {
    io.to(data.toUser).emit('tipReceived', data);
    transactionCounter.inc({ type: 'tip' });  // Track transactions
  });
  socket.on('disconnect', () => userGauge.dec());  // Decrement on disconnect
});

// DB Connection with config
mongoose.connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() =>
