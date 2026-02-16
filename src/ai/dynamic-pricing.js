const tf = require('@tensorflow/tfjs-node');
const winston = require('winston');

const logger = winston.createLogger({ level: 'info', transports: [new winston.transports.Console()] });

class DynamicPricing {
  constructor() {
    this.model = null;
    this.loadModel();
  }

  async loadModel() {
    this.model = tf.sequential();
    this.model.add(tf.layers.dense({ inputShape: [3], units: 10, activation: 'relu' })); // Inputs: user engagement, time, demand
    this.model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
    this.model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    logger.info('Dynamic pricing model loaded');
  }

  async calculatePrice(engagement, timeOfDay, demand) {
    if (!this.model) await this.loadModel();
    const input = tf.tensor2d([[engagement, timeOfDay, demand]]);
    const price = this.model.predict(input).dataSync()[0];
    const adjustedPrice = Math.max(0.01, price); // Min 0.01 Pi
    logger.info(`Dynamic price calculated: ${adjustedPrice} for engagement ${engagement}`);
    return adjustedPrice;
  }

  async trainPricingModel(trainingData) {
    const inputs = trainingData.map(d => [d.engagement, d.time, d.demand]);
    const outputs = trainingData.map(d => d.actualPrice);
    const xs = tf.tensor2d(inputs);
    const ys = tf.tensor1d(outputs);
    await this.model.fit(xs, ys, { epochs: 20 });
    logger.info('Dynamic pricing model trained');
  }
}

module.exports = DynamicPricing;
