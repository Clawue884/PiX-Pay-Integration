const request = require('supertest');
const { app } = require('../../src/server');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
require('dotenv').config();

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Payment Flow Integration', () => {
  let token;
  let userId;

  beforeAll(async () => {
    // Create test user
    const user = new User({ username: 'testuser', email: 'test@example.com', password: 'password123' });
    await user.save();
    userId = user._id;

    // Login to get token
    const res = await request(app).post('/auth/login').send({ email: 'test@example.com', password: 'password123' });
    token = res.body.token;
  });

  test('should link wallets', async () => {
    const res = await request(app)
      .post('/wallet/link')
      .set('Authorization', `Bearer ${token}`)
      .send({ piUserId: 'pi_test', xUserId: 'x_test' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should send tip', async () => {
    const res = await request(app)
      .post('/payments/tip')
      .set('Authorization', `Bearer ${token}`)
      .send({ toUserId: userId, amount: 0.05, tweetId: 'tweet123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should get transaction history', async () => {
    const res = await request(app)
      .get('/payments/history')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
