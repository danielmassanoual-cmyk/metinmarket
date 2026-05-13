import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import { checkRateLimit } from "../../../lib/rate-limit";
import { blockIfMaintenance } from "../../../lib/site-settings";
import { notifyListingReport } from "../../../lib/discord-notifications";
import { cleanMultiline, cleanText, verifyTurnstile } from "../../../lib/public-submit";

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const rateLimit = checkRateLimit(request, "listing-reports");

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

  const listingId = cleanText(String(body.listing_id || ""), 80);
  const reason = cleanMultiline(String(body.reason || ""), 500);
  const reporterContact = cleanText(String(body.reporter_contact || ""), 80);

  if (!listingId || !reason) {
    return Response.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("listing_reports").insert({
    listing_id: listingId,
    reason,
    reporter_contact: reporterContact || null,
    status: "Open",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await notifyListingReport({
    supabaseAdmin,
    listingId,
    reason,
    reporterContact,
  });

  return Response.json({ success: true });
}
