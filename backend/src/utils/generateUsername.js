/**
 * Username Generation Utility
 * Generates role-prefixed, sequential, zero-padded usernames atomically.
 */

const { Staff, StaffCounter } = require("../models/Staff");

// Mapping from Staff Role to Username Prefix
const ROLE_PREFIX_MAP = {
  PHM: "PHM",
  NURSING_OFFICER: "NO",
  CLINIC_STAFF: "CS",
};

/**
 * Returns the prefix corresponding to a staff role.
 * @param {string} role
 * @returns {string}
 */
function getRolePrefix(role) {
  const prefix = ROLE_PREFIX_MAP[role];
  if (!prefix) {
    throw new Error(`Invalid role for username prefix mapping: ${role}`);
  }
  return prefix;
}

/**
 * Finds the highest sequence number currently existing in the Staff collection
 * for a given prefix.
 * @param {string} prefix
 * @returns {Promise<number>}
 */
async function getHighestExistingSequence(prefix) {
  // Regex to match prefix followed by digits (e.g., ^PHM\d+$)
  const regex = new RegExp(`^${prefix}(\\d+)$`, "i");

  const matchingStaff = await Staff.find({ username: regex }, { username: 1 })
    .lean()
    .exec();

  let maxSeq = 0;
  for (const item of matchingStaff) {
    const match = item.username.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  return maxSeq;
}

/**
 * Atomically generates the next unique username for a given role.
 * Uses MongoDB's atomic findOneAndUpdate on StaffCounter so concurrent requests
 * never produce conflicting usernames.
 *
 * Example Outputs:
 * - PHM -> PHM001, PHM002, PHM003
 * - NURSING_OFFICER -> NO001, NO002
 * - CLINIC_STAFF -> CS001, CS002
 *
 * @param {string} role - 'PHM' | 'NURSING_OFFICER' | 'CLINIC_STAFF'
 * @returns {Promise<string>}
 */
async function generateUsername(role) {
  const prefix = getRolePrefix(role);

  // Synchronize counter with highest existing record if needed
  const existingHighest = await getHighestExistingSequence(prefix);

  // Ensure counter document exists with at least existingHighest
  await StaffCounter.updateOne(
    { _id: prefix, seq: { $lt: existingHighest } },
    { $set: { seq: existingHighest } }
  );

  // Atomically increment the sequence counter
  const counterDoc = await StaffCounter.findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  let seqNumber = counterDoc.seq;
  let username = `${prefix}${String(seqNumber).padStart(3, "0")}`;

  // Extra resilience check against legacy non-sequential entries
  let attempts = 0;
  while ((await Staff.exists({ username })) && attempts < 10) {
    attempts++;
    const nextCounter = await StaffCounter.findOneAndUpdate(
      { _id: prefix },
      { $inc: { seq: 1 } },
      { new: true }
    );
    seqNumber = nextCounter.seq;
    username = `${prefix}${String(seqNumber).padStart(3, "0")}`;
  }

  return username;
}

module.exports = {
  ROLE_PREFIX_MAP,
  getRolePrefix,
  generateUsername,
};
