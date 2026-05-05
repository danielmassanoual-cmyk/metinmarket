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

export async function verifyTurnstile(token: string) {
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
  const result = (await response.json()) as { success?: boolean };

  if (!result.success) {
    return { ok: false, error: "Captcha validation failed." };
  }

  return { ok: true };
}
