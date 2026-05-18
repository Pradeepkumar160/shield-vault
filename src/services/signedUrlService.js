const crypto = require('crypto');
const config = require('../config/config');

const generateSignedUrl = (filename, expiresInMs = 60 * 60 * 1000) => {
  const expires = Date.now() + expiresInMs;
  const data = `${filename}:${expires}`;
  const signature = crypto
    .createHmac('sha256', config.signedUrlSecret)
    .update(data)
    .digest('hex');

  return {
    url: `/api/files/download/${encodeURIComponent(filename)}?expires=${expires}&signature=${signature}`,
    expires: new Date(expires).toISOString(),
    expiresMs: expires
  };
};

const verifySignedUrl = (filename, expires, signature) => {
  if (!expires || !signature) return false;
  if (Date.now() > parseInt(expires)) return false;

  const data = `${filename}:${expires}`;
  const expected = crypto
    .createHmac('sha256', config.signedUrlSecret)
    .update(data)
    .digest('hex');

  return expected === signature;
};

module.exports = { generateSignedUrl, verifySignedUrl };
