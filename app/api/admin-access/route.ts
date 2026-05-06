import { NextResponse } from "next/server";

const adminCookieName = "asrold_admin_gate";

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
  response.cookies.set(adminCookieName, adminKey, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 6,
  });

  return response;
}
