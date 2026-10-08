/**
 * Temporary Password Generator and Hashing Utility
 * Uses Node's crypto module for cryptographically strong random strings
 * and bcryptjs for secure password hashing.
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const ALPHANUMERIC_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/**
 * Generates a random alphanumeric temporary password.
 * Omits easily confused characters (like 0, O, 1, l, I) to reduce user error.
 *
 * @param {number} [length=10] - Password length (between 8 and 10)
 * @returns {string} Plain-text temporary password
 */
function generateTemporaryPassword(length = 10) {
  // Enforce 8-10 character limit per specification
  const targetLength = Math.max(8, Math.min(10, length));
  let result = "";

  const charsetLength = ALPHANUMERIC_CHARSET.length;
  for (let i = 0; i < targetLength; i++) {
    const randomIndex = crypto.randomInt(0, charsetLength);
    result += ALPHANUMERIC_CHARSET.charAt(randomIndex);
  }

  return result;
}

/**
 * Hashes a plain-text password using bcrypt with 10+ salt rounds.
 * Plain-text passwords should never be stored or logged.
 *
 * @param {string} plainPassword
 * @param {number} [saltRounds=10]
 * @returns {Promise<string>}
 */
async function hashPassword(plainPassword, saltRounds = 10) {
  return bcrypt.hash(plainPassword, saltRounds);
}

/**
 * Verifies a plain-text password against a bcrypt hash.
 *
 * @param {string} plainPassword
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function comparePassword(plainPassword, hash) {
  if (!plainPassword || !hash) return false;
  return bcrypt.compare(plainPassword, hash);
}

module.exports = {
  generateTemporaryPassword,
  hashPassword,
  comparePassword,
};
