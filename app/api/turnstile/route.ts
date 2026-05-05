import { verifyTurnstile } from "../../../lib/public-submit";

export async function POST(request: Request) {
  const { token } = (await request.json().catch(() => ({}))) as {
    token?: string;
  };
  const result = await verifyTurnstile(token || "");

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 403 });
  }

  return Response.json({ success: true });
}
