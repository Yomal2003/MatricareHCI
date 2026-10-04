class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
// Wrap async route handlers so thrown errors reach the error middleware.
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

module.exports = { HttpError, ah, pick };
