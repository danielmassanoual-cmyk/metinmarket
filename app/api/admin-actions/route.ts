import { requireAdminRequest } from "../../../lib/admin-auth";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

type Listing = {
  id: string;
  title: string | null;
  description?: string | null;
  server: string | null;
  type: string | null;
  price: string | null;
  seller_expected_price?: string | null;
  profit?: number | null;
  status?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  seller_contact?: string | null;
  is_active?: boolean | null;
};

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

function cleanText(value: unknown, maxLength: number) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function moneyValue(value: unknown) {
  return cleanText(value, 12).replace(",", ".");
}

function isValidMoney(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 99999;
}

async function getListing(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, id: string) {
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) throw new Error(error?.message || "Listing not found.");
  return data as Listing;
}

async function getRecordedProfitForListing(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  listingId: string,
  excludeSaleId?: string
) {
  let query = supabaseAdmin
    .from("sale_records")
    .select("id, profit")
    .eq("listing_id", listingId);

  if (excludeSaleId) query = query.neq("id", excludeSaleId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).reduce(
    (total, record) => total + parseMoney(record.profit),
    0
  );
}

async function recordSale({
  supabaseAdmin,
  listing,
  sourceType,
  sourceId,
  quantity,
  profit,
  buyerContact,
}: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  listing: Listing;
  sourceType: string;
  sourceId?: string | null;
  quantity: number;
  profit: number;
  buyerContact?: string | null;
}) {
  const { error } = await supabaseAdmin.from("sale_records").insert({
    listing_id: listing.id,
    source_type: sourceType,
    source_id: sourceId || null,
    quantity,
    profit,
    listing_title: listing.title,
    listing_server: listing.server,
    buyer_contact: buyerContact || null,
  });

  if (error) throw new Error(error.message);
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const auth = await requireAdminRequest(request, async (token) => {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error) return {};
    return { email: data.user?.email };
  });

  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const action = cleanText(body.action, 60);

  try {
    if (action === "approveSubmission") {
      const id = cleanText(body.id, 80);
      const publicPrice = moneyValue(body.publicPrice);
      if (!id || !publicPrice) throw new Error("Missing approval data.");
      if (!isValidMoney(publicPrice)) throw new Error("Invalid public price.");

      const { data: item, error: itemError } = await supabaseAdmin
        .from("sale_submissions")
        .select("*")
        .eq("id", id)
        .single();
      if (itemError || !item) throw new Error(itemError?.message || "Submission not found.");

      const { error: insertError } = await supabaseAdmin.from("listings").insert({
        title: item.title,
        description: item.description,
        server: item.server,
        type: item.type,
        price: `${publicPrice}€`,
        seller_expected_price: item.seller_expected_price,
        profit: 0,
        image_url: item.image_url,
        image_urls: item.image_urls || (item.image_url ? [item.image_url] : []),
        seller_contact: item.seller_contact,
        status: "Available",
        is_active: true,
      });
      if (insertError) throw new Error(insertError.message);

      const { error: deleteError } = await supabaseAdmin
        .from("sale_submissions")
        .delete()
        .eq("id", id);
      if (deleteError) throw new Error(deleteError.message);
    } else if (action === "deleteSubmission") {
      const { error } = await supabaseAdmin
        .from("sale_submissions")
        .delete()
        .eq("id", cleanText(body.id, 80));
      if (error) throw new Error(error.message);
    } else if (action === "markListingSold") {
      const listing = await getListing(supabaseAdmin, cleanText(body.id, 80));
      const quantity = listing.type === "Wons" ? parseQuantity(listing.title) : 1;
      const profit =
        (parseMoney(listing.price) - parseMoney(listing.seller_expected_price)) *
        quantity;
      const nextProfit =
        (await getRecordedProfitForListing(supabaseAdmin, listing.id)) + profit;

      const { error } = await supabaseAdmin
        .from("listings")
        .update({ status: "Sold", is_active: false, profit: nextProfit })
        .eq("id", listing.id);
      if (error) throw new Error(error.message);

      await recordSale({
        supabaseAdmin,
        listing,
        sourceType: "manual",
        quantity,
        profit,
      });
    } else if (action === "markBuyOrderSold") {
      const orderId = cleanText(body.orderId, 80);
      const listing = await getListing(supabaseAdmin, cleanText(body.listingId, 80));
      const { data: order, error: orderReadError } = await supabaseAdmin
        .from("buy_orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (orderReadError || !order) {
        throw new Error(orderReadError?.message || "Buy order not found.");
      }

      const soldQuantity = parseQuantity(body.quantity as string);
      const availableQuantity = parseQuantity(listing.title);
      const requestedQuantity = parseQuantity(order.desired);
      const soldPrice = moneyValue(body.soldPrice || listing.price);
      const buyPrice = moneyValue(body.buyPrice || listing.seller_expected_price);

      if (!soldQuantity || soldQuantity <= 0) throw new Error("Invalid quantity.");
      if (!isValidMoney(soldPrice)) throw new Error("Invalid sold price.");
      if (!isValidMoney(buyPrice)) throw new Error("Invalid buy price.");
      if (soldQuantity > availableQuantity) throw new Error("Quantity too high.");
      if (requestedQuantity > 0 && soldQuantity > requestedQuantity) {
        throw new Error("Quantity is higher than the buy order.");
      }

      const remainingQuantity = Math.max(availableQuantity - soldQuantity, 0);
      const saleProfit =
        (parseMoney(soldPrice) - parseMoney(buyPrice)) * soldQuantity;
      const nextProfit =
        (await getRecordedProfitForListing(supabaseAdmin, listing.id)) +
        saleProfit;
      const listingUpdate =
        remainingQuantity > 0
          ? {
              title: String(remainingQuantity),
              profit: nextProfit,
              status: "Available",
              is_active: true,
            }
          : {
              title: "0",
              profit: nextProfit,
              status: "Sold",
              is_active: false,
            };

      const { error: listingError } = await supabaseAdmin
        .from("listings")
        .update(listingUpdate)
        .eq("id", listing.id);
      if (listingError) throw new Error(listingError.message);

      await recordSale({
        supabaseAdmin,
        listing,
        sourceType: "buy_order",
        sourceId: orderId,
        quantity: soldQuantity,
        profit: saleProfit,
        buyerContact: order.buyer_contact,
      });

      const { error: orderError } = await supabaseAdmin
        .from("buy_orders")
        .update({ status: "Sold" })
        .eq("id", orderId);
      if (orderError) throw new Error(orderError.message);
    } else if (action === "cancelBuyOrder" || action === "deleteBuyOrder") {
      const id = cleanText(body.id, 80);
      const query =
        action === "cancelBuyOrder"
          ? supabaseAdmin.from("buy_orders").update({ status: "Cancelled" }).eq("id", id)
          : supabaseAdmin.from("buy_orders").delete().eq("id", id);
      const { error } = await query;
      if (error) throw new Error(error.message);
    } else if (action === "markInterestSold") {
      const requestId = cleanText(body.requestId, 80);
      const sellerId = cleanText(body.sellerId, 80);
      const selectedListing = await getListing(supabaseAdmin, sellerId);
      const { data: interestRequest, error: requestReadError } = await supabaseAdmin
        .from("interest_requests")
        .select("*")
        .eq("id", requestId)
        .single();
      if (requestReadError || !interestRequest) {
        throw new Error(requestReadError?.message || "Buyer request not found.");
      }

      const soldQuantity =
        selectedListing.type === "Wons" ? parseQuantity(body.quantity as string) : 1;
      const availableQuantity =
        selectedListing.type === "Wons" ? parseQuantity(selectedListing.title) : 1;
      const requestedQuantity = parseQuantity(interestRequest.desired);
      const soldPrice = moneyValue(body.soldPrice || selectedListing.price);
      const buyPrice = moneyValue(
        body.buyPrice || selectedListing.seller_expected_price
      );

      if (!soldQuantity || soldQuantity <= 0) throw new Error("Invalid quantity.");
      if (!isValidMoney(soldPrice)) throw new Error("Invalid sold price.");
      if (!isValidMoney(buyPrice)) throw new Error("Invalid buy price.");
      if (selectedListing.type === "Wons" && soldQuantity > availableQuantity) {
        throw new Error("Quantity too high.");
      }
      if (
        selectedListing.type === "Wons" &&
        requestedQuantity > 0 &&
        soldQuantity > requestedQuantity
      ) {
        throw new Error("Quantity is higher than the buyer request.");
      }

      const remainingQuantity =
        selectedListing.type === "Wons"
          ? Math.max(availableQuantity - soldQuantity, 0)
          : 0;
      const saleProfit =
        (parseMoney(soldPrice) - parseMoney(buyPrice)) * soldQuantity;
      const nextProfit =
        (await getRecordedProfitForListing(supabaseAdmin, selectedListing.id)) +
        saleProfit;
      const listingUpdate =
        selectedListing.type === "Wons" && remainingQuantity > 0
          ? {
              title: String(remainingQuantity),
              profit: nextProfit,
              status: "Available",
              is_active: true,
            }
          : {
              title:
                selectedListing.type === "Wons" ? "0" : selectedListing.title,
              profit: nextProfit,
              status: "Sold",
              is_active: false,
            };

      const { error: listingError } = await supabaseAdmin
        .from("listings")
        .update(listingUpdate)
        .eq("id", selectedListing.id);
      if (listingError) throw new Error(listingError.message);

      await recordSale({
        supabaseAdmin,
        listing: selectedListing,
        sourceType: "buyer_request",
        sourceId: requestId,
        quantity: soldQuantity,
        profit: saleProfit,
        buyerContact: interestRequest.buyer_contact,
      });

      const { error: requestError } = await supabaseAdmin
        .from("interest_requests")
        .update({ status: "Sold" })
        .eq("id", requestId);
      if (requestError) throw new Error(requestError.message);
    } else if (action === "cancelInterestRequest" || action === "deleteInterestRequest") {
      const id = cleanText(body.id, 80);
      const query =
        action === "cancelInterestRequest"
          ? supabaseAdmin
              .from("interest_requests")
              .update({ status: "Cancelled" })
              .eq("id", id)
          : supabaseAdmin.from("interest_requests").delete().eq("id", id);
      const { error } = await query;
      if (error) throw new Error(error.message);
    } else if (action === "removeSaleRecord") {
      const id = cleanText(body.id, 80);
      const { data: record, error: recordError } = await supabaseAdmin
        .from("sale_records")
        .select("*")
        .eq("id", id)
        .single();
      if (recordError || !record) throw new Error(recordError?.message || "Sale not found.");

      const listing = await getListing(supabaseAdmin, record.listing_id);
      const restoredQuantity =
        listing.type === "Wons"
          ? parseQuantity(listing.title) + parseQuantity(record.quantity)
          : parseQuantity(listing.title) || parseQuantity(record.quantity);
      const nextProfit = Math.max(
        await getRecordedProfitForListing(supabaseAdmin, listing.id, id),
        0
      );

      const { error: listingError } = await supabaseAdmin
        .from("listings")
        .update({
          title: listing.type === "Wons" ? String(restoredQuantity) : listing.title,
          profit: nextProfit,
          status: "Available",
          is_active: true,
        })
        .eq("id", listing.id);
      if (listingError) throw new Error(listingError.message);

      const { error: saleError } = await supabaseAdmin
        .from("sale_records")
        .delete()
        .eq("id", id);
      if (saleError) throw new Error(saleError.message);
    } else if (action === "setListingActive") {
      const { error } = await supabaseAdmin
        .from("listings")
        .update({
          is_active: Boolean(body.isActive),
          ...(body.status ? { status: cleanText(body.status, 40) } : {}),
        })
        .eq("id", cleanText(body.id, 80));
      if (error) throw new Error(error.message);
    } else if (action === "deleteListing") {
      const { error } = await supabaseAdmin
        .from("listings")
        .delete()
        .eq("id", cleanText(body.id, 80));
      if (error) throw new Error(error.message);
    } else if (action === "saveAdminNote") {
      const table = cleanText(body.table, 40);
      if (!["sale_records", "interest_requests", "listing_reports"].includes(table)) {
        throw new Error("Invalid note target.");
      }
      const { error } = await supabaseAdmin
        .from(table)
        .update({ admin_note: cleanText(body.note, 2000) || null })
        .eq("id", cleanText(body.id, 80));
      if (error) throw new Error(error.message);
    } else if (action === "saveMaintenance") {
      const value = body.value as { enabled?: unknown; message?: unknown };
      const { error } = await supabaseAdmin
        .from("site_settings")
        .update({
          value: {
            enabled: Boolean(value?.enabled),
            message:
              cleanText(value?.message, 300) ||
              "Submissions are temporarily closed. Please try again later.",
          },
          updated_at: new Date().toISOString(),
        })
        .eq("key", "maintenance");
      if (error) throw new Error(error.message);
    } else if (action === "resolveReport" || action === "deleteReport") {
      const id = cleanText(body.id, 80);
      const query =
        action === "resolveReport"
          ? supabaseAdmin
              .from("listing_reports")
              .update({ status: "Resolved" })
              .eq("id", id)
          : supabaseAdmin.from("listing_reports").delete().eq("id", id);
      const { error } = await query;
      if (error) throw new Error(error.message);
    } else if (action === "saveListingEdit") {
      const { error } = await supabaseAdmin
        .from("listings")
        .update({
          title: cleanText(body.title, 80),
          description: cleanText(body.description, 500),
          server: cleanText(body.server, 40),
          type: cleanText(body.type, 20),
          price: cleanText(body.price, 20),
          status: cleanText(body.status, 40),
        })
        .eq("id", cleanText(body.id, 80));
      if (error) throw new Error(error.message);
    } else {
      throw new Error("Unknown admin action.");
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Admin action failed." },
      { status: 400 }
    );
  }
}
