import { NextResponse } from "next/server";
import { createAdminSession } from "../../../lib/admin-auth";
import { checkRateLimit } from "../../../lib/rate-limit";

const adminCookieName = "asrold_admin_gate";
const sessionMaxAge = 60 * 60 * 6;

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "admin-access", 5, 15 * 60_000);

  if (!rateLimit.ok) {
    return Response.json(
      { error: `Too many attempts. Try again in ${rateLimit.retryAfter}s.` },
      { status: 429 }
    );
  }

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
  response.cookies.set(adminCookieName, await createAdminSession(adminKey, sessionMaxAge), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge,
  });

  return response;
}
