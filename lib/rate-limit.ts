type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function checkRateLimit(
  request: Request,
  scope: string,
  limit = 6,
  windowMs = 60_000
) {
  const now = Date.now();
  const key = `${scope}:${getClientIp(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  current.count += 1;

  if (current.count > limit) {
    return {
      ok: false,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  return { ok: true, retryAfter: 0 };
}
