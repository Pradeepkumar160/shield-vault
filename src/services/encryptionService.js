const crypto = require('crypto');
const fs = require('fs');
const config = require('../config/config');

const algorithm = 'aes-256-cbc';

// Ensure key is exactly 32 bytes
const getKey = () => {
  const keyStr = config.encryptionKey;
  return Buffer.from(keyStr.padEnd(32, '0').slice(0, 32));
};

const encryptFile = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const key = getKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);

      // Write IV first (16 bytes header)
      output.write(iv);

      input.pipe(cipher).pipe(output);
      output.on('finish', resolve);
      output.on('error', reject);
      input.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

const decryptFile = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const key = getKey();
      const chunks = [];
      const input = fs.createReadStream(inputPath);

      input.on('data', (chunk) => chunks.push(chunk));
      input.on('error', reject);
      input.on('end', () => {
        const data = Buffer.concat(chunks);
        if (data.length < 16) return reject(new Error('File too small to contain IV'));

        const iv = data.slice(0, 16);
        const encryptedData = data.slice(16);
        const decipher = crypto.createDecipheriv(algorithm, key, iv);

        try {
          const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
          fs.writeFile(outputPath, decrypted, (err) => {
            if (err) return reject(err);
            resolve();
          });
        } catch (e) {
          reject(e);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { encryptFile, decryptFile };
