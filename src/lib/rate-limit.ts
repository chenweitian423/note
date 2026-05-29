type Bucket = {
  failures: number[];
  lockedUntil: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const buckets = new Map<string, Bucket>();

function currentBucket(key: string): Bucket {
  const bucket = buckets.get(key) ?? { failures: [], lockedUntil: 0 };
  buckets.set(key, bucket);
  return bucket;
}

export function isLoginRateLimited(key: string, now = Date.now()): boolean {
  const bucket = currentBucket(key);
  return bucket.lockedUntil > now;
}

export function recordLoginFailure(key: string, now = Date.now()): void {
  const bucket = currentBucket(key);
  bucket.failures = bucket.failures.filter((time) => now - time <= WINDOW_MS);
  bucket.failures.push(now);
  if (bucket.failures.length >= MAX_FAILURES) {
    bucket.lockedUntil = now + LOCK_MS;
  }
}

export function clearLoginFailures(key: string): void {
  buckets.delete(key);
}

export function resetLoginRateLimits(): void {
  buckets.clear();
}
