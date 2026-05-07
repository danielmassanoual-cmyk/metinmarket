"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

const servers = ["Iberia", "Tigerghost", "Ruby", "Azrael", "Teutonia"];
const types = ["Item", "Conta", "Wons"];
const allowedAdminEmail = "danielmassano.ual@gmail.com";
const adminPageSize = 8;

type SaleSubmission = {
  id: string;
  title: string;
  description: string | null;
  server: string;
  type: string;
  seller_expected_price: string | null;
  seller_contact: string | null;
  image_url: string | null;
};

type Listing = {
  id: string;
  title: string;
  description: string | null;
  server: string;
  type: string;
  price: string;
  seller_expected_price?: string | null;
  profit?: number | null;
  status: string | null;
  image_url: string | null;
  seller_contact: string | null;
  is_active: boolean;
};

type InterestRequest = {
  id: string;
  desired: string | null;
  max_price: string | null;
  buyer_contact: string;
  message: string | null;
  status: string | null;
  admin_note?: string | null;
  listings: {
    id: string;
    title: string | null;
    server: string | null;
    type: string | null;
    price: string | null;
    seller_expected_price: string | null;
    profit: number | null;
    status: string | null;
    is_active: boolean | null;
  } | null;
};

type BuyOrder = {
  id: string;
  desired: string;
  server: string;
  type: string;
  max_price: string | null;
  buyer_contact: string;
  message: string | null;
  status: string | null;
};

type SaleRecord = {
  id: string;
  listing_id: string;
  source_type: string;
  source_id: string | null;
  quantity: number;
  profit: number;
  listing_title: string | null;
  listing_server: string | null;
  buyer_contact: string | null;
  created_at: string | null;
  admin_note?: string | null;
};

type ListingReport = {
  id: string;
  listing_id: string | null;
  reason: string;
  reporter_contact: string | null;
  status: string | null;
  created_at: string | null;
  admin_note?: string | null;
  listings: {
    id: string;
    title: string | null;
    server: string | null;
    type: string | null;
    price: string | null;
    status: string | null;
    is_active: boolean | null;
  } | null;
};

type MaintenanceSettings = {
  enabled: boolean;
  message: string;
};

type NoteTarget = {
  table: "sale_records" | "interest_requests" | "listing_reports";
  id: string;
  note: string;
} | null;

type ListingEditData = Partial<
  Pick<Listing, "title" | "description" | "server" | "type" | "price" | "status">
>;

  function parseMoney(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const normalized = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatServerLabel(value: string | null | undefined) {
  return (value || "-").replace(/^EUW-/, "");
}

function formatEuro(value: number) {
  return `${value.toFixed(2)}€`;
}

function formatPriceInput(value: string | number | null | undefined) {
  const parsed = parseMoney(value);

  return parsed ? parsed.toFixed(2) : "";
}

function parseQuantity(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const parsed = Number.parseInt(value.replace(/[^\d]/g, ""), 10);

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseContact(value: string | null | undefined) {
  if (!value) {
    return { method: "-", handle: "-" };
  }

  const separatorIndex = value.indexOf(":");

  if (separatorIndex === -1) {
    return { method: "-", handle: value };
  }

  return {
    method: value.slice(0, separatorIndex).trim() || "-",
    handle: value.slice(separatorIndex + 1).trim() || "-",
  };
}

function ContactInfo({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const contact = parseContact(value);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-bold uppercase text-neutral-500">{label}</p>
      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
        <p>
          <span className="text-neutral-400">Method:</span>{" "}
          <strong>{contact.method}</strong>
        </p>
        <p>
          <span className="text-neutral-400">Contact:</span>{" "}
          <strong>{contact.handle}</strong>
        </p>
      </div>
    </div>
  );
}

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submissions, setSubmissions] = useState<SaleSubmission[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<InterestRequest[]>([]);
  const [buyOrders, setBuyOrders] = useState<BuyOrder[]>([]);
  const [saleRecords, setSaleRecords] = useState<SaleRecord[]>([]);
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceSettings>({
    enabled: false,
    message: "Submissions are temporarily closed. Please try again later.",
  });
  const [openedImage, setOpenedImage] = useState<string | null>(null);
  const [noteTarget, setNoteTarget] = useState<NoteTarget>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [publicPrices, setPublicPrices] = useState<Record<string, string>>({});
  const [matchQuantities, setMatchQuantities] = useState<Record<string, string>>(
    {}
  );
  const [matchPrices, setMatchPrices] = useState<Record<string, string>>({});
  const [matchSellerSelections, setMatchSellerSelections] = useState<
    Record<string, string>
  >({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<ListingEditData>({});
  const [isFetching, setIsFetching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState("sales");
  const [adminPage, setAdminPage] = useState(1);
  const isAllowedAdmin =
    session?.user.email?.toLowerCase() === allowedAdminEmail.toLowerCase();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const requireSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      setSession(null);
      alert("Your admin session has expired. Please sign in again.");
      return false;
    }

    if (
      data.session.user.email?.toLowerCase() !== allowedAdminEmail.toLowerCase()
    ) {
      alert("Access denied");
      return false;
    }

    return true;
  }, []);

  const fetchAll = useCallback(async () => {
    if (!(await requireSession())) return;
    setIsFetching(true);

    const { data: subs } = await supabase
      .from("sale_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: list } = await supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: reqs } = await supabase
      .from("interest_requests")
      .select(
        `*, listings (id, title, server, type, price, seller_expected_price, profit, status, is_active)`
      )
      .order("created_at", { ascending: false });

    const { data: orders } = await supabase
      .from("buy_orders")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: sales } = await supabase
      .from("sale_records")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: reportRows } = await supabase
      .from("listing_reports")
      .select(
        `*, listings (id, title, server, type, price, status, is_active)`
      )
      .order("created_at", { ascending: false });

    const { data: settingsRow, error: settingsError } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "maintenance")
      .maybeSingle();

    const maintenanceValue = settingsRow?.value as
      | MaintenanceSettings
      | null
      | undefined;

    setSubmissions(subs || []);
    setListings(list || []);
    setRequests(reqs || []);
    setBuyOrders(orders || []);
    setSaleRecords(sales || []);
    setReports(reportRows || []);
    if (!settingsError && maintenanceValue) {
      setMaintenance({
        enabled: Boolean(maintenanceValue.enabled),
        message:
          maintenanceValue.message ||
          "Submissions are temporarily closed. Please try again later.",
      });
    }
    setIsFetching(false);
  }, [requireSession]);

  useEffect(() => {
    if (isAllowedAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAll();
    }
  }, [fetchAll, isAllowedAdmin]);

  async function login() {
    setAuthError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    setPassword("");
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setSubmissions([]);
    setListings([]);
    setRequests([]);
    setBuyOrders([]);
    setSaleRecords([]);
    setReports([]);
  }

  async function approve(item: SaleSubmission) {
    if (!(await requireSession())) return;

    const publicPrice = publicPrices[item.id];

    if (!publicPrice) {
      alert("Please set a public price before approving.");
      return;
    }

    setActionLoading(`approve-${item.id}`);
    const { error } = await supabase.from("listings").insert({
      title: item.title,
      description: item.description,
      server: item.server,
      type: item.type,
      price: `${publicPrice}‚€`,
      seller_expected_price: item.seller_expected_price,
      profit: 0,
      image_url: item.image_url,
      seller_contact: item.seller_contact,
      status: "Available",
      is_active: true,
    });

    if (error) {
      setActionLoading(null);
      alert(error.message);
      return;
    }

    await supabase.from("sale_submissions").delete().eq("id", item.id);
    setActionLoading(null);
    fetchAll();
  }

  async function reject(id: string) {
    if (!(await requireSession())) return;
    if (!confirm("Reject this submission?")) return;
    setActionLoading(`reject-${id}`);
    await supabase.from("sale_submissions").delete().eq("id", id);
    setActionLoading(null);
    fetchAll();
  }

  async function recordSale({
    listing,
    sourceType,
    sourceId,
    quantity,
    profit,
    buyerContact,
  }: {
    listing: Listing;
    sourceType: string;
    sourceId?: string | null;
    quantity: number;
    profit: number;
    buyerContact?: string | null;
  }) {
    const { error } = await supabase.from("sale_records").insert({
      listing_id: listing.id,
      source_type: sourceType,
      source_id: sourceId || null,
      quantity,
      profit,
      listing_title: listing.title,
      listing_server: listing.server,
      buyer_contact: buyerContact || null,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  function getRecordedProfitForListing(listingId: string, excludeSaleId?: string) {
    return saleRecords.reduce((total, record) => {
      if (record.listing_id !== listingId || record.id === excludeSaleId) {
        return total;
      }

      return total + parseMoney(record.profit);
    }, 0);
  }

  async function markSold(id: string) {
    if (!(await requireSession())) return;
    const listing = listings.find((item) => item.id === id);
    if (!listing) return;

    const quantity = listing.type === "Wons" ? parseQuantity(listing.title) : 1;
    const profitPerUnit =
      parseMoney(listing.price) - parseMoney(listing.seller_expected_price);
    const profit = profitPerUnit * quantity;
    const nextProfit = getRecordedProfitForListing(listing.id) + profit;

    setActionLoading(`sold-${id}`);
    const { error } = await supabase
      .from("listings")
      .update({ status: "Sold", is_active: false, profit: nextProfit })
      .eq("id", id);

    if (error) {
      setActionLoading(null);
      alert(error.message);
      return;
    }

    try {
      await recordSale({
        listing,
        sourceType: "manual",
        quantity,
        profit,
      });
    } catch (error) {
      setActionLoading(null);
      alert(error instanceof Error ? error.message : "Could not record sale.");
      return;
    }

    setActionLoading(null);
    fetchAll();
  }

  async function markBuyOrderSold(order: BuyOrder, listing: Listing) {
    if (!(await requireSession())) return;

    const quantityKey = `${order.id}-${listing.id}`;
    const requestedQuantity = parseQuantity(order.desired);
    const availableQuantity = parseQuantity(listing.title);
    const soldQuantity = parseQuantity(
      matchQuantities[quantityKey] || order.desired
    );

    if (!soldQuantity || soldQuantity <= 0) {
      alert("Please enter a valid Wons quantity sold.");
      return;
    }

    if (parseMoney(matchPrices[quantityKey] || listing.price) <= 0) {
      alert("Please enter a valid sold price.");
      return;
    }

    if (soldQuantity > availableQuantity) {
      alert("Sold quantity can not be higher than the listing quantity.");
      return;
    }

    if (requestedQuantity > 0 && soldQuantity > requestedQuantity) {
      alert("Sold quantity can not be higher than the buy order quantity.");
      return;
    }

    if (
      !confirm(
        `Confirm sale of ${soldQuantity}W from listing ${listing.title} for this buy order?`
      )
    ) {
      return;
    }

    const remainingQuantity = Math.max(availableQuantity - soldQuantity, 0);
    const profitPerWon =
      parseMoney(matchPrices[quantityKey] || listing.price) -
      parseMoney(listing.seller_expected_price);
    const saleProfit = profitPerWon * soldQuantity;
    const nextProfit = getRecordedProfitForListing(listing.id) + saleProfit;
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

    setActionLoading(`match-sold-${quantityKey}`);

    const { error: listingError } = await supabase
      .from("listings")
      .update(listingUpdate)
      .eq("id", listing.id);

    if (listingError) {
      setActionLoading(null);
      alert(listingError.message);
      return;
    }

    try {
      await recordSale({
        listing,
        sourceType: "buy_order",
        sourceId: order.id,
        quantity: soldQuantity,
        profit: saleProfit,
        buyerContact: order.buyer_contact,
      });
    } catch (error) {
      setActionLoading(null);
      alert(error instanceof Error ? error.message : "Could not record sale.");
      return;
    }

    const { error: orderError } = await supabase
      .from("buy_orders")
      .update({ status: "Sold" })
      .eq("id", order.id);

    if (orderError) {
      setActionLoading(null);
      alert(orderError.message);
      return;
    }

    setMatchQuantities((current) => {
      const next = { ...current };
      delete next[quantityKey];
      return next;
    });
    setMatchPrices((current) => {
      const next = { ...current };
      delete next[quantityKey];
      return next;
    });
    setActionLoading(null);
    fetchAll();
  }

  async function cancelBuyOrderMatch(order: BuyOrder, listing: Listing) {
    if (!(await requireSession())) return;
    if (!confirm(`Cancel this match for ${listing.title}?`)) return;

    const quantityKey = `${order.id}-${listing.id}`;
    setActionLoading(`match-cancel-${quantityKey}`);
    const { error } = await supabase
      .from("buy_orders")
      .update({ status: "Cancelled" })
      .eq("id", order.id);

    if (error) {
      setActionLoading(null);
      alert(error.message);
      return;
    }

    setActionLoading(null);
    fetchAll();
  }

  async function markInterestSold(request: InterestRequest) {
    if (!(await requireSession())) return;

    const sellerMatches = getInterestSellerMatches(request);
    const listing = sellerMatches[0];

    if (!listing) {
      alert("This request no longer has a listing attached.");
      return;
    }

    const quantityKey = `request-${request.id}-${listing.id}`;
    const selectedSellerId = matchSellerSelections[quantityKey];
    const selectedSeller =
      (selectedSellerId &&
        sellerMatches.find((seller) => seller.id === selectedSellerId)) ||
      listing;
    const saleSellerMatches =
      listing.type === "Wons" ? [selectedSeller] : sellerMatches;
    const soldPrice = matchPrices[quantityKey] || listing.price;
    const requestedQuantity = parseQuantity(request.desired);
    const availableQuantity =
      listing.type === "Wons"
        ? parseQuantity(selectedSeller.title)
        : parseQuantity(listing.title);
    const soldQuantity =
      listing.type === "Wons"
        ? parseQuantity(matchQuantities[quantityKey] || request.desired)
        : 1;

    if (!soldQuantity || soldQuantity <= 0) {
      alert("Please enter a valid quantity sold.");
      return;
    }

    if (parseMoney(matchPrices[quantityKey] || listing.price) <= 0) {
      alert("Please enter a valid sold price.");
      return;
    }

    if (listing.type === "Wons" && soldQuantity > availableQuantity) {
      alert("Sold quantity can not be higher than the listing quantity.");
      return;
    }

    if (
      listing.type === "Wons" &&
      requestedQuantity > 0 &&
      soldQuantity > requestedQuantity
    ) {
      alert("Sold quantity can not be higher than the buyer request quantity.");
      return;
    }

    if (
      !confirm(
        `Confirm sale of ${soldQuantity}${
          listing.type === "Wons" ? "W" : ""
        } for this buyer request from ${
          listing.type === "Wons"
            ? selectedSeller.seller_contact || selectedSeller.title
            : `${sellerMatches.length} seller(s)`
        }?`
      )
    ) {
      return;
    }

    setActionLoading(`request-sold-${request.id}`);

    let remainingToSell = soldQuantity;

    for (const sellerListing of saleSellerMatches) {
      if (remainingToSell <= 0) break;

      const sellerQuantity =
        sellerListing.type === "Wons" ? parseQuantity(sellerListing.title) : 1;
      const quantityFromSeller =
        sellerListing.type === "Wons"
          ? Math.min(sellerQuantity, remainingToSell)
          : 1;

      if (!quantityFromSeller) continue;

      const remainingQuantity =
        sellerListing.type === "Wons"
          ? Math.max(sellerQuantity - quantityFromSeller, 0)
          : 0;
      const profitPerUnit =
        parseMoney(soldPrice) -
        parseMoney(sellerListing.seller_expected_price);
      const saleProfit = profitPerUnit * quantityFromSeller;
      const nextProfit =
        getRecordedProfitForListing(sellerListing.id) + saleProfit;
      const listingUpdate =
        sellerListing.type === "Wons" && remainingQuantity > 0
          ? {
              title: String(remainingQuantity),
              profit: nextProfit,
              status: "Available",
              is_active: true,
            }
          : {
              title: sellerListing.type === "Wons" ? "0" : sellerListing.title,
              profit: nextProfit,
              status: "Sold",
              is_active: false,
            };

      const { error: listingError } = await supabase
        .from("listings")
        .update(listingUpdate)
        .eq("id", sellerListing.id);

      if (listingError) {
        setActionLoading(null);
        alert(listingError.message);
        return;
      }

      try {
        await recordSale({
          listing: sellerListing,
          sourceType: "buyer_request",
          sourceId: request.id,
          quantity: quantityFromSeller,
          profit: saleProfit,
          buyerContact: request.buyer_contact,
        });
      } catch (error) {
        setActionLoading(null);
        alert(error instanceof Error ? error.message : "Could not record sale.");
        return;
      }

      remainingToSell -= quantityFromSeller;
    }

    const { error: requestError } = await supabase
      .from("interest_requests")
      .update({ status: "Sold" })
      .eq("id", request.id);

    if (requestError) {
      setActionLoading(null);
      alert(requestError.message);
      return;
    }

    setMatchQuantities((current) => {
      const next = { ...current };
      delete next[quantityKey];
      return next;
    });
    setMatchPrices((current) => {
      const next = { ...current };
      delete next[quantityKey];
      return next;
    });
    setMatchSellerSelections((current) => {
      const next = { ...current };
      delete next[quantityKey];
      return next;
    });
    setActionLoading(null);
    fetchAll();
  }

  async function cancelInterestRequest(id: string) {
    if (!(await requireSession())) return;
    if (!confirm("Cancel this buyer request?")) return;

    setActionLoading(`request-cancel-${id}`);
    const { error } = await supabase
      .from("interest_requests")
      .update({ status: "Cancelled" })
      .eq("id", id);

    if (error) {
      setActionLoading(null);
      alert(error.message);
      return;
    }

    setActionLoading(null);
    fetchAll();
  }

  async function removeSaleRecord(record: SaleRecord) {
    if (!(await requireSession())) return;
    if (!confirm("Remove this sale and reverse its profit/quantity?")) return;

    const listing = listings.find((item) => item.id === record.listing_id);
    if (!listing) {
      alert("Listing not found. Can not reverse this sale safely.");
      return;
    }

    const restoredQuantity =
      listing.type === "Wons"
        ? parseQuantity(listing.title) + record.quantity
        : parseQuantity(listing.title) || record.quantity;
    const nextProfit = Math.max(
      getRecordedProfitForListing(listing.id, record.id),
      0
    );

    setActionLoading(`remove-sale-${record.id}`);
    const { error: listingError } = await supabase
      .from("listings")
      .update({
        title: listing.type === "Wons" ? String(restoredQuantity) : listing.title,
        profit: nextProfit,
        status: "Available",
        is_active: true,
      })
      .eq("id", listing.id);

    if (listingError) {
      setActionLoading(null);
      alert(listingError.message);
      return;
    }

    const { error: saleError } = await supabase
      .from("sale_records")
      .delete()
      .eq("id", record.id);

    if (saleError) {
      setActionLoading(null);
      alert(saleError.message);
      return;
    }

    setActionLoading(null);
    fetchAll();
  }

  async function deactivate(id: string) {
    if (!(await requireSession())) return;
    setActionLoading(`deactivate-${id}`);
    await supabase.from("listings").update({ is_active: false }).eq("id", id);
    setActionLoading(null);
    fetchAll();
  }

  async function reactivate(id: string) {
    if (!(await requireSession())) return;

    setActionLoading(`reactivate-${id}`);
    await supabase
      .from("listings")
      .update({ is_active: true, status: "Available" })
      .eq("id", id);

    setActionLoading(null);
    fetchAll();
  }

  async function deleteListing(id: string) {
    if (!(await requireSession())) return;
    if (!confirm("Delete this listing permanently?")) return;
    setActionLoading(`delete-listing-${id}`);
    await supabase.from("listings").delete().eq("id", id);
    setActionLoading(null);
    fetchAll();
  }

  async function deleteRequest(id: string) {
    if (!(await requireSession())) return;
    setActionLoading(`delete-request-${id}`);
    await supabase.from("interest_requests").delete().eq("id", id);
    setActionLoading(null);
    fetchAll();
  }

  async function deleteBuyOrder(id: string) {
    if (!(await requireSession())) return;
    setActionLoading(`delete-buy-order-${id}`);
    await supabase.from("buy_orders").delete().eq("id", id);
    setActionLoading(null);
    fetchAll();
  }

  async function saveAdminNote(
    table: "sale_records" | "interest_requests" | "listing_reports",
    id: string,
    note: string
  ) {
    if (!(await requireSession())) return;

    setActionLoading(`note-${table}-${id}`);
    const { error } = await supabase
      .from(table)
      .update({ admin_note: note.trim() || null })
      .eq("id", id);

    if (error) {
      setActionLoading(null);
      alert(
        error.message.includes("site_settings")
          ? "Maintenance settings table is missing. Run supabase-site-settings.sql in Supabase first."
          : error.message
      );
      return;
    }

    setActionLoading(null);
    setNoteTarget(null);
    setNoteDraft("");
    fetchAll();
  }

  function openNoteModal(
    table: "sale_records" | "interest_requests" | "listing_reports",
    id: string,
    currentNote?: string | null
  ) {
    setNoteTarget({ table, id, note: currentNote || "" });
    setNoteDraft(currentNote || "");
  }

  async function saveMaintenance(next: MaintenanceSettings) {
    if (!(await requireSession())) return;

    setActionLoading("maintenance");
    const { error } = await supabase
      .from("site_settings")
      .update({
        value: next,
        updated_at: new Date().toISOString(),
      })
      .eq("key", "maintenance");

    if (error) {
      setActionLoading(null);
      alert(error.message);
      return;
    }

    setMaintenance(next);
    setActionLoading(null);
  }

  function exportSalesCsv() {
    const rows = [
      [
        "date",
        "source",
        "listing",
        "server",
        "quantity",
        "profit",
        "buyer_contact",
        "admin_note",
      ],
      ...saleRecords.map((sale) => [
        sale.created_at || "",
        sale.source_type || "",
        sale.listing_title || "",
        sale.listing_server || "",
        String(sale.quantity || ""),
        String(sale.profit || ""),
        sale.buyer_contact || "",
        sale.admin_note || "",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `asrold-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function resolveReport(id: string) {
    if (!(await requireSession())) return;
    setActionLoading(`resolve-report-${id}`);
    await supabase
      .from("listing_reports")
      .update({ status: "Resolved" })
      .eq("id", id);
    setActionLoading(null);
    fetchAll();
  }

  async function deleteReport(id: string) {
    if (!(await requireSession())) return;
    setActionLoading(`delete-report-${id}`);
    await supabase.from("listing_reports").delete().eq("id", id);
    setActionLoading(null);
    fetchAll();
  }

  async function saveEdit(id: string) {
    if (!(await requireSession())) return;

    setActionLoading(`save-${id}`);
    const { error } = await supabase
      .from("listings")
      .update({
        title: editData.title,
        description: editData.description,
        server: editData.server,
        type: editData.type,
        price: editData.price,
        status: editData.status,
      })
      .eq("id", id);

    if (error) {
      setActionLoading(null);
      alert(error.message);
      return;
    }

    setEditing(null);
    setEditData({});
    setActionLoading(null);
    fetchAll();
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_30rem),#050505] px-5 text-white">
        <div className="text-sm text-neutral-400">Checking admin session...</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_30rem),#050505] px-5 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900/90 p-6 shadow-2xl shadow-black/40">
          <h1 className="mb-2 text-2xl font-black">Admin Access</h1>
          <p className="mb-5 text-sm text-neutral-400">
            Sign in with an authorized Supabase user.
          </p>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-3 w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") login();
            }}
            className="w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
          />

          {authError && (
            <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {authError}
            </p>
          )}

          <button
            onClick={login}
            className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-bold text-black shadow-lg shadow-white/10 hover:bg-neutral-200"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  if (!isAllowedAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_30rem),#050505] px-5 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900/90 p-6 shadow-2xl shadow-black/40">
          <h1 className="mb-2 text-2xl font-black">Admin Access</h1>
          <p className="mb-5 text-sm text-neutral-400">Access denied</p>

          <button
            onClick={logout}
            className="w-full rounded-xl bg-white px-4 py-3 font-bold text-black shadow-lg shadow-white/10 hover:bg-neutral-200"
          >
            Logout
          </button>
        </div>
      </main>
    );
  }

  const activeListings = listings.filter((item) => item.is_active);
  const inactiveListings = listings.filter((item) => !item.is_active);
  const totalProfit = saleRecords.reduce(
    (total, item) => total + parseMoney(item.profit),
    0
  );
  const activeBuyOrderMatches = buyOrders.reduce((total, order) => {
    return total + getBuyOrderMatches(order).length;
  }, 0);
  const totalSales = saleRecords.length;
  const totalWonsSold = saleRecords.reduce((total, sale) => {
    const listing = listings.find((item) => item.id === sale.listing_id);
    return listing?.type === "Wons" ? total + Number(sale.quantity || 0) : total;
  }, 0);
  const openRequestMatches = requests.filter((req) => {
    const status = req.status?.toLowerCase();
    return status !== "sold" && status !== "cancelled" && req.listings?.id;
  });
  const activeMatches = activeBuyOrderMatches + openRequestMatches.length;
  const pagedSaleRecords = getPageItems(saleRecords, adminPage);
  const pagedBuyOrders = getPageItems(buyOrders, adminPage);
  const pagedRequestMatches = getPageItems(openRequestMatches, adminPage);
  const pagedRequests = getPageItems(requests, adminPage);
  const pagedReports = getPageItems(reports, adminPage);
  const pagedSubmissions = getPageItems(submissions, adminPage);
  const pagedListings = getPageItems(listings, adminPage);
  const currentAdminTotal =
    adminTab === "sales"
      ? saleRecords.length
      : adminTab === "buy"
        ? buyOrders.length
        : adminTab === "matches"
          ? openRequestMatches.length
          : adminTab === "requests"
            ? requests.length
            : adminTab === "reports"
              ? reports.length
              : adminTab === "submissions"
                ? submissions.length
                : listings.length;
  const currentAdminPages = Math.max(
    1,
    Math.ceil(currentAdminTotal / adminPageSize)
  );

  function openAdminTab(tab: string) {
    setAdminTab(tab);
    setAdminPage(1);
  }

  function getBuyOrderMatches(order: BuyOrder) {
    const isOpen =
      !order.status ||
      order.status.toLowerCase() === "open" ||
      order.status.toLowerCase() === "available";

    if (!isOpen) return [];

    const desired = order.desired.toLowerCase();
    const requestedQuantity = parseQuantity(order.desired);
    const maxPrice = parseMoney(order.max_price);

    return activeListings.filter((listing) => {
      const sameMarket =
        listing.server === order.server && listing.type === order.type;
      const listingQuantity = parseQuantity(listing.title);
      const listingPrice = parseMoney(listing.price);
      const quantityMatch =
        listing.type !== "Wons" ||
        (requestedQuantity > 0 && listingQuantity >= requestedQuantity);
      const priceMatch = !maxPrice || listingPrice <= maxPrice;
      const textMatch =
        listing.type === "Wons" ||
        listing.title.toLowerCase().includes(desired) ||
        desired.includes(listing.title.toLowerCase());

      return sameMarket && quantityMatch && priceMatch && textMatch;
    });
  }

  function getInterestSellerMatches(request: InterestRequest) {
    const baseListing = listings.find((item) => item.id === request.listings?.id);

    if (!baseListing) return [];

    if (baseListing.type !== "Wons") {
      return [baseListing];
    }

    const groupedMatches = activeListings.filter((listing) => {
      return (
        listing.type === "Wons" &&
        listing.server === baseListing.server &&
        listing.price === baseListing.price &&
        parseQuantity(listing.title) > 0
      );
    });

    return groupedMatches.length > 0 ? groupedMatches : [baseListing];
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_32rem),#050505] px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-black">Admin Panel</h1>
            <p className="text-sm text-neutral-400">Asrold Market</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportSalesCsv}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/5"
            >
              Export CSV
            </button>

            <button
              onClick={fetchAll}
              disabled={isFetching}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFetching ? "Refreshing..." : "Refresh"}
            </button>

            <button
              onClick={logout}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/5"
            >
              Logout
            </button>

            <Link
              href="/"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black hover:bg-neutral-200"
            >
              Back to website
            </Link>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-white/10 bg-neutral-900/90 p-5 shadow-xl shadow-black/15">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-black">Site status</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    maintenance.enabled
                      ? "bg-red-500/15 text-red-200"
                      : "bg-emerald-500/15 text-emerald-200"
                  }`}
                >
                  {maintenance.enabled ? "Submissions closed" : "Open"}
                </span>
              </div>
              <textarea
                value={maintenance.message}
                onChange={(e) =>
                  setMaintenance({ ...maintenance, message: e.target.value })
                }
                className="min-h-20 w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-emerald-300/60"
              />
            </div>

            <button
              onClick={() =>
                saveMaintenance({
                  ...maintenance,
                  enabled: !maintenance.enabled,
                })
              }
              disabled={actionLoading === "maintenance"}
              className={`rounded-xl px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60 ${
                maintenance.enabled
                  ? "bg-emerald-300 text-black"
                  : "bg-red-300 text-black"
              }`}
            >
              {actionLoading === "maintenance"
                ? "Saving..."
                : maintenance.enabled
                  ? "Open submissions"
                  : "Close submissions"}
            </button>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3 xl:grid-cols-9">
          <SummaryCard label="Completed sales" value={totalSales} active={adminTab === "sales"} onClick={() => openAdminTab("sales")} />
          <SummaryCard label="Total profit" value={formatEuro(totalProfit)} active={adminTab === "sales"} onClick={() => openAdminTab("sales")} />
          <SummaryCard label="Wons sold" value={totalWonsSold} active={adminTab === "sales"} onClick={() => openAdminTab("sales")} />
          <SummaryCard label="Buy orders" value={buyOrders.length} active={adminTab === "buy"} onClick={() => openAdminTab("buy")} />
          <SummaryCard label="Matches" value={activeMatches} active={adminTab === "matches"} onClick={() => openAdminTab("matches")} />
          <SummaryCard label="Received requests" value={requests.length} active={adminTab === "requests"} onClick={() => openAdminTab("requests")} />
          <SummaryCard label="Reports" value={reports.length} active={adminTab === "reports"} onClick={() => openAdminTab("reports")} />
          <SummaryCard label="Pending submissions" value={submissions.length} active={adminTab === "submissions"} onClick={() => openAdminTab("submissions")} />
          <SummaryCard label="Listings" value={activeListings.length + inactiveListings.length} active={adminTab === "listings"} onClick={() => openAdminTab("listings")} />
        </section>

        {adminTab === "sales" && (
        <section className="mb-10">
          <SectionTitle
            title="Completed sales"
            description="Confirmed sales. Removing one reverses its quantity and profit."
          />

          {isFetching && saleRecords.length === 0 ? (
            <LoadingGrid />
          ) : saleRecords.length === 0 ? (
            <Empty
              title="No sales recorded"
              message="Confirmed buy order and buyer request sales will appear here."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {pagedSaleRecords.map((sale) => {
                const listing = listings.find((item) => item.id === sale.listing_id);

                return (
                <article
                  key={sale.id}
                  className="rounded-2xl border border-white/10 bg-neutral-900 p-5 transition hover:-translate-y-0.5 hover:border-white/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2 text-xs">
                        <Badge>{sale.source_type}</Badge>
                        <Badge>{formatServerLabel(sale.listing_server)}</Badge>
                        <Badge>Qty {sale.quantity}</Badge>
                      </div>
                      <h3 className="font-bold">
                        {sale.listing_title || "Removed listing"}
                      </h3>
                      <p className="text-sm text-neutral-400">
                        {sale.created_at
                          ? new Date(sale.created_at).toLocaleString()
                          : "-"}
                      </p>
                    </div>

                    <strong className="text-emerald-200">
                      {formatEuro(parseMoney(sale.profit))}
                    </strong>
                  </div>

                  {sale.buyer_contact && (
                    <ContactInfo label="Buyer contact" value={sale.buyer_contact} />
                  )}
                  {listing?.seller_contact && (
                    <div className="mt-3">
                      <ContactInfo
                        label="Seller contact"
                        value={listing.seller_contact}
                      />
                    </div>
                  )}

                  {sale.admin_note && (
                    <p className="mt-3 rounded-xl border border-sky-300/20 bg-sky-300/10 p-3 text-sm text-sky-100">
                      <span className="font-bold">Admin note:</span>{" "}
                      {sale.admin_note}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() =>
                        openNoteModal("sale_records", sale.id, sale.admin_note)
                      }
                      disabled={
                        actionLoading === `note-sale_records-${sale.id}`
                      }
                      className="rounded-xl border border-white/10 bg-neutral-800 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Admin note
                    </button>

                    <button
                      onClick={() => removeSaleRecord(sale)}
                      disabled={actionLoading === `remove-sale-${sale.id}`}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionLoading === `remove-sale-${sale.id}`
                        ? "Removing..."
                        : "Remove sale"}
                    </button>
                  </div>
                </article>
              );
              })}
            </div>
          )}
        </section>
        )}

        {adminTab === "buy" && (
        <section className="mb-10">
          <SectionTitle
            title="Buy orders"
            description="Public buyer demand with automatic matches against active listings."
          />

          {isFetching && buyOrders.length === 0 ? (
            <LoadingGrid />
          ) : buyOrders.length === 0 ? (
            <Empty
              title="No buy orders"
              message="When buyers submit what they want, their orders and potential matches will appear here."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {pagedBuyOrders.map((order) => {
                const matches = getBuyOrderMatches(order);

                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border p-5 transition hover:-translate-y-0.5 ${
                      matches.length > 0
                        ? "border-emerald-300/30 bg-emerald-400/10"
                        : "border-white/10 bg-neutral-900"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2 text-xs">
                          <Badge>{formatServerLabel(order.server)}</Badge>
                          <Badge>{order.type}</Badge>
                          <Badge>{order.status || "Open"}</Badge>
                          {matches.length > 0 && (
                            <span className="rounded-full bg-emerald-400 px-3 py-1 font-bold text-black">
                              Match found
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold">{order.desired}</h3>
                        <p className="text-sm text-neutral-400">
                          Max price: {order.max_price || "-"}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteBuyOrder(order.id)}
                        disabled={
                          actionLoading === `delete-buy-order-${order.id}`
                        }
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoading === `delete-buy-order-${order.id}`
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>

                    <div className="rounded-xl bg-neutral-950 p-4 text-sm">
                      <ContactInfo label="Buyer contact" value={order.buyer_contact} />
                      {order.message && (
                        <p className="mt-2">
                          <span className="text-neutral-400">Message:</span>{" "}
                          {order.message}
                        </p>
                      )}
                    </div>

                    {matches.length > 0 && (
                      <div className="mt-3 rounded-xl border border-emerald-300/20 bg-black/20 p-4 text-sm">
                        <p className="mb-2 font-bold text-emerald-200">
                          Fast sale alert
                        </p>
                        <div className="grid gap-2">
                          {matches.map((listing) => {
                            const quantityKey = `${order.id}-${listing.id}`;
                            const selectedQuantity =
                              matchQuantities[quantityKey] || order.desired;
                            const selectedPrice =
                              matchPrices[quantityKey] ||
                              formatPriceInput(listing.price);
                            const soldQuantity = parseQuantity(selectedQuantity);
                            const availableQuantity = parseQuantity(listing.title);
                            const profitPerWon =
                              parseMoney(selectedPrice) -
                              parseMoney(listing.seller_expected_price);
                            const matchProfit = profitPerWon * soldQuantity;

                            return (
                              <div
                                key={listing.id}
                                className="rounded-lg bg-neutral-950 p-3"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-bold">{listing.title}W</p>
                                    <p className="text-xs text-neutral-400">
                                      Available: {availableQuantity}W - Sell:{" "}
                                      {listing.price} - Buy:{" "}
                                      {listing.seller_expected_price || "-"}
                                    </p>
                                  </div>
                                  <strong className="text-emerald-200">
                                    Profit: {formatEuro(matchProfit)}
                                  </strong>
                                </div>
                                <div className="mt-3">
                                  <ContactInfo
                                    label="Seller contact"
                                    value={listing.seller_contact}
                                  />
                                </div>

                                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <input
                                      type="number"
                                      min="1"
                                      max={Math.min(
                                        availableQuantity,
                                        parseQuantity(order.desired)
                                      )}
                                      value={selectedQuantity}
                                      onChange={(e) =>
                                        setMatchQuantities({
                                          ...matchQuantities,
                                          [quantityKey]: e.target.value,
                                        })
                                      }
                                      className="min-h-11 rounded-lg border border-white/10 bg-black px-3 py-2 outline-none focus:border-emerald-300/60"
                                    />

                                    <div className="relative min-w-[8.5rem]">
                                      <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={selectedPrice}
                                        onChange={(e) =>
                                          setMatchPrices({
                                            ...matchPrices,
                                            [quantityKey]: e.target.value,
                                          })
                                        }
                                        className="min-h-11 w-full rounded-lg border border-white/10 bg-black px-3 py-2 pr-11 outline-none focus:border-emerald-300/60"
                                      />
                                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">
                                        €
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-3 flex flex-wrap justify-end gap-3">
                                    <button
                                      onClick={() =>
                                        markBuyOrderSold(order, listing)
                                      }
                                      disabled={
                                        actionLoading ===
                                        `match-sold-${quantityKey}`
                                      }
                                      className="min-h-11 min-w-24 rounded-lg bg-green-500 px-4 py-2 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {actionLoading ===
                                      `match-sold-${quantityKey}`
                                        ? "Saving..."
                                        : "Vendido"}
                                    </button>

                                    <button
                                      onClick={() =>
                                        cancelBuyOrderMatch(order, listing)
                                      }
                                      disabled={
                                        actionLoading ===
                                        `match-cancel-${quantityKey}`
                                      }
                                      className="min-h-11 min-w-24 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {actionLoading ===
                                      `match-cancel-${quantityKey}`
                                        ? "Saving..."
                                        : "Cancelado"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        )}

        {adminTab === "matches" && (
        <section className="mb-10">
          <SectionTitle
            title="Buyer request matches"
            description="Requests from Quero comprar with sold/cancelled confirmation."
          />

          {openRequestMatches.length === 0 ? (
            <Empty
              title="No open buyer request matches"
              message="Open requests from Quero comprar will appear here."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {pagedRequestMatches.map((req) => {
                  const sellerMatches = getInterestSellerMatches(req);
                  const listing = sellerMatches[0];
                  if (!listing) return null;

                  const quantityKey = `request-${req.id}-${listing.id}`;
                  const selectedSellerId = matchSellerSelections[quantityKey];
                  const selectedSeller =
                    (selectedSellerId &&
                      sellerMatches.find(
                        (seller) => seller.id === selectedSellerId
                      )) ||
                    listing;
                  const groupQuantity = sellerMatches.reduce(
                    (total, item) => total + parseQuantity(item.title),
                    0
                  );
                  const selectedQuantity =
                    matchQuantities[quantityKey] ||
                    req.desired ||
                    String(groupQuantity || parseQuantity(listing.title)) ||
                    "1";
                  const selectedPrice =
                    matchPrices[quantityKey] || formatPriceInput(listing.price);
                  const soldQuantity = parseQuantity(selectedQuantity);
                  const availableQuantity =
                    listing.type === "Wons"
                      ? parseQuantity(selectedSeller.title)
                      : parseQuantity(listing.title);
                  const requestProfit =
                    (parseMoney(selectedPrice) -
                      parseMoney(selectedSeller.seller_expected_price)) *
                    soldQuantity;

                  return (
                    <article
                      key={req.id}
                      className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-5 transition hover:-translate-y-0.5"
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="mb-2 flex flex-wrap gap-2 text-xs">
                            <Badge>{formatServerLabel(listing.server)}</Badge>
                            <Badge>{listing.type}</Badge>
                            <span className="rounded-full bg-emerald-400 px-3 py-1 font-bold text-black">
                              Match found
                            </span>
                          </div>
                          <h3 className="font-bold">
                            {listing.type === "Wons"
                              ? `${groupQuantity}W grouped`
                              : listing.title}
                          </h3>
                          <p className="text-sm text-neutral-400">
                            Sell: {selectedPrice}€ · Sellers:{" "}
                            {sellerMatches.length}
                          </p>
                          <p className="mt-1 text-sm text-neutral-400">
                            Desired: {req.desired || "-"}
                            {req.max_price ? ` - Max: ${req.max_price}` : ""}
                          </p>
                        </div>

                        <strong className="text-emerald-200">
                          Profit: {formatEuro(requestProfit)}
                        </strong>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <ContactInfo label="Buyer contact" value={req.buyer_contact} />
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-xs font-bold uppercase text-neutral-500">
                            Seller contacts
                          </p>
                          <div className="mt-2 grid gap-2">
                            {sellerMatches.map((seller, index) => (
                              <div
                                key={seller.id}
                                className="rounded-lg bg-neutral-950 p-2 text-xs"
                              >
                                <p className="font-bold text-white">
                                  Seller {index + 1}: {seller.title}
                                  {seller.type === "Wons" ? "W" : ""}
                                </p>
                                <p className="text-neutral-400">
                                  Buy: {seller.seller_expected_price || "-"} ·
                                  Contact: {seller.seller_contact || "-"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {req.message && (
                        <p className="mt-3 rounded-xl bg-neutral-950 p-3 text-sm">
                          <span className="text-neutral-400">Message:</span>{" "}
                          {req.message}
                        </p>
                      )}

                      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_7rem_9rem]">
                          {listing.type === "Wons" && (
                            <select
                              value={selectedSeller.id}
                              onChange={(e) =>
                                setMatchSellerSelections({
                                  ...matchSellerSelections,
                                  [quantityKey]: e.target.value,
                                })
                              }
                              className="min-h-11 min-w-0 rounded-lg border border-white/10 bg-black px-3 py-2 outline-none [color-scheme:dark] focus:border-emerald-300/60"
                            >
                              {sellerMatches.map((seller, index) => (
                                <option key={seller.id} value={seller.id}>
                                  Seller {index + 1} · {seller.title}W ·{" "}
                                  {seller.seller_contact || "-"}
                                </option>
                              ))}
                            </select>
                          )}

                          <input
                            type="number"
                            min="1"
                            max={
                              listing.type === "Wons"
                                ? Math.min(
                                    availableQuantity,
                                    parseQuantity(req.desired)
                                  )
                                : 1
                            }
                            value={selectedQuantity}
                            onChange={(e) =>
                              setMatchQuantities({
                                ...matchQuantities,
                                [quantityKey]: e.target.value,
                              })
                            }
                            className="min-h-11 rounded-lg border border-white/10 bg-black px-3 py-2 outline-none focus:border-emerald-300/60"
                          />

                          <div className="relative min-w-[8.5rem]">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={selectedPrice}
                              onChange={(e) =>
                                setMatchPrices({
                                  ...matchPrices,
                                  [quantityKey]: e.target.value,
                                })
                              }
                              className="min-h-11 w-full rounded-lg border border-white/10 bg-black px-3 py-2 pr-11 outline-none focus:border-emerald-300/60"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">
                              €
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap justify-end gap-3">
                          <button
                            onClick={() => markInterestSold(req)}
                            disabled={actionLoading === `request-sold-${req.id}`}
                            className="min-h-11 min-w-24 rounded-lg bg-green-500 px-4 py-2 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === `request-sold-${req.id}`
                              ? "Saving..."
                              : "Vendido"}
                          </button>

                          <button
                            onClick={() => cancelInterestRequest(req.id)}
                            disabled={actionLoading === `request-cancel-${req.id}`}
                            className="min-h-11 min-w-24 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === `request-cancel-${req.id}`
                              ? "Saving..."
                              : "Cancelado"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
          )}
        </section>
        )}

        {adminTab === "requests" && (
        <section className="mb-10">
          <SectionTitle
            title="Buyer requests"
            description="Contacts received from the public interest button."
          />

          {isFetching && requests.length === 0 ? (
            <LoadingGrid />
          ) : requests.length === 0 ? (
            <Empty
              title="No buyer requests"
              message="New public interest requests will appear here as soon as buyers submit them."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {pagedRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-white/10 bg-neutral-900 p-5 transition hover:-translate-y-0.5 hover:border-white/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold">
                        {req.listings?.title || "Removed listing"}
                      </h3>
                      <p className="text-sm text-neutral-400">
                          {formatServerLabel(req.listings?.server)} -{" "}
                        {req.listings?.price || "-"}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteRequest(req.id)}
                      disabled={actionLoading === `delete-request-${req.id}`}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionLoading === `delete-request-${req.id}`
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>

                  <div className="rounded-xl bg-neutral-950 p-4 text-sm">
                    <ContactInfo label="Buyer contact" value={req.buyer_contact} />

                    {req.message && (
                      <p className="mt-2">
                        <span className="text-neutral-400">Message:</span>{" "}
                        {req.message}
                      </p>
                    )}
                  </div>

                  {req.admin_note && (
                    <p className="mt-3 rounded-xl border border-sky-300/20 bg-sky-300/10 p-3 text-sm text-sky-100">
                      <span className="font-bold">Admin note:</span>{" "}
                      {req.admin_note}
                    </p>
                  )}

                  <button
                    onClick={() =>
                      openNoteModal(
                        "interest_requests",
                        req.id,
                        req.admin_note
                      )
                    }
                    disabled={
                      actionLoading === `note-interest_requests-${req.id}`
                    }
                    className="mt-3 rounded-xl border border-white/10 bg-neutral-800 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Admin note
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {adminTab === "reports" && (
        <section className="mb-10">
          <SectionTitle
            title="Listing reports"
            description="Public reports about suspicious or incorrect listings."
          />

          {isFetching && reports.length === 0 ? (
            <LoadingGrid />
          ) : reports.length === 0 ? (
            <Empty
              title="No reports"
              message="Reports from the marketplace will appear here."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {pagedReports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-2xl border border-white/10 bg-neutral-900 p-5 transition hover:-translate-y-0.5 hover:border-white/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2 text-xs">
                        <Badge>{report.status || "Open"}</Badge>
                        {report.listings?.server && (
                          <Badge>{formatServerLabel(report.listings.server)}</Badge>
                        )}
                        {report.listings?.type && <Badge>{report.listings.type}</Badge>}
                      </div>
                      <h3 className="font-bold">
                        {report.listings?.title || "Removed listing"}
                      </h3>
                      <p className="text-sm text-neutral-400">
                        {report.created_at
                          ? new Date(report.created_at).toLocaleString()
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-neutral-950 p-4 text-sm">
                    <p className="font-bold text-neutral-200">Reason</p>
                    <p className="mt-2 whitespace-pre-wrap text-neutral-300">
                      {report.reason}
                    </p>

                    {report.reporter_contact && (
                      <p className="mt-3">
                        <span className="text-neutral-400">Reporter:</span>{" "}
                        <strong>{report.reporter_contact}</strong>
                      </p>
                    )}
                  </div>

                  {report.admin_note && (
                    <p className="mt-3 rounded-xl border border-sky-300/20 bg-sky-300/10 p-3 text-sm text-sky-100">
                      <span className="font-bold">Admin note:</span>{" "}
                      {report.admin_note}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <button
                      onClick={() =>
                        openNoteModal(
                          "listing_reports",
                          report.id,
                          report.admin_note
                        )
                      }
                      disabled={
                        actionLoading === `note-listing_reports-${report.id}`
                      }
                      className="rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Admin note
                    </button>

                    <button
                      onClick={() => resolveReport(report.id)}
                      disabled={
                        actionLoading === `resolve-report-${report.id}` ||
                        report.status === "Resolved"
                      }
                      className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === `resolve-report-${report.id}`
                        ? "Resolving..."
                        : "Mark resolved"}
                    </button>

                    <button
                      onClick={() => deleteReport(report.id)}
                      disabled={actionLoading === `delete-report-${report.id}`}
                      className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionLoading === `delete-report-${report.id}`
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        )}

        {adminTab === "submissions" && (
        <section className="mb-10">
          <SectionTitle
            title="Pending submissions"
            description="Seller submissions waiting for your approval."
          />

          {isFetching && submissions.length === 0 ? (
            <LoadingGrid />
          ) : submissions.length === 0 ? (
            <Empty
              title="No pending submissions"
              message="Seller submissions will appear here for pricing and approval."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pagedSubmissions.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 transition hover:-translate-y-0.5 hover:border-white/20"
                >
                  <ImageBox
                    image={item.image_url}
                    title={item.title}
                    onOpen={() =>
                      item.image_url && setOpenedImage(item.image_url)
                    }
                  />

                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap gap-2 text-xs">
                      <Badge>{formatServerLabel(item.server)}</Badge>
                      <Badge>{item.type}</Badge>
                    </div>

                    <h3 className="text-lg font-bold">{item.title}</h3>

                    {item.description && (
                      <p className="mt-2 line-clamp-3 text-sm text-neutral-400">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-4 rounded-xl bg-neutral-950 p-4 text-sm">
                      <p>
                        <span className="text-neutral-400">
                          Seller desired price:
                        </span>{" "}
                        <strong>{item.seller_expected_price || "-"}</strong>
                      </p>

                      <div className="mt-3">
                        <ContactInfo
                          label="Seller contact"
                          value={item.seller_contact}
                        />
                      </div>
                    </div>

                    <div className="relative mt-4">
                      <input
                        type="number"
                        min="0"
                        value={publicPrices[item.id] || ""}
                        onChange={(e) =>
                          setPublicPrices({
                            ...publicPrices,
                            [item.id]: e.target.value,
                          })
                        }
                        placeholder="Public price shown to buyers"
                        className="w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 pr-10 outline-none"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
                        €
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm">
                      <span className="text-neutral-300">Profit:</span>{" "}
                      <strong className="text-emerald-200">
                        {publicPrices[item.id]
                          ? formatEuro(
                              (parseMoney(publicPrices[item.id]) -
                                parseMoney(item.seller_expected_price)) *
                                (item.type === "Wons"
                                  ? parseQuantity(item.title)
                                  : 1)
                            )
                          : "-"}
                      </strong>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => approve(item)}
                        disabled={actionLoading === `approve-${item.id}`}
                        className="rounded-xl bg-green-500 px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoading === `approve-${item.id}`
                          ? "Approving..."
                          : "Approve"}
                      </button>

                      <button
                        onClick={() => reject(item.id)}
                        disabled={actionLoading === `reject-${item.id}`}
                        className="rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoading === `reject-${item.id}`
                          ? "Rejecting..."
                          : "Reject"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        )}

        {adminTab === "listings" && (
        <section>
          <SectionTitle
            title="Listings"
            description="Manage approved, active, sold or inactive listings."
          />

          {isFetching && listings.length === 0 ? (
            <LoadingGrid />
          ) : listings.length === 0 ? (
            <Empty
              title="No listings yet"
              message="Approved submissions will become marketplace listings here."
            />
          ) : (
            <div className="grid gap-4">
              {pagedListings.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 rounded-2xl border border-white/10 bg-neutral-900 p-4 transition hover:-translate-y-0.5 hover:border-white/20 md:grid-cols-[170px_1fr_auto]"
                >
                  <ImageBox
                    image={item.image_url}
                    title={item.title}
                    compact
                    onOpen={() =>
                      item.image_url && setOpenedImage(item.image_url)
                    }
                  />

                  <div>
                    <div className="mb-2 flex flex-wrap gap-2 text-xs">
                      <Badge>{formatServerLabel(item.server)}</Badge>
                      <Badge>{item.type}</Badge>
                      <span
                        className={`rounded-full px-3 py-1 ${
                          item.is_active
                            ? "bg-green-500/10 text-green-300"
                            : "bg-red-500/10 text-red-300"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                      <Badge>{item.status || "No status"}</Badge>
                    </div>

                    {editing === item.id ? (
                      <div className="grid gap-3">
                        <input
                          value={editData.title || ""}
                          onChange={(e) =>
                            setEditData({ ...editData, title: e.target.value })
                          }
                          placeholder="Title"
                          className="rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none"
                        />

                        <textarea
                          value={editData.description || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Description"
                          className="min-h-24 rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none"
                        />

                        <div className="grid gap-3 md:grid-cols-3">
                          <select
                            value={editData.server || "Iberia"}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                server: e.target.value,
                              })
                            }
                            className="rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none"
                          >
                            {servers.map((s) => (
                              <option key={s} value={s}>
                                {formatServerLabel(s)}
                              </option>
                            ))}
                          </select>

                          <select
                            value={editData.type || "Item"}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                type: e.target.value,
                              })
                            }
                            className="rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none"
                          >
                            {types.map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>

                          <input
                            value={editData.status || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                status: e.target.value,
                              })
                            }
                            placeholder="Status"
                            className="rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none"
                          />
                        </div>

                        <input
                          value={editData.price || ""}
                          onChange={(e) =>
                            setEditData({ ...editData, price: e.target.value })
                          }
                          placeholder="Public price"
                          className="rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none"
                        />

                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(item.id)}
                            disabled={actionLoading === `save-${item.id}`}
                            className="rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === `save-${item.id}` ? "Saving..." : "Save"}
                          </button>

                          <button
                            onClick={() => {
                              setEditing(null);
                              setEditData({});
                            }}
                            className="rounded-xl bg-neutral-700 px-4 py-2 text-sm font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-bold">{item.title}</h3>

                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
                            {item.description}
                          </p>
                        )}

                        <p className="mt-3 text-2xl font-black">{item.price}</p>

                        {item.seller_contact && (
                          <div className="mt-3">
                            <ContactInfo
                              label="Seller contact"
                              value={item.seller_contact}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="grid gap-2 md:w-44">
                    {editing !== item.id && (
                      <button
                        onClick={() => {
                          setEditing(item.id);
                          setEditData(item);
                        }}
                        className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold text-white"
                      >
                        Edit
                      </button>
                    )}

                    {item.is_active ? (
                      <>
                        <button
                          onClick={() => markSold(item.id)}
                          disabled={actionLoading === `sold-${item.id}`}
                          className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading === `sold-${item.id}`
                            ? "Saving..."
                            : "Mark sold"}
                        </button>

                        <button
                          onClick={() => deactivate(item.id)}
                          disabled={actionLoading === `deactivate-${item.id}`}
                          className="rounded-xl bg-neutral-700 px-4 py-2 text-sm font-bold hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading === `deactivate-${item.id}`
                            ? "Saving..."
                            : "Deactivate"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => reactivate(item.id)}
                        disabled={actionLoading === `reactivate-${item.id}`}
                        className="rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoading === `reactivate-${item.id}`
                          ? "Saving..."
                          : "Reactivate"}
                      </button>
                    )}

                    <button
                      onClick={() => deleteListing(item.id)}
                      disabled={actionLoading === `delete-listing-${item.id}`}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionLoading === `delete-listing-${item.id}`
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        )}
        {currentAdminPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setAdminPage((page) => Math.max(page - 1, 1))}
              disabled={adminPage === 1}
              className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-neutral-400">
              {adminPage} / {currentAdminPages}
            </span>
            <button
              onClick={() =>
                setAdminPage((page) => Math.min(page + 1, currentAdminPages))
              }
              disabled={adminPage === currentAdminPages}
              className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {openedImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-5">
          <button
            onClick={() => setOpenedImage(null)}
            className="absolute right-6 top-6 rounded-full bg-white px-4 py-2 font-bold text-black"
          >
            X
          </button>

          <img
            src={openedImage}
            alt="Expanded image"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
          />
        </div>
      )}

      {noteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/50">
            <h2 className="text-xl font-black">Private admin note</h2>
            <p className="mt-1 text-sm text-neutral-400">
              This note is only visible in the admin panel.
            </p>

            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              maxLength={600}
              className="mt-4 min-h-40 w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none focus:border-emerald-300/60"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() =>
                  saveAdminNote(noteTarget.table, noteTarget.id, noteDraft)
                }
                disabled={
                  actionLoading === `note-${noteTarget.table}-${noteTarget.id}`
                }
                className="flex-1 rounded-xl bg-emerald-300 px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `note-${noteTarget.table}-${noteTarget.id}`
                  ? "Saving..."
                  : "Save note"}
              </button>

              <button
                onClick={() => {
                  setNoteTarget(null);
                  setNoteDraft("");
                }}
                className="flex-1 rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 font-bold hover:bg-neutral-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  active = false,
  onClick,
}: {
  label: string;
  value: number | string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left shadow-xl shadow-black/15 ${
        active
          ? "border-emerald-300/45 bg-emerald-400/10"
          : "border-white/10 bg-neutral-900/90 hover:border-white/25"
      }`}
    >
      <p className="text-3xl font-black">{value}</p>
      <p className="text-sm text-neutral-400">{label}</p>
    </button>
  );
}

function getPageItems<T>(items: T[], page: number) {
  return items.slice((page - 1) * adminPageSize, page * adminPageSize);
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-sm text-neutral-400">{description}</p>
    </div>
  );
}

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-900/70 p-8 text-center shadow-xl shadow-black/15">
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-400">
        {message}
      </p>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-40 animate-pulse rounded-2xl border border-white/10 bg-neutral-900/70"
        />
      ))}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-neutral-800 px-3 py-1 text-neutral-300">
      {children}
    </span>
  );
}

function ImageBox({
  image,
  title,
  compact = false,
  onOpen,
}: {
  image: string | null;
  title: string;
  compact?: boolean;
  onOpen: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl bg-neutral-800 ${
        compact ? "h-32" : "h-44"
      }`}
    >
      {image ? (
        <button
          type="button"
          onClick={onOpen}
          className="h-full w-full cursor-zoom-in"
        >
          <img
            src={image}
            alt={title}
            className="pointer-events-none h-full w-full object-cover"
          />
        </button>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-neutral-500">
          No image
        </div>
      )}
    </div>
  );
}
