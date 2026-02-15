const { Configuration, OpenAIApi } = require('openai');
const Analytics = require('../models/Analytics');
const winston = require('winston');
require('dotenv').config();

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/ai.log' })
  ]
});
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

class AIEngine {
  async suggestPayment(userData, tweetContent) {
    try {
      const prompt = `Based on user engagement data: ${JSON.stringify(userData)} and tweet content: "${tweetContent}", suggest an optimal Pi tip amount (e.g., 0.05 Pi). Consider factors like follower count, likes, and past behavior.`;
      const response = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 10,
        temperature: 0.5
      });
      const suggestion = parseFloat(response.data.choices[0].text.trim().replace(/[^0-9.]/g, '')) || 0.05;
      await Analytics.create({ user: userData.userId, event: 'suggestion', data: { suggestion, tweetContent } });
      logger.info(`AI suggestion for user ${userData.userId}: ${suggestion}`);
      return suggestion;
    } catch (error) {
      logger.error('AI suggestion failed:', error);
      return 0.05; // Fallback
    }
  }

  async detectFraud(transactionData) {
    try {
      const prompt = `Analyze this transaction for fraud risk: ${JSON.stringify(transactionData)}. Output risk level (high/medium/low) and a score (0-1). Factors: amount, frequency, user history.`;
      const response = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 50,
        temperature: 0.3
      });
      const output = response.data.choices[0].text.trim();
      const riskMatch = output.match(/(high|medium|low)/i);
      const scoreMatch = output.match(/(\d\.\d+)/);
      const risk = riskMatch ? riskMatch[0].toLowerCase() : 'low';
      const score = scoreMatch ? parseFloat(scoreMatch[0]) : 0.1;
      await Analytics.create({ user: transactionData.fromUser, event: 'fraud_check', data: { risk, score, transactionData } });
      logger.info(`AI fraud detection for TX: ${transactionData.id}, risk: ${risk}, score: ${score}`);
      return { risk, score, flag: score > 0.7 };
    } catch (error) {
      logger.error('AI fraud detection failed:', error);
      return { risk: 'low', score: 0.1, flag: false };
    }
  }

  async predictTrends(userId) {
    const analytics = await Analytics.find({ user: userId }).sort({ timestamp: -1 }).limit(100);
    if (analytics.length === 0) return { predictedNextTip: 0.05 };
    // Advanced prediction: Use OpenAI for trend analysis
    const dataSummary = analytics.map(a => `${a.event}: ${JSON.stringify(a.data)}`).join('; ');
    const prompt = `Predict the next tip amount based on this user analytics history: ${dataSummary}. Output a number (e.g., 0.1).`;
    try {
      const response = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 10
      });
      const prediction = parseFloat(response.data.choices[0].text.trim()) || 0.05;
      await Analytics.create({ user: userId, event: 'trend_prediction', data: { prediction } });
      logger.info(`AI trend prediction for user ${userId}: ${prediction}`);
      return { predictedNextTip: prediction };
    } catch (error) {
      logger.error('AI trend prediction failed:', error);
      return { predictedNextTip: 0.05 };
    }
  }

  async generateReport(userId) {
    const analytics = await Analytics.find({ user: userId }).sort({ timestamp: -1 }).limit(50);
    const prompt = `Generate a personalized report on Pi usage and trends from this data: ${JSON.stringify(analytics)}. Summarize in 200 words.`;
    try {
      const response = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 300
      });
      return response.data.choices[0].text.trim();
    } catch (error) {
      logger.error('AI report generation failed:', error);
      return 'Unable to generate report.';
    }
  }
}

module.exports = AIEngine;
