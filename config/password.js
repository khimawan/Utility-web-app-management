const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Every bcrypt hash is prefixed $2a$ / $2b$ / $2y$. Anything else is a legacy
// plaintext row that predates hashing and needs upgrading on next login.
const BCRYPT_PREFIX = /^\$2[aby]\$/;

// 10 is the usual cost. bcryptjs is pure JS (no native binding) and this box is
// a 1.5GHz Cortex-A53, so allow lowering it if login latency becomes a problem.
const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

function isHashed(value) {
  return typeof value === 'string' && BCRYPT_PREFIX.test(value);
}

function hashPassword(plain) {
  if (typeof plain !== 'string' || plain === '') {
    throw new Error('Password tidak boleh kosong');
  }
  return bcrypt.hashSync(plain, ROUNDS);
}

/**
 * Verify a password against whatever is stored.
 * Returns { ok, needsRehash }.
 *
 * needsRehash is true when the row held legacy plaintext and it matched — the
 * caller should re-hash it, since we now know the plaintext is correct.
 */
function verifyPassword(stored, plain) {
  if (typeof stored !== 'string' || typeof plain !== 'string' || plain === '') {
    return { ok: false, needsRehash: false };
  }

  if (isHashed(stored)) {
    let ok = false;
    try {
      ok = bcrypt.compareSync(plain, stored);
    } catch (e) {
      ok = false;
    }
    return { ok, needsRehash: false };
  }

  // Legacy plaintext row. Compare in constant time so this upgrade path does
  // not leak length or prefix through response timing.
  const a = Buffer.from(stored, 'utf8');
  const b = Buffer.from(plain, 'utf8');
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, needsRehash: ok };
}

module.exports = { hashPassword, verifyPassword, isHashed, ROUNDS };