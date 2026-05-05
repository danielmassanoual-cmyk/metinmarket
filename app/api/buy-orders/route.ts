import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import {
  cleanMultiline,
  cleanText,
  formatContact,
  isPositiveNumber,
  verifyTurnstile,
} from "../../../lib/public-submit";

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const captcha = await verifyTurnstile(String(body.captcha || ""));

  if (!captcha.ok) {
    return Response.json({ error: captcha.error }, { status: 403 });
  }

  const desired = cleanText(String(body.desired || ""), 6);
  const server = cleanText(String(body.server || ""), 40);
  const maxPrice = cleanText(String(body.max_price || ""), 4);
  const buyerContactMethod = cleanText(String(body.buyer_contact_method || ""), 20);
  const buyerContact = cleanText(String(body.buyer_contact || ""), 50);
  const message = cleanMultiline(String(body.message || ""), 600);

  if (!desired || !server || !maxPrice || !buyerContactMethod || !buyerContact) {
    return Response.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!isPositiveNumber(maxPrice)) {
    return Response.json({ error: "Invalid price." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("buy_orders").insert({
    desired,
    server,
    type: "Wons",
    max_price: `${maxPrice}€`,
    buyer_contact: formatContact(buyerContactMethod, buyerContact),
    message,
    status: "Open",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
