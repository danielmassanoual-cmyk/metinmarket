import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import { checkRateLimit } from "../../../lib/rate-limit";
import { blockIfMaintenance } from "../../../lib/site-settings";
import { notifyBuyOrder } from "../../../lib/discord-notifications";
import {
  cleanMultiline,
  cleanText,
  formatContact,
  isValidCentPrice,
  normalizeCentPrice,
  verifyTurnstile,
} from "../../../lib/public-submit";

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const rateLimit = checkRateLimit(request, "buy-orders");

  if (!rateLimit.ok) {
    return Response.json(
      { error: `Too many requests. Try again in ${rateLimit.retryAfter}s.` },
      { status: 429 }
    );
  }

  const maintenanceResponse = await blockIfMaintenance(supabaseAdmin);

  if (maintenanceResponse) return maintenanceResponse;

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const captcha = await verifyTurnstile(String(body.captcha || ""), request);

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

  if (!isValidCentPrice(maxPrice)) {
    return Response.json(
      { error: "Enter a value between 0.01 and 0.99. Example: 0.40." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("buy_orders").insert({
    desired,
    server,
    type: "Wons",
    max_price: `${normalizeCentPrice(maxPrice)}€`,
    buyer_contact: formatContact(buyerContactMethod, buyerContact),
    message,
    status: "Open",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await notifyBuyOrder({
    supabaseAdmin,
    desired,
    server,
    maxPrice: `${normalizeCentPrice(maxPrice)} EUR`,
    buyerContact: formatContact(buyerContactMethod, buyerContact),
    message,
  });

  return Response.json({ success: true });
}
