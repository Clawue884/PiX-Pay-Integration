const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Running migrations...');

  // Example: Add new field to User schema
  await mongoose.connection.db.collection('users').updateMany({}, { $set: { aiProfile: {} } });

  console.log('Migrations complete.');
  process.exit(0);
}

migrate().catch(console.error);
