const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  piUserId: { type: String, unique: true },
  xUserId: { type: String, unique: true },
  wallet: {
    piBalance: { type: Number, default: 0 },
    linked: { type: Boolean, default: false },
    encryptionKey: { type: String }  // For wallet encryption
  },
  aiProfile: { type: Object, default: {} },  // Store AI preferences
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.wallet.encryptionKey) {
    this.wallet.encryptionKey = require('crypto').randomBytes(32).toString('hex');
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
