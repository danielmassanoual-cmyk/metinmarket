import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const adminCookieName = "asrold_admin_gate";

function toBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function verifyAdminSession(cookieValue: string | undefined, adminKey: string) {
  if (!cookieValue) return false;

  const [expiresAtRaw, signature] = cookieValue.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (!expiresAt || !signature || Date.now() > expiresAt) {
    return false;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(`${expiresAt}.${adminKey}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const expected = toBase64Url(digest);

  return signature === expected;
}

export async function proxy(request: NextRequest) {
  const adminKey = process.env.ADMIN_ACCESS_KEY;

  if (!adminKey && process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(adminCookieName)?.value;

  if (adminKey && (await verifyAdminSession(cookieValue, adminKey))) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin-access";
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
