import type { SupabaseClient } from "@supabase/supabase-js";

export async function getMaintenanceSettings(supabaseAdmin: SupabaseClient) {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "maintenance")
    .maybeSingle();

  if (error) {
    return {
      enabled: false,
      message:
        "Submissions are temporarily closed. Please try again later.",
    };
  }

  const value = data?.value as
    | { enabled?: boolean; message?: string }
    | null
    | undefined;

  return {
    enabled: Boolean(value?.enabled),
    message:
      value?.message ||
      "Submissions are temporarily closed. Please try again later.",
  };
}

export async function blockIfMaintenance(supabaseAdmin: SupabaseClient) {
  const maintenance = await getMaintenanceSettings(supabaseAdmin);

  if (!maintenance.enabled) {
    return null;
  }

  return Response.json({ error: maintenance.message }, { status: 503 });
}
