export function withTimeout(promise, ms, message = "Timeout") {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

export async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function retry(fn, { retries = 1, delayMs = 250 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < retries) await sleep(delayMs);
    }
  }
  throw lastErr;
}
