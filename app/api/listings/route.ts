import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const fallback = await supabase
    .from("listings")
    .select(
      "id, title, description, server, type, price, status, image_url, created_at"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (fallback.error) {
    return Response.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? fallback.error.message
            : "Could not load listings.",
      },
      { status: 500 }
    );
  }

  const withGallery = await supabase
    .from("listings")
    .select(
      "id, title, description, server, type, price, status, image_url, image_urls, created_at"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (!withGallery.error) {
    return Response.json({ listings: withGallery.data || [] });
  }

  return Response.json({ listings: fallback.data || [] });
}
