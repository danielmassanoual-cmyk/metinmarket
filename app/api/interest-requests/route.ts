import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import {
  cleanMultiline,
  cleanText,
  formatContact,
  verifyTurnstile,
} from "../../../lib/public-submit";

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const captcha = await verifyTurnstile(String(body.captcha || ""), request);

  if (!captcha.ok) {
    return Response.json({ error: captcha.error }, { status: 403 });
  }

  const desired = cleanText(String(body.desired || ""), 6);
  const listingId = cleanText(String(body.listing_id || ""), 80);
  const maxPrice = cleanText(String(body.max_price || ""), 4);
  const buyerContactMethod = cleanText(
    String(body.buyer_contact_method || ""),
    20
  );
  const buyerContact = cleanText(String(body.buyer_contact || ""), 50);
  const message = cleanMultiline(String(body.message || ""), 600);

  if (!listingId || !desired || !buyerContactMethod || !buyerContact) {
    return Response.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("interest_requests").insert({
    listing_id: listingId,
    desired,
    max_price: maxPrice ? `${maxPrice}€` : null,
    buyer_contact: formatContact(buyerContactMethod, buyerContact),
    message,
    status: "Open",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
