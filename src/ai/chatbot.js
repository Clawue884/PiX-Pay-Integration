const { Configuration, OpenAIApi } = require('openai');
const winston = require('winston');

const logger = winston.createLogger({ level: 'info', transports: [new winston.transports.Console()] });
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

class Chatbot {
  constructor() {
    this.conversationHistory = {};
  }

  async respond(userId, message) {
    if (!this.conversationHistory[userId]) this.conversationHistory[userId] = [];
    this.conversationHistory[userId].push({ role: 'user', content: message });

    try {
      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for PiX Pay, a Pi Coin and X integration app. Answer questions about payments, mining, and features.' },
          ...this.conversationHistory[userId]
        ],
        max_tokens: 150
      });
      const reply = response.data.choices[0].message.content;
      this.conversationHistory[userId].push({ role: 'assistant', content: reply });
      logger.info(`Chatbot response for user ${userId}: ${reply}`);
      return reply;
    } catch (error) {
      logger.error('Chatbot response failed:', error);
      return 'Sorry, I\'m having trouble responding right now. Please try again later.';
    }
  }

  clearHistory(userId) {
    delete this.conversationHistory[userId];
  }
}

module.exports = Chatbot;
