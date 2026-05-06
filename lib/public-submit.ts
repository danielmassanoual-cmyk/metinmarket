const maxImageSizeBytes = 4 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

export function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function cleanMultiline(
  value: FormDataEntryValue | null,
  maxLength: number
) {
  return String(value || "").trim().slice(0, maxLength);
}

export function isPositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

export function isValidCentPrice(value: string) {
  return /^0\.\d{2}$/.test(value) && isPositiveNumber(value);
}

export function isValidItemPrice(value: string) {
  return /^[1-9]\d{0,4}$/.test(value);
}

export function formatContact(method: string, contact: string) {
  return `${method}: ${contact}`;
}

export function validateImage(file: File | null) {
  if (!file || file.size === 0) return null;

  if (
    !allowedImageTypes.includes(file.type) ||
    file.size > maxImageSizeBytes
  ) {
    return "Use a JPG, PNG or WebP image up to 4MB.";
  }

  return null;
}

export async function verifyTurnstile(token: string, request?: Request) {
  const host = request?.headers.get("host") || "";
  const forwardedHost = request?.headers.get("x-forwarded-host") || "";
  const isLocalRequest = [host, forwardedHost].some(
    (value) =>
      value.startsWith("localhost") ||
      value.startsWith("127.0.0.1") ||
      value.startsWith("[::1]")
  );

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.DISABLE_CAPTCHA === "true" ||
    process.env.NEXT_PUBLIC_DISABLE_CAPTCHA === "true" ||
    isLocalRequest
  ) {
    return { ok: true };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return { ok: false, error: "Turnstile secret key is not configured." };
  }

  if (!token) {
    return { ok: false, error: "Captcha token is missing." };
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    }
  );
  const result = (await response.json()) as {
    success?: boolean;
    "error-codes"?: string[];
  };

  if (!result.success) {
    return {
      ok: false,
      error: `Captcha validation failed: ${
        result["error-codes"]?.join(", ") || "unknown"
      }`,
    };
  }

  return { ok: true };
}
