import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSession } from "./lib/admin-auth";

const adminCookieName = "asrold_admin_gate";

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
