"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

const servers = ["Iberia", "Tigerghost", "Ruby", "Azrael", "Teutonia"];
const types = ["Item", "Conta", "Wons"];
const allowedAdminEmail = "danielmassano.ual@gmail.com";

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
};

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

function formatEuro(value: number) {
  return `${value.toFixed(2)}€`;
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
  const [openedImage, setOpenedImage] = useState<string | null>(null);
  const [publicPrices, setPublicPrices] = useState<Record<string, string>>({});
  const [matchQuantities, setMatchQuantities] = useState<Record<string, string>>(
    {}
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<ListingEditData>({});
  const [isFetching, setIsFetching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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

    setSubmissions(subs || []);
    setListings(list || []);
    setRequests(reqs || []);
    setBuyOrders(orders || []);
    setSaleRecords(sales || []);
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
      price: `${publicPrice}€`,
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

  async function markSold(id: string) {
    if (!(await requireSession())) return;
    const listing = listings.find((item) => item.id === id);
    if (!listing) return;

    const quantity = listing.type === "Wons" ? parseQuantity(listing.title) : 1;
    const profitPerUnit =
      parseMoney(listing.price) - parseMoney(listing.seller_expected_price);
    const profit = profitPerUnit * quantity;

    setActionLoading(`sold-${id}`);
    const { error } = await supabase
      .from("listings")
      .update({ status: "Sold", is_active: false, profit })
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
      parseMoney(listing.price) - parseMoney(listing.seller_expected_price);
    const saleProfit = profitPerWon * soldQuantity;
    const nextProfit = parseMoney(listing.profit) + saleProfit;
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

    const listingData = request.listings;
    if (!listingData?.id) {
      alert("This request no longer has a listing attached.");
      return;
    }

    const listing = listings.find((item) => item.id === listingData.id);
    if (!listing) {
      alert("Listing not found.");
      return;
    }

    const quantityKey = `request-${request.id}-${listing.id}`;
    const requestedQuantity = parseQuantity(request.desired);
    const availableQuantity = parseQuantity(listing.title);
    const soldQuantity =
      listing.type === "Wons"
        ? parseQuantity(matchQuantities[quantityKey] || request.desired)
        : 1;

    if (!soldQuantity || soldQuantity <= 0) {
      alert("Please enter a valid quantity sold.");
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
        } for this buyer request?`
      )
    ) {
      return;
    }

    const remainingQuantity =
      listing.type === "Wons"
        ? Math.max(availableQuantity - soldQuantity, 0)
        : 0;
    const profitPerUnit =
      parseMoney(listing.price) - parseMoney(listing.seller_expected_price);
    const saleProfit = profitPerUnit * soldQuantity;
    const nextProfit = parseMoney(listing.profit) + saleProfit;
    const listingUpdate =
      listing.type === "Wons" && remainingQuantity > 0
        ? {
            title: String(remainingQuantity),
            profit: nextProfit,
            status: "Available",
            is_active: true,
          }
        : {
            title: listing.type === "Wons" ? "0" : listing.title,
            profit: nextProfit,
            status: "Sold",
            is_active: false,
          };

    setActionLoading(`request-sold-${request.id}`);

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
        sourceType: "buyer_request",
        sourceId: request.id,
        quantity: soldQuantity,
        profit: saleProfit,
        buyerContact: request.buyer_contact,
      });
    } catch (error) {
      setActionLoading(null);
      alert(error instanceof Error ? error.message : "Could not record sale.");
      return;
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
    const nextProfit = Math.max(parseMoney(listing.profit) - record.profit, 0);

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
  const soldListings = listings.filter(
    (item) => item.status?.toLowerCase() === "sold"
  );
  const totalProfit =
    saleRecords.length > 0
      ? saleRecords.reduce((total, item) => total + parseMoney(item.profit), 0)
      : listings.reduce((total, item) => total + parseMoney(item.profit), 0);
  const activeBuyOrderMatches = buyOrders.reduce((total, order) => {
    return total + getBuyOrderMatches(order).length;
  }, 0);
  const totalSales = saleRecords.length || soldListings.length;

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

        <section className="mb-8 grid gap-4 md:grid-cols-3 xl:grid-cols-7">
          <SummaryCard label="Pedidos recebidos" value={requests.length} />
          <SummaryCard label="Buy orders" value={buyOrders.length} />
          <SummaryCard label="Matches" value={activeBuyOrderMatches} />
          <SummaryCard label="Pending submissions" value={submissions.length} />
          <SummaryCard label="Total vendas" value={totalSales} />
          <SummaryCard label="Lucro total" value={formatEuro(totalProfit)} />
          <SummaryCard label="Active listings" value={activeListings.length} />
          <SummaryCard label="Inactive listings" value={inactiveListings.length} />
        </section>

        <section className="mb-10">
          <SectionTitle
            title="Vendas efetuadas"
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
              {saleRecords.map((sale) => (
                <article
                  key={sale.id}
                  className="rounded-2xl border border-white/10 bg-neutral-900 p-5 transition hover:-translate-y-0.5 hover:border-white/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2 text-xs">
                        <Badge>{sale.source_type}</Badge>
                        <Badge>{sale.listing_server || "-"}</Badge>
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

                  <button
                    onClick={() => removeSaleRecord(sale)}
                    disabled={actionLoading === `remove-sale-${sale.id}`}
                    className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === `remove-sale-${sale.id}`
                      ? "Removing..."
                      : "Remover venda"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

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
              {buyOrders.map((order) => {
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
                          <Badge>{order.server}</Badge>
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
                            const soldQuantity = parseQuantity(selectedQuantity);
                            const availableQuantity = parseQuantity(listing.title);
                            const profitPerWon =
                              parseMoney(listing.price) -
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
                                      Available: {availableQuantity}W · Sell:{" "}
                                      {listing.price} · Buy:{" "}
                                      {listing.seller_expected_price || "-"}
                                    </p>
                                  </div>
                                  <strong className="text-emerald-200">
                                    Profit: {formatEuro(matchProfit)}
                                  </strong>
                                </div>

                                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
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
                                    className="rounded-lg border border-white/10 bg-black px-3 py-2 outline-none focus:border-emerald-300/60"
                                  />

                                  <button
                                    onClick={() =>
                                      markBuyOrderSold(order, listing)
                                    }
                                    disabled={
                                      actionLoading ===
                                      `match-sold-${quantityKey}`
                                    }
                                    className="rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
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
                                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {actionLoading ===
                                    `match-cancel-${quantityKey}`
                                      ? "Saving..."
                                      : "Cancelado"}
                                  </button>
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

        <section className="mb-10">
          <SectionTitle
            title="Buyer request matches"
            description="Requests from Quero comprar with sold/cancelled confirmation."
          />

          {requests.filter((req) => {
            const status = req.status?.toLowerCase();
            return status !== "sold" && status !== "cancelled" && req.listings?.id;
          }).length === 0 ? (
            <Empty
              title="No open buyer request matches"
              message="Open requests from Quero comprar will appear here."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {requests
                .filter((req) => {
                  const status = req.status?.toLowerCase();
                  return (
                    status !== "sold" &&
                    status !== "cancelled" &&
                    req.listings?.id
                  );
                })
                .map((req) => {
                  const listing = listings.find(
                    (item) => item.id === req.listings?.id
                  );
                  if (!listing) return null;

                  const quantityKey = `request-${req.id}-${listing.id}`;
                  const selectedQuantity =
                    matchQuantities[quantityKey] ||
                    req.desired ||
                    listing.title ||
                    "1";
                  const soldQuantity = parseQuantity(selectedQuantity);
                  const availableQuantity = parseQuantity(listing.title);
                  const profitPerUnit =
                    parseMoney(listing.price) -
                    parseMoney(listing.seller_expected_price);
                  const requestProfit = profitPerUnit * soldQuantity;

                  return (
                    <article
                      key={req.id}
                      className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-5 transition hover:-translate-y-0.5"
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="mb-2 flex flex-wrap gap-2 text-xs">
                            <Badge>{listing.server}</Badge>
                            <Badge>{listing.type}</Badge>
                            <span className="rounded-full bg-emerald-400 px-3 py-1 font-bold text-black">
                              Match found
                            </span>
                          </div>
                          <h3 className="font-bold">{listing.title}</h3>
                          <p className="text-sm text-neutral-400">
                            Sell: {listing.price} · Buy:{" "}
                            {listing.seller_expected_price || "-"}
                          </p>
                          <p className="mt-1 text-sm text-neutral-400">
                            Desired: {req.desired || "-"}
                            {req.max_price ? ` · Max: ${req.max_price}` : ""}
                          </p>
                        </div>

                        <strong className="text-emerald-200">
                          Profit: {formatEuro(requestProfit)}
                        </strong>
                      </div>

                      <ContactInfo label="Buyer contact" value={req.buyer_contact} />

                      {req.message && (
                        <p className="mt-3 rounded-xl bg-neutral-950 p-3 text-sm">
                          <span className="text-neutral-400">Message:</span>{" "}
                          {req.message}
                        </p>
                      )}

                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
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
                          className="rounded-lg border border-white/10 bg-black px-3 py-2 outline-none focus:border-emerald-300/60"
                        />

                        <button
                          onClick={() => markInterestSold(req)}
                          disabled={actionLoading === `request-sold-${req.id}`}
                          className="rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading === `request-sold-${req.id}`
                            ? "Saving..."
                            : "Vendido"}
                        </button>

                        <button
                          onClick={() => cancelInterestRequest(req.id)}
                          disabled={actionLoading === `request-cancel-${req.id}`}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading === `request-cancel-${req.id}`
                            ? "Saving..."
                            : "Cancelado"}
                        </button>
                      </div>
                    </article>
                  );
                })}
            </div>
          )}
        </section>

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
              {requests.map((req) => (
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
                        {req.listings?.server || "-"} ·{" "}
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
                </div>
              ))}
            </div>
          )}
        </section>

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
              {submissions.map((item) => (
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
                      <Badge>{item.server}</Badge>
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
                              parseMoney(publicPrices[item.id]) -
                                parseMoney(item.seller_expected_price)
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
              {listings.map((item) => (
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
                      <Badge>{item.server}</Badge>
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
                              <option key={s}>{s}</option>
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
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/90 p-5 shadow-xl shadow-black/15">
      <p className="text-3xl font-black">{value}</p>
      <p className="text-sm text-neutral-400">{label}</p>
    </div>
  );
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
