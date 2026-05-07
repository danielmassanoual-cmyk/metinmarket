import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("interest_requests")
    .select("listing_id, status")
    .not("listing_id", "is", null);

  if (error) {
    return Response.json({ listingIds: [] });
  }

  const listingIds = Array.from(
    new Set(
      (data || [])
        .filter((item) => {
          const status = String(item.status || "Open").toLowerCase();
          return status !== "sold" && status !== "cancelled";
        })
        .map((item) => item.listing_id)
        .filter(Boolean)
    )
  );

  return Response.json({ listingIds });
}
