const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

/**
 * Generate a random encryption key and IV
 */
function generateKeyPair() {
  return {
    key: crypto.randomBytes(32).toString('hex'),
    iv: crypto.randomBytes(16).toString('hex')
  };
}

/**
 * Encrypt a buffer using AES-256-CBC
 */
function encryptBlock(buffer, keyHex, ivHex) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  return Buffer.concat([cipher.update(buffer), cipher.final()]);
}

/**
 * Decrypt a buffer using AES-256-CBC
 */
function decryptBlock(buffer, keyHex, ivHex) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(buffer), decipher.final()]);
}

module.exports = { generateKeyPair, encryptBlock, decryptBlock };
