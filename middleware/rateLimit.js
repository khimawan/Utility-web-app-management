/**
 * In-process rate limiting for the login route.
 *
 * No external dependency on purpose: this app runs as a single Node process, so
 * an in-memory counter is sufficient. A restart clears it, which is acceptable
 * (it only ever lets an attacker wait for a restart, and restarts are rare and
 * logged).
 */

const WINDOW_MS = 15 * 60 * 1000; // rolling window
const LOCK_MS = 15 * 60 * 1000; // how long a tripped key stays locked
const MAX_ATTEMPTS = 5; // failures per ip|username before lock

// key -> { count, firstAt, lockedUntil, lastSeen }
const buckets = new Map();

function clientIp(req) {
  // Requires app.set('trust proxy', ...) to be meaningful for tunnel traffic.
  return req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
}

function keyFor(req, username) {
  const user = (username || '').toString().trim().toLowerCase() || '-';
  return `${clientIp(req)}|${user}`;
}

function prune(now) {
  for (const [key, bucket] of buckets) {
    const expired = now - bucket.firstAt > WINDOW_MS && now >= bucket.lockedUntil;
    if (expired) buckets.delete(key);
  }
}

function inspect(req, username) {
  const now = Date.now();
  prune(now);

  const key = keyFor(req, username);
  const bucket = buckets.get(key);

  if (!bucket) return { blocked: false, remaining: MAX_ATTEMPTS };

  if (bucket.lockedUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((bucket.lockedUntil - now) / 1000),
      reason: 'locked'
    };
  }

  // Window has rolled over — start a fresh count.
  if (now - bucket.firstAt > WINDOW_MS) {
    buckets.delete(key);
    return { blocked: false, remaining: MAX_ATTEMPTS };
  }

  return { blocked: false, remaining: Math.max(0, MAX_ATTEMPTS - bucket.count) };
}

function recordFailure(req, username) {
  const now = Date.now();
  const key = keyFor(req, username);
  let bucket = buckets.get(key);

  if (!bucket || now - bucket.firstAt > WINDOW_MS) {
    bucket = { count: 0, firstAt: now, lockedUntil: 0, lastSeen: now };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  bucket.lastSeen = now;

  if (bucket.count >= MAX_ATTEMPTS) {
    bucket.lockedUntil = now + LOCK_MS;
  }

  return bucket.count;
}

function recordSuccess(req, username) {
  buckets.delete(keyFor(req, username));
}

// Exposed for the /health endpoint and for tests.
function reset() {
  buckets.clear();
}

function size() {
  return buckets.size;
}

module.exports = {
  inspect,
  recordFailure,
  recordSuccess,
  reset,
  size,
  MAX_ATTEMPTS,
  LOCK_MS
};