require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret',
  encryptionKey: process.env.ENCRYPTION_KEY || '12345678901234567890123456789012',
  signedUrlSecret: process.env.SIGNED_URL_SECRET || 'signed_secret',
  webhookUrl: process.env.WEBHOOK_URL || '',
  clamav: {
    host: process.env.CLAMAV_HOST || 'clamav',
    port: parseInt(process.env.CLAMAV_PORT) || 3310,
  },
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-zip-compressed',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
  }
};
