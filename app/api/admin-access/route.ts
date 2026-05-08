import { NextResponse } from "next/server";

const adminCookieName = "asrold_admin_gate";
const sessionMaxAge = 60 * 60 * 6;

function toBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function createAdminSession(adminKey: string) {
  const expiresAt = Date.now() + sessionMaxAge * 1000;
  const encoder = new TextEncoder();
  const data = encoder.encode(`${expiresAt}.${adminKey}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const signature = toBase64Url(digest);

  return `${expiresAt}.${signature}`;
}

export async function POST(request: Request) {
  const { code } = (await request.json().catch(() => ({}))) as {
    code?: string;
  };
  const adminKey = process.env.ADMIN_ACCESS_KEY;

  if (!adminKey) {
    return Response.json(
      { error: "Admin access key is not configured." },
      { status: 500 }
    );
  }

  if (!code || code !== adminKey) {
    return Response.json({ error: "Invalid access code." }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(adminCookieName, await createAdminSession(adminKey), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge,
  });

  return response;
}
