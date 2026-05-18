const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const sendWebhook = async (payload) => {
  if (!config.webhookUrl) {
    logger.info('No webhook URL configured, skipping');
    return;
  }

  try {
    await axios.post(config.webhookUrl, {
      ...payload,
      sentAt: new Date().toISOString(),
      source: 'ShieldVault'
    }, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    logger.success('Webhook sent', { url: config.webhookUrl });
  } catch (err) {
    logger.warn('Webhook delivery failed (non-critical)', { error: err.message });
  }
};

module.exports = { sendWebhook };
