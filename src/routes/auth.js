const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const passport = require('passport');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({ level: 'info', transports: [new winston.transports.Console()] });
const router = new express.Router();

// Local registration
router.post('/register', async (req, res) => {
  const schema = Joi.object({
    username: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send({ error: error.details[0].message });

  try {
    const user = new User(req.body);
    await user.save();
    logger.info(`User registered: ${user._id}`);
    res.status(201).send({ message: 'User registered successfully' });
  } catch (error) {
    logger.error('Registration failed:', error);
    res.status(400).send({ error: 'Registration failed' });
  }
});

// Local login
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(401).send({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    logger.info(`User logged in: ${user._id}`);
    res.send({ token, user: { id: user._id, username: user.username } });
  } catch (error) {
    logger.error('Login failed:', error);
    res.status(500).send({ error: 'Login failed' });
  }
});

// OAuth with X (Twitter)
router.get('/x', passport.authenticate('twitter'));
router.get('/x/callback', passport.authenticate('twitter', { session: false }), async (req, res) => {
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  logger.info(`OAuth login via X: ${req.user._id}`);
  res.redirect(`http://localhost:3000/dashboard?token=${token}`);
});

// Profile update
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['username', 'email'];
    const isValid = updates.every(update => allowedUpdates.includes(update));
    if (!isValid) return res.status(400).send({ error: 'Invalid updates' });
    updates.forEach(update => req.user[update] = req.body[update]);
    await req.user.save();
    res.send(req.user);
  } catch (error) {
    logger.error('Profile update failed:', error);
    res.status(500).send({ error: 'Update failed' });
  }
});

module.exports = router;
