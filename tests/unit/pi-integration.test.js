const PiClient = require('../../src/pi-integration/pi-client');
const mongoose = require('mongoose');
require('dotenv').config();

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('PiClient', () => {
  let piClient;

  beforeEach(() => {
    piClient = new PiClient();
  });

  test('should authenticate user successfully', async () => {
    const result = await piClient.authenticateUser('test_user_123');
    expect(result).toHaveProperty('userId', 'test_user_123');
    expect(result).toHaveProperty('token');
  });

  test('should get balance', async () => {
    const balance = await piClient.getBalance('test_user_123');
    expect(typeof balance).toBe('number');
  });

  test('should initiate transaction', async () => {
    const tx = await piClient.initiateTransaction('from_user', 'to_user', 0.1);
    expect(tx).toHaveProperty('id');
    expect(tx).toHaveProperty('amount', 0.1);
    expect(tx).toHaveProperty('status', 'completed');
  });

  test('should calculate mining reward', () => {
    const reward = piClient.calculateMiningReward(100, 0.05);
    expect(reward).toBeGreaterThan(0.01);
  });
});
