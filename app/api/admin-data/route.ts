import { requireAdminRequest } from "../../../lib/admin-auth";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const auth = await requireAdminRequest(request, async (token) => {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error) return {};
    return { email: data.user?.email };
  });

  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const [
    submissions,
    listings,
    requests,
    buyOrders,
    saleRecords,
    reports,
    settings,
  ] = await Promise.all([
    supabaseAdmin
      .from("sale_submissions")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("interest_requests")
      .select(
        "*, listings (id, title, server, type, price, seller_expected_price, profit, status, is_active)"
      )
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("buy_orders")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("sale_records")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("listing_reports")
      .select("*, listings (id, title, server, type, price, status, is_active)")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "maintenance")
      .maybeSingle(),
  ]);

  const error = [
    submissions.error,
    listings.error,
    requests.error,
    buyOrders.error,
    saleRecords.error,
    reports.error,
  ].find(Boolean);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    submissions: submissions.data || [],
    listings: listings.data || [],
    requests: requests.data || [],
    buyOrders: buyOrders.data || [],
    saleRecords: saleRecords.data || [],
    reports: reports.data || [],
    maintenance: settings.data?.value || null,
  });
}
