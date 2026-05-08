const adminCookieName = "asrold_admin_gate";
const adminEmail = "danielmassano.ual@gmail.com";

function toBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function getCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

export async function createAdminSession(adminKey: string, sessionMaxAge: number) {
  const expiresAt = Date.now() + sessionMaxAge * 1000;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(adminKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(String(expiresAt))
  );

  return `${expiresAt}.${toBase64Url(signature)}`;
}

export async function verifyAdminSession(
  cookieValue: string | undefined,
  adminKey: string
) {
  if (!cookieValue) return false;

  const [expiresAtRaw, signature] = cookieValue.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (!expiresAt || !signature || Date.now() > expiresAt) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(adminKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(String(expiresAt))
  );

  return signature === toBase64Url(signatureBytes);
}

export async function requireAdminRequest(
  request: Request,
  getUser: (token: string) => Promise<{ email?: string | null }>
) {
  const adminKey = process.env.ADMIN_ACCESS_KEY;

  if (!adminKey) {
    return { ok: false, error: "Admin access key is not configured.", status: 500 };
  }

  const hasGate = await verifyAdminSession(
    getCookie(request, adminCookieName),
    adminKey
  );

  if (!hasGate) {
    return { ok: false, error: "Admin gate required.", status: 401 };
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!token) {
    return { ok: false, error: "Admin session required.", status: 401 };
  }

  const user = await getUser(token);

  if (user.email?.toLowerCase() !== adminEmail) {
    return { ok: false, error: "Access denied.", status: 403 };
  }

  return { ok: true, status: 200 };
}
