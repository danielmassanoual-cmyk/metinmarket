const maxImageSizeBytes = 4 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const imageExtensionsByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
  return /^0\.\d{1,2}$/.test(value) && isPositiveNumber(value);
}

export function normalizeCentPrice(value: string) {
  if (!isValidCentPrice(value)) return value;

  return Number(value).toFixed(2);
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

export function getImageExtension(file: File) {
  return imageExtensionsByType[file.type] || "webp";
}

export function validateImageSignature(file: File, bytes: ArrayBuffer) {
  const header = new Uint8Array(bytes.slice(0, 12));

  if (file.type === "image/jpeg") {
    return header[0] === 0xff && header[1] === 0xd8
      ? null
      : "Invalid JPG image.";
  }

  if (file.type === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return png.every((byte, index) => header[index] === byte)
      ? null
      : "Invalid PNG image.";
  }

  if (file.type === "image/webp") {
    const riff = String.fromCharCode(...header.slice(0, 4));
    const webp = String.fromCharCode(...header.slice(8, 12));

    return riff === "RIFF" && webp === "WEBP" ? null : "Invalid WebP image.";
  }

  return "Use a JPG, PNG or WebP image up to 4MB.";
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
  const ip = request?.headers.get("cf-connecting-ip");
  if (ip) formData.append("remoteip", ip);

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
