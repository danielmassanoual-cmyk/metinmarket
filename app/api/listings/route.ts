import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(
      "id, title, description, server, type, price, status, image_url, created_at"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: "Could not load listings." }, { status: 500 });
  }

  return Response.json({ listings: data || [] });
}
