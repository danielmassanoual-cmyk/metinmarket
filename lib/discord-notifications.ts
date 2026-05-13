type SupabaseQuery = {
  eq: (column: string, value: string | boolean) => SupabaseQuery;
  limit: (count: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
  maybeSingle: () => Promise<{ data: unknown | null; error: { message: string } | null }>;
};

type SupabaseAdminClient = {
  from: (table: string) => {
    select: (columns: string) => SupabaseQuery;
  };
};

type DiscordField = {
  name: string;
  value: string;
  inline?: boolean;
};

type DiscordEmbed = {
  title: string;
  description?: string;
  color: number;
  fields?: DiscordField[];
  timestamp?: string;
  url?: string;
};

type ListingMatch = {
  id?: string;
  title?: string | null;
  server?: string | null;
  price?: string | null;
  status?: string | null;
  is_active?: boolean | null;
};

type BuyOrderMatch = {
  id?: string;
  desired?: string | null;
  server?: string | null;
  max_price?: string | null;
  status?: string | null;
};

let cachedAdminChannelId: string | null | undefined;

function truncate(value: string | null | undefined, maxLength: number) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function parseMoney(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const parsed = Number.parseFloat(
    String(value).replace(/[^\d,.-]/g, "").replace(",", ".")
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseQuantity(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const parsed = Number.parseInt(String(value).replace(/[^\d]/g, ""), 10);

  return Number.isFinite(parsed) ? parsed : 0;
}

function adminUrl() {
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  const baseUrl = (publicUrl || vercelUrl).replace(/\/$/, "");

  return baseUrl ? `${baseUrl}/admin` : undefined;
}

function normalizeChannelName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w-]/g, "")
    .toLowerCase();
}

function supabaseClient(client: unknown) {
  return client as SupabaseAdminClient;
}

async function discordApi<T>(
  method: "GET" | "POST",
  endpoint: string,
  body?: unknown
) {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) return null;

  const response = await fetch(`https://discord.com/api/v10${endpoint}`, {
    method,
    headers: {
      authorization: `Bot ${token}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    console.error(`Discord notification failed: ${response.status}`);
    return null;
  }

  return (await response.json().catch(() => null)) as T | null;
}

async function resolveAdminChannelId() {
  if (process.env.DISCORD_ADMIN_CHANNEL_ID) {
    return process.env.DISCORD_ADMIN_CHANNEL_ID;
  }

  if (cachedAdminChannelId !== undefined) {
    return cachedAdminChannelId;
  }

  const guildId = process.env.DISCORD_GUILD_ID;

  if (!guildId || !process.env.DISCORD_BOT_TOKEN) {
    cachedAdminChannelId = null;
    return null;
  }

  const channels = await discordApi<Array<{ id: string; name: string; type: number }>>(
    "GET",
    `/guilds/${guildId}/channels`
  );

  const staffChannel = channels?.find((channel) => {
    if (channel.type !== 0) return false;
    const name = normalizeChannelName(channel.name);
    return name === "staff" || name === "admin-logs" || name.includes("staff");
  });

  cachedAdminChannelId = staffChannel?.id || null;
  return cachedAdminChannelId;
}

async function sendDiscordNotification(embed: DiscordEmbed) {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const content = process.env.DISCORD_ADMIN_MENTION || undefined;
    const payload = { content, embeds: [embed] };

    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`Discord webhook notification failed: ${response.status}`);
      }

      return;
    }

    const channelId = await resolveAdminChannelId();

    if (!channelId) return;

    await discordApi("POST", `/channels/${channelId}/messages`, payload);
  } catch (error) {
    console.error("Discord notification error:", error);
  }
}

async function getListingTitle(
  supabaseAdmin: unknown,
  listingId: string
) {
  const result = await supabaseClient(supabaseAdmin)
    .from("listings")
    .select("id,title,server,type,price,status,is_active")
    .eq("id", listingId)
    .maybeSingle();

  const listing = result?.data as ListingMatch | null | undefined;

  if (!listing) return listingId;

  return `${listing.title || "Untitled"} - ${listing.server || "Unknown server"}`;
}

async function getActiveWonsMatches(
  supabaseAdmin: unknown,
  server: string,
  desired: string,
  maxPrice: string
) {
  const result = await supabaseClient(supabaseAdmin)
    .from("listings")
    .select("id,title,server,type,price,status,is_active")
    .eq("server", server)
    .eq("type", "Wons")
    .eq("is_active", true)
    .limit(20);

  const desiredQuantity = parseQuantity(desired);
  const maxPriceValue = parseMoney(maxPrice);
  const listings = (result?.data || []) as ListingMatch[];

  return listings
    .filter((listing) => {
      const quantity = parseQuantity(listing.title);
      const price = parseMoney(listing.price);

      return (
        quantity > 0 &&
        price > 0 &&
        quantity >= desiredQuantity &&
        price <= maxPriceValue
      );
    })
    .slice(0, 5);
}

async function getOpenBuyOrderMatches(
  supabaseAdmin: unknown,
  server: string,
  quantity: string,
  sellerPrice: string
) {
  const result = await supabaseClient(supabaseAdmin)
    .from("buy_orders")
    .select("id,desired,server,max_price,status")
    .eq("server", server)
    .eq("type", "Wons")
    .eq("status", "Open")
    .limit(20);

  const availableQuantity = parseQuantity(quantity);
  const sellerPriceValue = parseMoney(sellerPrice);
  const orders = (result?.data || []) as BuyOrderMatch[];

  return orders
    .filter((order) => {
      const desiredQuantity = parseQuantity(order.desired);
      const maxPriceValue = parseMoney(order.max_price);

      return (
        desiredQuantity > 0 &&
        maxPriceValue > 0 &&
        desiredQuantity <= availableQuantity &&
        maxPriceValue >= sellerPriceValue
      );
    })
    .slice(0, 5);
}

function matchSummary(matches: Array<ListingMatch | BuyOrderMatch>) {
  if (matches.length === 0) return "No automatic match found.";

  return matches
    .map((match, index) => {
      if ("max_price" in match) {
        return `${index + 1}. ${match.desired || "?"}w at ${match.max_price || "?"}`;
      }

      const listing = match as ListingMatch;
      return `${index + 1}. ${listing.title || "?"} at ${listing.price || "?"}`;
    })
    .join("\n");
}

export async function notifySaleSubmission(params: {
  supabaseAdmin: unknown;
  title: string;
  server: string;
  type: string;
  sellerExpectedPrice: string;
  sellerContact: string;
  imageCount: number;
}) {
  const matches =
    params.type === "Wons"
      ? await getOpenBuyOrderMatches(
          params.supabaseAdmin,
          params.server,
          params.title,
          params.sellerExpectedPrice
        )
      : [];

  await sendDiscordNotification({
    title: "New sale submission",
    description: "A seller submitted a new listing for admin approval.",
    color: 0x57f287,
    url: adminUrl(),
    timestamp: new Date().toISOString(),
    fields: [
      { name: "Type", value: truncate(params.type, 100), inline: true },
      { name: "Server", value: truncate(params.server, 100), inline: true },
      { name: "Title / quantity", value: truncate(params.title, 200), inline: true },
      {
        name: "Seller price",
        value: truncate(params.sellerExpectedPrice, 100),
        inline: true,
      },
      {
        name: "Images",
        value: String(params.imageCount),
        inline: true,
      },
      {
        name: "Seller contact",
        value: truncate(params.sellerContact, 300),
      },
      {
        name: "Compatible buy orders",
        value: truncate(matchSummary(matches), 1000),
      },
    ],
  });
}

export async function notifyInterestRequest(params: {
  supabaseAdmin: unknown;
  listingId: string;
  desired: string;
  maxPrice: string;
  buyerContact: string;
  message: string;
}) {
  const listingTitle = await getListingTitle(params.supabaseAdmin, params.listingId);

  await sendDiscordNotification({
    title: "New interest request",
    description: "A buyer sent interest for a listing.",
    color: 0x5865f2,
    url: adminUrl(),
    timestamp: new Date().toISOString(),
    fields: [
      { name: "Listing", value: truncate(listingTitle, 300) },
      { name: "Desired", value: truncate(params.desired, 100), inline: true },
      { name: "Max price", value: truncate(params.maxPrice || "Not provided", 100), inline: true },
      { name: "Buyer contact", value: truncate(params.buyerContact, 300) },
      { name: "Message", value: truncate(params.message || "No message.", 600) },
    ],
  });
}

export async function notifyBuyOrder(params: {
  supabaseAdmin: unknown;
  desired: string;
  server: string;
  maxPrice: string;
  buyerContact: string;
  message: string;
}) {
  const matches = await getActiveWonsMatches(
    params.supabaseAdmin,
    params.server,
    params.desired,
    params.maxPrice
  );

  await sendDiscordNotification({
    title: "New buy order",
    description: "A buyer created a Wons buy order.",
    color: 0xfee75c,
    url: adminUrl(),
    timestamp: new Date().toISOString(),
    fields: [
      { name: "Server", value: truncate(params.server, 100), inline: true },
      { name: "Quantity", value: truncate(params.desired, 100), inline: true },
      { name: "Max price", value: truncate(params.maxPrice, 100), inline: true },
      { name: "Buyer contact", value: truncate(params.buyerContact, 300) },
      { name: "Message", value: truncate(params.message || "No message.", 600) },
      { name: "Compatible listings", value: truncate(matchSummary(matches), 1000) },
    ],
  });
}

export async function notifyListingReport(params: {
  supabaseAdmin: unknown;
  listingId: string;
  reason: string;
  reporterContact: string;
}) {
  const listingTitle = await getListingTitle(params.supabaseAdmin, params.listingId);

  await sendDiscordNotification({
    title: "New listing report",
    description: "A public user reported a listing.",
    color: 0xed4245,
    url: adminUrl(),
    timestamp: new Date().toISOString(),
    fields: [
      { name: "Listing", value: truncate(listingTitle, 300) },
      { name: "Reason", value: truncate(params.reason, 700) },
      {
        name: "Reporter contact",
        value: truncate(params.reporterContact || "Not provided", 300),
      },
    ],
  });
}
