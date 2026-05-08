"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import toast, { Toaster } from "react-hot-toast";

type Lang = "pt" | "en" | "es" | "de" | "ro" | "tr";
type View = "market" | "sell" | "buy";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  server: string;
  type: string;
  price: string;
  status: string | null;
  image_url: string | null;
  created_at?: string | null;
  group_listing_ids?: string[];
};

const servers = ["Todos", "EUW-Iberia", "EUW-Tigerghost", "EUW-Ruby", "EUW-Germania", "EUW-Teutonia", "EUW-Oceane", "EUW-Chimera", "EUW-Europe", "EUW-Italia", "EUW-Lumen", "TR-Safir", "TR-Star", "TR-Charon", "TR-Lucifer"];
const allTypes = ["Todos", "Item", "Conta", "Wons"];
const saleTypes = ["Item", "Conta", "Wons"];
const buyOrderTypes = ["Wons"];
const contactMethods = ["Discord", "Whatsapp", "Facebook"];
const itemCategories = [
  "Todos",
  "Elmo",
  "Armadura",
  "Armas",
  "Alquimia",
  "Pet",
  "Luva",
  "Talisma",
  "Pulseira",
  "Brincos",
  "Colares",
  "Outro",
];
const languageOptions: Record<Lang, { flagClass: string; label: string }> = {
  en: { flagClass: "flag-gb", label: "English" },
  es: { flagClass: "flag-es", label: "Español" },
  pt: { flagClass: "flag-pt", label: "PortuguÃªs" },
  de: { flagClass: "flag-de", label: "Deutsch" },
  ro: { flagClass: "flag-ro", label: "RomÃ¢nÄƒ" },
  tr: { flagClass: "flag-tr", label: "TÃ¼rkÃ§e" },
};
const itemsPerPage = 12;
const titleMaxLength = 25;
const quantityMaxLength = 6;
const priceMaxLength = 4;
const itemPriceMaxLength = 5;
const contactMaxLength = 50;
const descriptionMaxLength = 200;
const maxImageSizeBytes = 4 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const isCaptchaEnabled =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_DISABLE_CAPTCHA !== "true";

function cleanText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanMultiline(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function isPositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function isValidCentPrice(value: string) {
  return /^0\.\d{1,2}$/.test(value) && isPositiveNumber(value);
}

function normalizeCentPrice(value: string) {
  if (!isValidCentPrice(value)) return value;

  return Number(value).toFixed(2);
}

function isValidItemPrice(value: string) {
  return /^[1-9]\d{0,4}$/.test(value);
}

function isIncompleteCentPrice(value: string) {
  return value === "0." || value === "";
}

function formatCentPriceInput(value: string) {
  const normalized = value.replace(",", ".");

  if (!normalized) {
    return "0.";
  }

  const decimals = normalized.startsWith("0.")
    ? normalized.slice(2).replace(/\D/g, "")
    : normalized.replace(/\D/g, "");

  return `0.${decimals.slice(0, 2)}`;
}

function formatItemPriceInput(value: string) {
  return value.replace(/\D/g, "").slice(0, itemPriceMaxLength);
}

function getInitialPriceForType(type: string) {
  return type === "Wons" ? "0." : "";
}

function normalizeServer(value: string) {
  return value.trim().toLowerCase().replace(/^(euw|tr)-/, "");
}

function formatServerLabel(value: string) {
  return value.replace(/^EUW-/, "");
}

function parseQuantity(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const parsed = Number.parseInt(String(value).replace(/[^\d]/g, ""), 10);

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseListingPrice(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const parsed = Number.parseFloat(
    String(value).replace(/[^\d,.-]/g, "").replace(",", ".")
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function ContactHint({
  method,
  text,
}: {
  method: string;
  text: { discordHint: string; whatsappHint: string; facebookHint: string };
}) {
  const hint =
    method === "Discord"
      ? text.discordHint
      : method === "Whatsapp"
        ? text.whatsappHint
        : text.facebookHint;

  return <p className="text-xs font-medium text-neutral-500">{hint}</p>;
}

function RequiredMark({ show = true }: { show?: boolean }) {
  return show ? (
    <span className="pointer-events-none absolute right-3 top-2 text-sm font-black leading-none text-red-400">
      *
    </span>
  ) : null;
}

function DiscordButton({
  label,
  href = "https://discord.com/channels/@me",
  compact = false,
  disabled = false,
}: {
  label: string;
  href?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const className = `relative inline-flex h-10 items-center gap-2 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/12 px-3 text-sm font-bold text-indigo-100 ${
    disabled
      ? "cursor-default"
      : "hover:border-[#5865F2]/70 hover:bg-[#5865F2]/25"
  } ${compact ? "" : "mt-3"}`;
  const content = (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4 flex-none fill-current"
      >
        <path d="M19.54 5.34A16.9 16.9 0 0 0 15.32 4l-.2.4a11.7 11.7 0 0 1 3.72 1.86 12.7 12.7 0 0 0-11.7 0 11.7 11.7 0 0 1 3.72-1.86l-.2-.4a16.9 16.9 0 0 0-4.22 1.34C3.77 9.03 3.3 12.63 3.6 16.18A17 17 0 0 0 8.77 18.8l.62-.85a10.7 10.7 0 0 1-1.64-.78l.39-.3a12.1 12.1 0 0 0 7.72 0l.39.3c-.52.31-1.07.57-1.64.78l.62.85a17 17 0 0 0 5.17-2.62c.35-4.12-.6-7.68-2.86-10.84ZM9.43 14.04c-.8 0-1.46-.74-1.46-1.64s.64-1.64 1.46-1.64c.81 0 1.48.74 1.46 1.64 0 .9-.65 1.64-1.46 1.64Zm5.14 0c-.8 0-1.46-.74-1.46-1.64s.64-1.64 1.46-1.64c.82 0 1.48.74 1.46 1.64 0 .9-.64 1.64-1.46 1.64Z" />
      </svg>
      <span className="whitespace-nowrap">{label}</span>
    </>
  );

  if (disabled) {
    return (
      <span className={className} title={label}>
        {content}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      title={label}
    >
      {content}
    </a>
  );
}

function TawkWidget() {
  useEffect(() => {
    const w = window as typeof window & {
      Tawk_API?: Record<string, unknown>;
      Tawk_LoadStart?: Date;
      __asroldTawkLoaded?: boolean;
    };

    w.Tawk_API = w.Tawk_API || {};
    w.Tawk_LoadStart = w.Tawk_LoadStart || new Date();
    w.Tawk_API.customStyle = {
      visibility: {
        desktop: { position: "br", xOffset: 20, yOffset: 20 },
        mobile: { position: "br", xOffset: 12, yOffset: 12 },
      },
    };

    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      const consoleWithFlag = console as typeof console & {
        __asroldTawkFiltered?: boolean;
      };

      if (!consoleWithFlag.__asroldTawkFiltered) {
        const originalConsoleError = console.error.bind(console);
        console.error = function (...args) {
          if (args.length === 1 && args[0] === true) return;
          originalConsoleError(...args);
        };
        consoleWithFlag.__asroldTawkFiltered = true;
      }
    }

    if (
      w.__asroldTawkLoaded ||
      document.querySelector('script[src*="embed.tawk.to/69fb9abe42635a1c35b82389"]')
    ) {
      w.__asroldTawkLoaded = true;
      return;
    }

    w.__asroldTawkLoaded = true;

    const script = document.createElement("script");
    script.id = "tawk-widget";
    script.async = true;
    script.src = "https://embed.tawk.to/69fb9abe42635a1c35b82389/1jnvd8u22";
    script.charset = "UTF-8";
    script.crossOrigin = "*";
    document.body.appendChild(script);
  }, []);

  return null;
}

function contactPlaceholder(method: string) {
  if (method === "Whatsapp") return "Whatsapp";
  if (method === "Facebook") return "Facebook";
  return "Discord ID";
}

function TurnstileBox({
  isReady,
  onToken,
  onExpire,
  resetKey,
}: {
  isReady: boolean;
  onToken: (token: string) => void;
  onExpire: () => void;
  resetKey: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  const [hasRendered, setHasRendered] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;
  }, [onExpire, onToken]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;
    let attempts = 0;

    function renderWidget() {
      const turnstile = window.turnstile;

      if (!containerRef.current || !turnstile) return false;

      if (widgetIdRef.current && turnstile.remove) {
        turnstile.remove(widgetIdRef.current);
      }

      containerRef.current.innerHTML = "";
      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onExpireRef.current(),
        "error-callback": () => onExpireRef.current(),
      });
      setHasRendered(true);
      setLoadFailed(false);
      return true;
    }

    if (isReady && renderWidget()) {
      return () => {
        const turnstile = window.turnstile;

        if (widgetIdRef.current && turnstile?.remove) {
          turnstile.remove(widgetIdRef.current);
        }
      };
    }

    const interval = window.setInterval(() => {
      attempts += 1;

      if (cancelled || renderWidget()) {
        window.clearInterval(interval);
        return;
      }

      if (attempts >= 40) {
        setLoadFailed(true);
        window.clearInterval(interval);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(interval);

      const turnstile = window.turnstile;

      if (widgetIdRef.current && turnstile?.remove) {
        turnstile.remove(widgetIdRef.current);
      }
    };
  }, [isReady, resetKey, siteKey]);

  if (!siteKey) {
    return (
      <p className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
        Captcha site key is not configured.
      </p>
    );
  }

  return (
    <div className="min-h-[65px]">
      <div ref={containerRef} />
      {!hasRendered && !loadFailed && (
        <p className="text-sm text-neutral-400">Loading security check...</p>
      )}
      {loadFailed && (
        <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Security check could not load. Disable ad blockers for this site and
          refresh the page.
        </p>
      )}
    </div>
  );
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        }
      ) => string;
      remove?: (widgetId: string) => void;
    };
  }
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [lang, setLang] = useState<Lang>("en");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [view, setView] = useState<View>("market");

  const [listings, setListings] = useState<Listing[]>([]);
  const [server, setServer] = useState("Todos");
  const [type, setType] = useState("Todos");
  const [itemCategory, setItemCategory] = useState("Todos");
  const [sortMode, setSortMode] = useState("best");
  const [bestPriceOnly, setBestPriceOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [reservedListingIds, setReservedListingIds] = useState<string[]>([]);

  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [reportedListing, setReportedListing] = useState<Listing | null>(null);
  const [buyerContactMethod, setBuyerContactMethod] = useState("Discord");
  const [buyerContact, setBuyerContact] = useState("");
  const [buyerDesired, setBuyerDesired] = useState("");
  const [buyerMessage, setBuyerMessage] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportContact, setReportContact] = useState("");

  const [openedImage, setOpenedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [isSendingInterest, setIsSendingInterest] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isSubmittingBuyOrder, setIsSubmittingBuyOrder] = useState(false);
  const [isTurnstileReady, setIsTurnstileReady] = useState(false);
  const [saleCaptchaToken, setSaleCaptchaToken] = useState("");
  const [buyCaptchaToken, setBuyCaptchaToken] = useState("");
  const [interestCaptchaToken, setInterestCaptchaToken] = useState("");
  const [reportCaptchaToken, setReportCaptchaToken] = useState("");
  const [saleCaptchaResetKey, setSaleCaptchaResetKey] = useState(0);
  const [buyCaptchaResetKey, setBuyCaptchaResetKey] = useState(0);
  const [interestCaptchaResetKey, setInterestCaptchaResetKey] = useState(0);
  const [reportCaptchaResetKey, setReportCaptchaResetKey] = useState(0);
  const [isLocalCaptchaBypassed] = useState(
    () =>
      typeof window !== "undefined" &&
      ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
  );

  const [sale, setSale] = useState({
    title: "",
    description: "",
    server: "",
    type: "Item",
    item_category: "",
    seller_expected_price: "",
    seller_contact_method: "Discord",
    seller_contact: "",
  });

  const [buyOrder, setBuyOrder] = useState({
    desired: "",
    server: "",
    type: "Wons",
    max_price: "0.",
    buyer_contact_method: "Discord",
    buyer_contact: "",
    message: "",
  });

  const shouldShowCaptcha = isCaptchaEnabled && !isLocalCaptchaBypassed;

const text = {
  pt: {
    hero: "Compra e vende no Metin2 com mais segurança.",
    sub: "Anúncios de contas, itens e wons com intermediação manual.",
    market: "Mercado",
    sell: "Vender",
    buyOrder: "Buy",
    search: "Pesquisar anúncio...",
    allServers: "Todos os servidores",
    chooseServer: "Escolhe o servidor",
    allTypes: "Todos os tipos",
    allItemCategories: "Todas as categorias",
    itemCategory: "Categoria",
    found: "Anúncio(s) encontrados",
    noImage: "Sem imagem",
    price: "Preço",
    available: "Disponível",
    bestPrice: "Melhor preço",
    bestPriceOnly: "Só melhor preço",
    reserved: "Reservado",
    sortBy: "Ordenar",
    sortBest: "Melhor preço",
    sortNewest: "Mais recente",
    sortQuantity: "Quantidade",
    sortServer: "Servidor",
    stockTitle: "Stock de wons",
    interest: "Quero comprar",
    reportListing: "Reportar anúncio",
    reportReason: "O que está errado neste anúncio?",
    reportContact: "O teu contacto (opcional)",
    sendReport: "Enviar report",
    reportSent: "Report enviado.",
    reportMissing: "Preenche o motivo do report.",
    submitTitle: "Queres vender?",
    submitText:
      "Submete o teu item, conta ou wons. O teu contacto e preço pretendido ficam privados e só são visíveis para o administrador.",
    title: "Título",
    quantity: "Quantidade",
    sellerPrice: "Preço pretendido pelo vendedor",
    sellerPricePerWon: "Preço por won",
    sellerContact: "Nome no Discord",
    description: "Descrição",
    imageRequired: "Imagem obrigatória para itens e contas",
    chooseImage: "Escolher imagem",
    noFileSelected: "Nenhuma imagem selecionada",
    sendSale: "Enviar para aprovação",
    backMarket: "← Voltar ao mercado",
    buyerContact: "Nome no Discord",
    contactMethod: "Contacto",
    contactNotice:
      "Os contactos fornecidos deverão ser Discord, Facebook ou WhatsApp.",
    asroldDiscord: "Discord do admin: Asrold#3891",
    discordHint: "Discord: coloca apenas o ID, sem #tag.",
    whatsappHint: "WhatsApp: coloca o número com indicativo.",
    facebookHint: "Facebook: coloca o nome ou link do perfil.",
    message: "Mensagem",
    sendRequest: "Enviar pedido",
    close: "Fechar",
    previous: "Anterior",
    next: "Seguinte",
    fillRequired: "Preenche título, preço pretendido e contacto.",
    imageMissing: "A imagem é obrigatória para itens e contas.",
    saleSent: "Venda enviada para aprovação.",
    requestSent: "Pedido enviado.",
    contactMissing: "Preenche o teu contacto.",
    captcha: "Verificação de segurança",
    captchaMissing: "Completa a verificação de segurança.",
    captchaFailed: "A verificação de segurança falhou. Tenta novamente.",
    loading: "A carregar...",
    noListingsTitle: "Sem anúncios disponíveis",
    noListingsText: "Tenta ajustar os filtros ou volta mais tarde.",
    buyOrderTitle: "Não encontras o que queres?",
    buyOrderText:
      "Cria um buy. Quando existir relação com um anúncio, o admin recebe um aviso para acelerar a venda.",
    desiredItem: "O que queres comprar",
    maxPrice: "Preço máximo",
    sendBuyOrder: "Criar buy",
    buyOrderSent: "Buy enviado.",
    buyOrderMissing: "Preenche o que procuras, contacto e preço máximo.",
    invalidPrice:
      "Para Wons usa 0.01 a 0.99. Para itens/contas usa até 5 dígitos.",
    invalidImage: "Usa uma imagem JPG, PNG ou WebP até 4MB.",
    howItWorks: "Como funciona",
  },
  en: {
    hero: "Buy and sell in Metin2 with more safety.",
    sub: "Listings for accounts, items and wons with manual mediation.",
    market: "Market",
    sell: "Sell",
    buyOrder: "Buy",
    search: "Search listing...",
    allServers: "All servers",
    chooseServer: "Choose server",
    allTypes: "All types",
    allItemCategories: "All categories",
    itemCategory: "Category",
    found: "listing(s) found",
    noImage: "No image",
    price: "Price",
    available: "Available",
    bestPrice: "Best price",
    bestPriceOnly: "Best price only",
    reserved: "Reserved",
    sortBy: "Sort by",
    sortBest: "Best price",
    sortNewest: "Newest",
    sortQuantity: "Quantity",
    sortServer: "Server",
    stockTitle: "Wons stock",
    interest: "I want to buy",
    reportListing: "Report listing",
    reportReason: "What is wrong with this listing?",
    reportContact: "Your contact (optional)",
    sendReport: "Send report",
    reportSent: "Report sent.",
    reportMissing: "Fill in the report reason.",
    submitTitle: "Want to sell?",
    submitText:
      "Submit your item, account or wons. Your contact and desired price stay private and are only visible to the admin.",
    title: "Title",
    quantity: "Quantity",
    sellerPrice: "Seller desired price",
    sellerPricePerWon: "Price per won",
    sellerContact: "Discord username",
    description: "Description",
    imageRequired: "Image required for items and accounts",
    chooseImage: "Choose image",
    noFileSelected: "No image selected",
    sendSale: "Send for approval",
    backMarket: "← Back to market",
    buyerContact: "Discord username",
    contactMethod: "Contact",
    contactNotice:
      "Provided contacts must be Discord, Facebook or WhatsApp.",
    asroldDiscord: "Admin Discord: Asrold#3891",
    discordHint: "Discord: enter only the ID, without #tag.",
    whatsappHint: "WhatsApp: enter the number with country code.",
    facebookHint: "Facebook: enter the name or profile link.",
    message: "Message",
    sendRequest: "Send request",
    close: "Close",
    previous: "Previous",
    next: "Next",
    fillRequired: "Fill in title, desired price and contact.",
    imageMissing: "Image is required for items and accounts.",
    saleSent: "Sale submitted for approval.",
    requestSent: "Request sent.",
    contactMissing: "Fill in your contact.",
    captcha: "Security check",
    captchaMissing: "Complete the security check.",
    captchaFailed: "Security check failed. Please try again.",
    loading: "Loading...",
    noListingsTitle: "No listings available",
    noListingsText: "Try adjusting the filters or check back later.",
    buyOrderTitle: "Can not find what you want?",
    buyOrderText:
      "Create a buy. When it matches a listing, the admin gets an alert to speed up the sale.",
    desiredItem: "What you want to buy",
    maxPrice: "Max price",
    sendBuyOrder: "Create buy",
    buyOrderSent: "Buy submitted.",
    buyOrderMissing: "Fill what you want, contact and max price.",
    invalidPrice:
      "For Wons use 0.01 to 0.99. For items/accounts use up to 5 digits.",
    invalidImage: "Use a JPG, PNG or WebP image up to 4MB.",
    howItWorks: "How it works",
  },
  es: {
    hero: "Compra y vende en Metin2 con más seguridad.",
    sub: "Anuncios de cuentas, objetos y wons con mediación manual.",
    market: "Mercado",
    sell: "Vender",
    buyOrder: "Comprar",
    search: "Buscar anuncio...",
    allServers: "Todos los servidores",
    chooseServer: "Elige el servidor",
    allTypes: "Todos los tipos",
    allItemCategories: "Todas las categorías",
    itemCategory: "Categoría",
    found: "anuncio(s) encontrados",
    noImage: "Sin imagen",
    price: "Precio",
    available: "Disponible",
    bestPrice: "Mejor precio",
    bestPriceOnly: "Solo mejor precio",
    reserved: "Reservado",
    sortBy: "Ordenar",
    sortBest: "Mejor precio",
    sortNewest: "Más reciente",
    sortQuantity: "Cantidad",
    sortServer: "Servidor",
    stockTitle: "Stock de wons",
    interest: "Quiero comprar",
    reportListing: "Reportar anuncio",
    reportReason: "¿Qué está mal en este anuncio?",
    reportContact: "Tu contacto (opcional)",
    sendReport: "Enviar reporte",
    reportSent: "Reporte enviado.",
    reportMissing: "Rellena el motivo del reporte.",
    submitTitle: "¿Quieres vender?",
    submitText:
      "Envía tu objeto, cuenta o wons. Tu contacto y precio deseado quedan privados y solo son visibles para el administrador.",
    title: "Título",
    quantity: "Cantidad",
    sellerPrice: "Precio deseado por el vendedor",
    sellerPricePerWon: "Precio por won",
    sellerContact: "Nombre de Discord",
    description: "Descripción",
    imageRequired: "Imagen obligatoria para objetos y cuentas",
    chooseImage: "Elegir imagen",
    noFileSelected: "Ninguna imagen seleccionada",
    sendSale: "Enviar para aprobación",
    backMarket: "← Volver al mercado",
    buyerContact: "Nombre de Discord",
    contactMethod: "Contacto",
    contactNotice: "Los contactos proporcionados deben ser Discord, Facebook o WhatsApp.",
    asroldDiscord: "Discord del admin: Asrold#3891",
    discordHint: "Discord: escribe solo el ID, sin #tag.",
    whatsappHint: "WhatsApp: escribe el número con prefijo.",
    facebookHint: "Facebook: escribe el nombre o enlace del perfil.",
    message: "Mensaje",
    sendRequest: "Enviar pedido",
    close: "Cerrar",
    previous: "Anterior",
    next: "Siguiente",
    fillRequired: "Rellena título, precio deseado y contacto.",
    imageMissing: "La imagen es obligatoria para objetos y cuentas.",
    saleSent: "Venta enviada para aprobación.",
    requestSent: "Pedido enviado.",
    contactMissing: "Rellena tu contacto.",
    captcha: "Verificación de seguridad",
    captchaMissing: "Completa la verificación de seguridad.",
    captchaFailed: "La verificación de seguridad falló. Inténtalo de nuevo.",
    loading: "Cargando...",
    noListingsTitle: "No hay anuncios disponibles",
    noListingsText: "Ajusta los filtros o vuelve más tarde.",
    buyOrderTitle: "¿No encuentras lo que quieres?",
    buyOrderText:
      "Crea una compra. Cuando coincida con un anuncio, el admin recibe un aviso para acelerar la venta.",
    desiredItem: "Qué quieres comprar",
    maxPrice: "Precio máximo",
    sendBuyOrder: "Crear compra",
    buyOrderSent: "Compra enviada.",
    buyOrderMissing: "Rellena lo que buscas, contacto y precio máximo.",
    invalidPrice:
      "Para Wons usa 0.01 a 0.99. Para objetos/cuentas usa hasta 5 dígitos.",
    invalidImage: "Usa una imagen JPG, PNG o WebP de hasta 4MB.",
    howItWorks: "Cómo funciona",
  },
  de: {
    hero: "Kaufe und verkaufe in Metin2 mit mehr Sicherheit.",
    sub: "Anzeigen für Accounts, Items und Wons mit manueller Vermittlung.",
    market: "Markt",
    sell: "Verkaufen",
    search: "Anzeige suchen...",
    allServers: "Alle Server",
    chooseServer: "Server auswählen",
    allTypes: "Alle Typen",
    allItemCategories: "Alle Kategorien",
    itemCategory: "Kategorie",
    found: "Anzeige(n) gefunden",
    noImage: "Kein Bild",
    price: "Preis",
    available: "Verfügbar",
    bestPrice: "Bester Preis",
    bestPriceOnly: "Nur bester Preis",
    reserved: "Reserviert",
    sortBy: "Sortieren",
    sortBest: "Bester Preis",
    sortNewest: "Neueste",
    sortQuantity: "Menge",
    sortServer: "Server",
    stockTitle: "Wons Bestand",
    interest: "Ich möchte kaufen",
    reportListing: "Anzeige melden",
    reportReason: "Was stimmt mit dieser Anzeige nicht?",
    reportContact: "Dein Kontakt (optional)",
    sendReport: "Meldung senden",
    reportSent: "Meldung gesendet.",
    reportMissing: "Gib den Grund für die Meldung ein.",
    submitTitle: "Möchtest du verkaufen?",
    submitText:
      "Reiche dein Item, deinen Account oder Wons ein. Dein Kontakt und Wunschpreis bleiben privat und sind nur für den Admin sichtbar.",
    title: "Titel",
    quantity: "Menge",
    sellerPrice: "Gewünschter Verkäuferpreis",
    sellerPricePerWon: "Preis pro Won",
    sellerContact: "Discord-Name",
    description: "Beschreibung",
    imageRequired: "Bild erforderlich für Items und Accounts",
    chooseImage: "Bild auswählen",
    noFileSelected: "Kein Bild ausgewählt",
    sendSale: "Zur Prüfung senden",
    backMarket: "← Zurück zum Markt",
    buyerContact: "Discord-Name",
    contactMethod: "Kontakt",
    contactNotice:
      "Die angegebenen Kontakte müssen Discord, Facebook oder WhatsApp sein.",
    asroldDiscord: "Admin Discord: Asrold#3891",
    discordHint: "Discord: nur die ID eingeben, ohne #tag.",
    whatsappHint: "WhatsApp: Nummer mit Landesvorwahl eingeben.",
    facebookHint: "Facebook: Name oder Profillink eingeben.",
    message: "Nachricht",
    sendRequest: "Anfrage senden",
    close: "Schließen",
    previous: "Zurück",
    next: "Weiter",
    fillRequired: "Titel, Wunschpreis und Kontakt ausfüllen.",
    imageMissing: "Bild ist für Items und Accounts erforderlich.",
    saleSent: "Anzeige zur Prüfung gesendet.",
    requestSent: "Anfrage gesendet.",
    contactMissing: "Kontakt ausfüllen.",
    captcha: "Sicherheitsprüfung",
    captchaMissing: "Schließe die Sicherheitsprüfung ab.",
    captchaFailed:
      "Sicherheitsprüfung fehlgeschlagen. Bitte erneut versuchen.",
    loading: "Laden...",
    noListingsTitle: "Keine Anzeigen verfügbar",
    noListingsText: "Passe die Filter an oder schau später wieder vorbei.",
    buyOrder: "Buy",
    invalidPrice:
      "Für Wons 0.01 bis 0.99 nutzen. Für Items/Accounts bis 5 Ziffern.",
    invalidImage: "Verwende ein JPG-, PNG- oder WebP-Bild bis 4MB.",
    howItWorks: "So funktioniert es",
  },
  ro: {
    hero: "Cumpără și vinde în Metin2 mai sigur.",
    sub: "Anunțuri pentru conturi, iteme și wons cu intermediere manuală.",
    market: "Piață",
    sell: "Vinde",
    search: "Caută anunț...",
    allServers: "Toate serverele",
    chooseServer: "Alege serverul",
    allTypes: "Toate tipurile",
    allItemCategories: "Toate categoriile",
    itemCategory: "Categorie",
    found: "anunț(uri) găsite",
    noImage: "Fără imagine",
    price: "Preț",
    available: "Disponibil",
    bestPrice: "Cel mai bun preț",
    bestPriceOnly: "Doar cel mai bun preț",
    reserved: "Rezervat",
    sortBy: "Sortează",
    sortBest: "Cel mai bun preț",
    sortNewest: "Cele mai noi",
    sortQuantity: "Cantitate",
    sortServer: "Server",
    stockTitle: "Stock wons",
    interest: "Vreau să cumpăr",
    reportListing: "Raportează anunțul",
    reportReason: "Ce este greșit la acest anunț?",
    reportContact: "Contactul tău (opțional)",
    sendReport: "Trimite raport",
    reportSent: "Raport trimis.",
    reportMissing: "Completează motivul raportului.",
    submitTitle: "Vrei să vinzi?",
    submitText:
      "Trimite itemul, contul sau wons. Contactul și prețul dorit rămân private și sunt vizibile doar administratorului.",
    title: "Titlu",
    quantity: "Cantitate",
    sellerPrice: "Preț dorit de vânzător",
    sellerPricePerWon: "Preț per won",
    sellerContact: "Nume Discord",
    description: "Descriere",
    imageRequired: "Imagine obligatorie pentru iteme și conturi",
    chooseImage: "Alege imaginea",
    noFileSelected: "Nicio imagine selectată",
    sendSale: "Trimite spre aprobare",
    backMarket: "← Înapoi la piață",
    buyerContact: "Nume Discord",
    contactMethod: "Contact",
    contactNotice:
      "Contactele furnizate trebuie să fie Discord, Facebook sau WhatsApp.",
    asroldDiscord: "Discord admin: Asrold#3891",
    discordHint: "Discord: introdu doar ID-ul, fără #tag.",
    whatsappHint: "WhatsApp: introdu numărul cu prefix.",
    facebookHint: "Facebook: introdu numele sau linkul profilului.",
    message: "Mesaj",
    sendRequest: "Trimite cerere",
    close: "Închide",
    previous: "Anterior",
    next: "Următor",
    fillRequired: "Completează titlul, prețul dorit și contactul.",
    imageMissing: "Imaginea este obligatorie pentru iteme și conturi.",
    saleSent: "Vânzarea a fost trimisă spre aprobare.",
    requestSent: "Cerere trimisă.",
    contactMissing: "Completează contactul tău.",
    captcha: "Verificare de securitate",
    captchaMissing: "Completează verificarea de securitate.",
    captchaFailed:
      "Verificarea de securitate a eșuat. Încearcă din nou.",
    loading: "Se încarcă...",
    noListingsTitle: "Nu există anunțuri disponibile",
    noListingsText:
      "Încearcă să ajustezi filtrele sau revino mai târziu.",
    buyOrder: "Buy",
    invalidPrice:
      "Pentru Wons folosește 0.01-0.99. Pentru iteme/conturi maximum 5 cifre.",
    invalidImage:
      "Folosește o imagine JPG, PNG sau WebP de maximum 4MB.",
    howItWorks: "Cum funcționează",
  },
  tr: {
    hero: "Metin2'de daha güvenli alışveriş yap.",
    sub: "Hesaplar, itemler ve wons için manuel aracılıklı ilanlar.",
    market: "Pazar",  
    sell: "Sat",
    buyOrder: "Buy",
    search: "İlan ara...",
    allServers: "Tüm sunucular",
    chooseServer: "Sunucu seç",
    allTypes: "Tüm türler",
    allItemCategories: "Tüm kategoriler",
    itemCategory: "Kategori",
    found: "ilan bulundu",
    noImage: "Görsel yok",
    price: "Fiyat",
    available: "Müsait",
    bestPrice: "En iyi fiyat",
    bestPriceOnly: "Sadece en iyi fiyat",
    reserved: "Rezerve",
    sortBy: "Sırala",
    sortBest: "En iyi fiyat",
    sortNewest: "En yeni",
    sortQuantity: "Miktar",
    sortServer: "Sunucu",
    stockTitle: "Wons stoku",
    interest: "Satın almak istiyorum",
    reportListing: "İlanı bildir",
    reportReason: "Bu ilanda yanlış olan ne?",
    reportContact: "İletişim bilgin (isteğe bağlı)",
    sendReport: "Bildirimi gönder",
    reportSent: "Bildirim gönderildi.",
    reportMissing: "Bildirim nedenini doldur.",
    submitTitle: "Satmak ister misin?",
    submitText:
      "Itemini, hesabını veya wons miktarını gönder. İletişim bilgin ve istediğin fiyat gizli kalır, sadece admin tarafından görülür.",
    title: "Başlık",
    quantity: "Miktar",
    sellerPrice: "Satıcının istediği fiyat",
    sellerPricePerWon: "Won başına fiyat",
    sellerContact: "Discord adı",
    description: "Açıklama",
    imageRequired: "Itemler ve hesaplar için görsel zorunlu",
    chooseImage: "Görsel seç",
    noFileSelected: "Görsel seçilmedi",
    sendSale: "Onaya gönder",
    backMarket: "← Pazara dön",
    buyerContact: "Discord adı",
    contactMethod: "İletişim",
    contactNotice:
      "Verilen iletişim bilgileri Discord, Facebook veya WhatsApp olmalıdır.",
    asroldDiscord: "Admin Discord: Asrold#3891",
    discordHint: "Discord: sadece ID yaz, #tag kullanma.",
    whatsappHint: "WhatsApp: ülke koduyla numara yaz.",
    facebookHint: "Facebook: ad veya profil linki yaz.",
    message: "Mesaj",
    sendRequest: "Talep gönder",
    close: "Kapat",
    previous: "Önceki",
    next: "Sonraki",
    fillRequired: "Başlık, istenen fiyat ve iletişim bilgisini doldur.",
    imageMissing: "Itemler ve hesaplar için görsel zorunludur.",
    saleSent: "Satış onaya gönderildi.",
    requestSent: "Talep gönderildi.",
    contactMissing: "İletişim bilgini doldur.",
    captcha: "Güvenlik kontrolü",
    captchaMissing: "Güvenlik kontrolünü tamamla.",
    captchaFailed: "Güvenlik kontrolü başarısız. Lütfen tekrar dene.",
    loading: "Yükleniyor...",
    noListingsTitle: "Mevcut ilan yok",
    noListingsText: "Filtreleri değiştirmeyi dene veya daha sonra tekrar bak.",
    buyOrderTitle: "Aradığını bulamadın mı?",
    buyOrderText:
      "Bir alış emri oluştur. Bir ilanla eşleştiğinde admin satışı hızlandırmak için bildirim alır.",
    desiredItem: "Ne almak istiyorsun",
    maxPrice: "Maksimum fiyat",
    sendBuyOrder: "Buy oluştur",
    buyOrderSent: "Buy gönderildi.",
    buyOrderMissing:
      "Aradığın miktarı, iletişim bilgisini ve maksimum fiyatı doldur.",
    invalidPrice:
      "Wons için 0.01-0.99 kullan. Item/hesap için en fazla 5 rakam.",
    invalidImage: "4MB'a kadar JPG, PNG veya WebP görsel kullan.",
    howItWorks: "Nasıl çalışır",
  },
}[lang];

  const buyText = {
    pt: {
      nav: "Comprar",
      title: "Nao encontras o que queres?",
      intro:
        "Cria um buy. Quando existir relacao com um anuncio, o admin recebe um aviso para acelerar a venda.",
      desired: "O que queres comprar",
      maxPrice: "Preco maximo",
      send: "Criar buy",
      sent: "Buy enviado.",
      missing: "Preenche o que procuras, contacto e preco maximo.",
    },
    en: {
      nav: "Buy",
      title: "Can not find what you want?",
      intro:
        "Create a buy. When it matches a listing, the admin gets an alert to speed up the sale.",
      desired: "What you want to buy",
      maxPrice: "Max price",
      send: "Create buy",
      sent: "Buy submitted.",
      missing: "Fill what you want, contact and max price.",
    },
    es: {
      nav: "Comprar",
      title: "¿No encuentras lo que quieres?",
      intro:
        "Crea una compra. Cuando coincida con un anuncio, el admin recibe un aviso para acelerar la venta.",
      desired: "Qué quieres comprar",
      maxPrice: "Precio máximo",
      send: "Crear compra",
      sent: "Compra enviada.",
      missing: "Rellena la cantidad, contacto y precio máximo.",
    },
    de: {
      nav: "Kaufen",
      title: "Findest du nicht, was du suchst?",
      intro:
        "Erstelle einen Buy. Wenn er zu einer Anzeige passt, bekommt der Admin eine Meldung.",
      desired: "Was du kaufen willst",
      maxPrice: "Maximaler Preis",
      send: "Buy erstellen",
      sent: "Buy gesendet.",
      missing: "Fuellen Sie Wunsch, Kontakt und Maximalpreis aus.",
    },
    ro: {
      nav: "CumpÄƒrÄƒ",
      title: "Nu gasesti ce cauti?",
      intro:
        "Creeaza un buy. Cand se potriveste cu un anunt, adminul primeste o alerta.",
      desired: "Ce vrei sa cumperi",
      maxPrice: "Pret maxim",
      send: "Creeaza buy",
      sent: "Buy trimis.",
      missing: "Completeaza ce cauti, contactul si pretul maxim.",
    },
    tr: {
      nav: "Al",
      title: "Aradigini bulamadim mi?",
      intro:
        "Bir buy olustur. Bir ilanla eslestiginde admin satisi hizlandirmak icin bildirim alir.",
      desired: "Ne almak istiyorsun",
      maxPrice: "Maksimum fiyat",
      send: "Buy olustur",
      sent: "Buy gonderildi.",
      missing:
        "Aradigin miktari, iletisim bilgisini ve maksimum fiyati doldur.",
    },
  }[lang];

  const validationText = {
    pt: {
      missingFields: "Campos em falta",
    },
    en: {
      missingFields: "Missing fields",
    },
    es: {
      missingFields: "Campos obligatorios",
    },
    de: {
      missingFields: "Fehlende Felder",
    },
    ro: {
      missingFields: "Campuri lipsa",
    },
    tr: {
      missingFields: "Eksik alanlar",
    },
  }[lang];

  const fetchListings = useCallback(async () => {
    setIsLoadingListings(true);
    const response = await fetch("/api/listings");

    if (!response.ok) {
      toast.error("Could not load listings.");
      setIsLoadingListings(false);
      return;
    }

    const result = (await response.json().catch(() => ({}))) as {
      listings?: Listing[];
    };

    setListings(result.listings || []);
    setIsLoadingListings(false);
  }, []);

  const fetchReservations = useCallback(async () => {
    const response = await fetch("/api/listing-reservations");

    if (!response.ok) return;

    const result = (await response.json().catch(() => ({}))) as {
      listingIds?: string[];
    };

    setReservedListingIds(result.listingIds || []);
  }, []);

  const typeLabels = {
    pt: {
      Todos: "Todos os tipos",
      Item: "Itens",
      Conta: "Contas",
      Wons: "Wons",
    },
    en: {
      Todos: "All types",
      Item: "Items",
      Conta: "Accounts",
      Wons: "Wons",
    },
    es: {
      Todos: "Todos los tipos",
      Item: "Objetos",
      Conta: "Cuentas",
      Wons: "Wons",
    },
    de: {
      Todos: "Alle Typen",
      Item: "Items",
      Conta: "Accounts",
      Wons: "Wons",
    },
    ro: {
      Todos: "Toate tipurile",
      Item: "Iteme",
      Conta: "Conturi",
      Wons: "Wons",
    },
    tr: {
      Todos: "Tum turler",
      Item: "Itemler",
      Conta: "Hesaplar",
      Wons: "Wons",
    },
  }[lang];

  const categoryLabels: Record<string, string> = {
    pt: {
      Todos: text.allItemCategories,
      Elmo: "Elmo",
      Armadura: "Armadura",
      Armas: "Armas",
      Alquimia: "Alquimia",
      Pet: "Pet",
      Luva: "Luva",
      Talisma: "Talisma",
      Talisman: "Talisman",
      Pulseira: "Pulseira",
      Brincos: "Brincos",
      Colares: "Colares",
      Outro: "Outro",
    },
    en: {
      Todos: text.allItemCategories,
      Elmo: "Helmet",
      Armadura: "Armor",
      Armas: "Weapons",
      Alquimia: "Alchemy",
      Pet: "Pet",
      Luva: "Glove",
      Talisma: "Talisman",
      Talisman: "Talisman",
      Pulseira: "Bracelet",
      Brincos: "Earrings",
      Colares: "Necklaces",
      Outro: "Other",
    },
    es: {
      Todos: text.allItemCategories,
      Elmo: "Casco",
      Armadura: "Armadura",
      Armas: "Armas",
      Alquimia: "Alquimia",
      Pet: "Pet",
      Luva: "Guante",
      Talisma: "Talismán",
      Talisman: "Talismán",
      Pulseira: "Pulsera",
      Brincos: "Pendientes",
      Colares: "Collares",
      Outro: "Otro",
    },
    de: {
      Todos: text.allItemCategories,
      Elmo: "Helm",
      Armadura: "Ruestung",
      Armas: "Waffen",
      Alquimia: "Alchemie",
      Pet: "Pet",
      Luva: "Handschuh",
      Talisma: "Talisman",
      Talisman: "Talisman",
      Pulseira: "Armband",
      Brincos: "Ohrringe",
      Colares: "Halsketten",
      Outro: "Andere",
    },
    ro: {
      Todos: text.allItemCategories,
      Elmo: "Coif",
      Armadura: "Armura",
      Armas: "Arme",
      Alquimia: "Alchimie",
      Pet: "Pet",
      Luva: "Manusa",
      Talisma: "Talisman",
      Talisman: "Talisman",
      Pulseira: "Bratara",
      Brincos: "Cercei",
      Colares: "Coliere",
      Outro: "Altul",
    },
    tr: {
      Todos: text.allItemCategories,
      Elmo: "Kask",
      Armadura: "Zirh",
      Armas: "Silahlar",
      Alquimia: "Simya",
      Pet: "Pet",
      Luva: "Eldiven",
      "Talismã": "Tilsim",
      Talisma: "Tilsim",
      Pulseira: "Bilezik",
      Brincos: "Kupeler",
      Colares: "Kolyeler",
      Outro: "Diger",
    },
  }[lang];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReservations();
  }, [fetchReservations]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return listings.filter((item) => {
      const matchServer =
        server === "Todos" ||
        normalizeServer(item.server) === normalizeServer(server);
      const matchType = type === "Todos" || item.type === type;
      const matchItemCategory =
        itemCategory === "Todos" ||
        item.type !== "Item" ||
        item.title.toLowerCase().includes(itemCategory.toLowerCase());
      const searchable = [
        item.title,
        item.description || "",
        item.server,
        formatServerLabel(item.server),
        item.type,
        item.price,
      ]
        .join(" ")
        .toLowerCase();
      const matchSearch =
        normalizedQuery.length === 0 || searchable.includes(normalizedQuery);

      return matchServer && matchType && matchItemCategory && matchSearch;
    });
  }, [listings, server, type, itemCategory, query]);

  const displayListings = useMemo(() => {
    const grouped = new Map<string, Listing>();
    const visible: Listing[] = [];

    filtered.forEach((item) => {
      if (item.type !== "Wons") {
        visible.push(item);
        return;
      }

      const groupKey = `${item.server}|${item.price}`;
      const current = grouped.get(groupKey);

      if (!current) {
        const next = {
          ...item,
          title: String(parseQuantity(item.title)),
          description: null,
          group_listing_ids: [item.id],
        };
        grouped.set(groupKey, next);
        visible.push(next);
        return;
      }

      current.group_listing_ids = [...(current.group_listing_ids || []), item.id];
      current.title = String(
        parseQuantity(current.title) + parseQuantity(item.title)
      );
    });

    const bestByServer = new Map<string, number>();

    visible.forEach((item) => {
      if (item.type !== "Wons") return;

      const price = parseListingPrice(item.price);
      const current = bestByServer.get(item.server);

      if (price > 0 && (current === undefined || price < current)) {
        bestByServer.set(item.server, price);
      }
    });

    const filteredVisible = bestPriceOnly
      ? visible.filter(
          (item) =>
            item.type !== "Wons" ||
            parseListingPrice(item.price) === bestByServer.get(item.server)
        )
      : visible;

    return filteredVisible.sort((a, b) => {
      if (a.type === "Wons" && b.type !== "Wons") return -1;
      if (a.type !== "Wons" && b.type === "Wons") return 1;

      if (a.type === "Wons" && b.type === "Wons") {
        if (sortMode === "quantity") {
          return parseQuantity(b.title) - parseQuantity(a.title);
        }

        const serverCompare = formatServerLabel(a.server).localeCompare(
          formatServerLabel(b.server)
        );

        if (sortMode === "server" && serverCompare !== 0) return serverCompare;
        if (sortMode === "best" && serverCompare !== 0) return serverCompare;

        return parseListingPrice(a.price) - parseListingPrice(b.price);
      }

      if (sortMode === "newest") {
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      }

      return a.title.localeCompare(b.title);
    });
  }, [bestPriceOnly, filtered, sortMode]);

  const bestWonPriceByServer = useMemo(() => {
    const best = new Map<string, number>();

    displayListings.forEach((item) => {
      if (item.type !== "Wons") return;

      const price = parseListingPrice(item.price);
      const current = best.get(item.server);

      if (price > 0 && (current === undefined || price < current)) {
        best.set(item.server, price);
      }
    });

    return best;
  }, [displayListings]);

  const wonStockByServer = useMemo(() => {
    const stock = new Map<string, number>();

    displayListings.forEach((item) => {
      if (item.type !== "Wons") return;

      stock.set(
        item.server,
        (stock.get(item.server) || 0) + parseQuantity(item.title)
      );
    });

    return Array.from(stock.entries())
      .map(([serverName, quantity]) => ({ serverName, quantity }))
      .sort((a, b) => a.serverName.localeCompare(b.serverName));
  }, [displayListings]);

  function isReservedListing(item: Listing) {
    const ids = item.group_listing_ids || [item.id];

    return ids.some((id) => reservedListingIds.includes(id));
  }

  const totalPages = Math.ceil(displayListings.length / itemsPerPage);

  const paginatedListings = displayListings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  function showMissingFields(fields: string[]) {
    toast.error(`${validationText.missingFields}: ${fields.join(", ")}.`);
  }

  async function submitSale() {
    const rawSaleTitle =
      sale.type === "Item" && sale.item_category
        ? `${sale.item_category} - ${sale.title}`
        : sale.title;
    const cleanedSale = {
      title: cleanText(
        rawSaleTitle,
        sale.type === "Wons" ? quantityMaxLength : titleMaxLength
      ),
      description: cleanMultiline(sale.description, descriptionMaxLength),
      server: sale.server,
      type: sale.type,
      seller_expected_price: sale.seller_expected_price
        .trim()
        .slice(0, sale.type === "Wons" ? priceMaxLength : itemPriceMaxLength),
      seller_contact: cleanText(sale.seller_contact, contactMaxLength),
    };

    const missingSaleFields = [
      !cleanedSale.server && text.chooseServer,
      sale.type === "Item" && !sale.item_category && text.itemCategory,
      !cleanedSale.title && (sale.type === "Wons" ? text.quantity : text.title),
      (sale.type === "Wons"
        ? isIncompleteCentPrice(cleanedSale.seller_expected_price)
        : !cleanedSale.seller_expected_price) &&
        (sale.type === "Wons" ? text.sellerPricePerWon : text.sellerPrice),
      !sale.seller_contact_method && text.contactMethod,
      sale.seller_contact_method &&
        !cleanedSale.seller_contact &&
        text.sellerContact,
    ].filter(Boolean) as string[];

    if (missingSaleFields.length > 0) {
      showMissingFields(missingSaleFields);
      return;
    }

    const isValidSalePrice =
      sale.type === "Wons"
        ? isValidCentPrice(cleanedSale.seller_expected_price)
        : isValidItemPrice(cleanedSale.seller_expected_price);

    if (!isValidSalePrice) {
      toast.error(text.invalidPrice);
      return;
    }

    if ((sale.type === "Item" || sale.type === "Conta") && !imageFile) {
      toast.error(text.imageMissing);
      return;
    }

    if (
      imageFile &&
      (!allowedImageTypes.includes(imageFile.type) ||
        imageFile.size > maxImageSizeBytes)
    ) {
      toast.error(text.invalidImage);
      return;
    }

    setIsSubmittingSale(true);
    const formData = new FormData();
    formData.append("captcha", saleCaptchaToken);
    formData.append("title", cleanedSale.title);
    formData.append("description", cleanedSale.description);
    formData.append("server", cleanedSale.server);
    formData.append("type", cleanedSale.type);
    formData.append(
      "seller_expected_price",
      sale.type === "Wons"
        ? normalizeCentPrice(cleanedSale.seller_expected_price)
        : cleanedSale.seller_expected_price
    );
    formData.append("seller_contact_method", sale.seller_contact_method);
    formData.append("seller_contact", cleanedSale.seller_contact);

    if (imageFile) {
      formData.append("image", imageFile);
    }

    const response = await fetch("/api/sale-submissions", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setIsSubmittingSale(false);
      setSaleCaptchaToken("");
      setSaleCaptchaResetKey((key) => key + 1);
      toast.error(result.error || text.captchaFailed);
      return;
    }

    toast.success(text.saleSent);
    setIsSubmittingSale(false);
    setSaleCaptchaToken("");
    setSaleCaptchaResetKey((key) => key + 1);

    setSale({
      title: "",
      description: "",
      server: "",
      type: "Item",
      item_category: "",
      seller_expected_price: "",
      seller_contact_method: "Discord",
      seller_contact: "",
    });

    setImageFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function sendInterest() {
    const cleanedBuyerContact = cleanText(buyerContact, contactMaxLength);
    const cleanedBuyerDesired = cleanText(buyerDesired, quantityMaxLength);
    const cleanedBuyerMessage = cleanMultiline(buyerMessage, 600);
    const isWonListing = selectedListing?.type === "Wons";

    const missingInterestFields = [
      isWonListing && !cleanedBuyerDesired && text.quantity,
      !buyerContactMethod && text.contactMethod,
      buyerContactMethod && !cleanedBuyerContact && text.buyerContact,
      shouldShowCaptcha && !interestCaptchaToken && text.captcha,
    ].filter(Boolean) as string[];

    if (!selectedListing || missingInterestFields.length > 0) {
      showMissingFields(missingInterestFields);
      return;
    }

    setIsSendingInterest(true);
    const response = await fetch("/api/interest-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        captcha: interestCaptchaToken,
        listing_id: selectedListing.id,
        desired: isWonListing ? cleanedBuyerDesired : selectedListing.title,
        server: selectedListing.server,
        type: selectedListing.type,
        buyer_contact_method: buyerContactMethod,
        buyer_contact: cleanedBuyerContact,
        message: cleanedBuyerMessage,
      }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setIsSendingInterest(false);
      setInterestCaptchaToken("");
      setInterestCaptchaResetKey((key) => key + 1);
      toast.error(result.error || text.captchaFailed);
      return;
    }

    toast.success(text.requestSent);
    setIsSendingInterest(false);
    setSelectedListing(null);
    setBuyerContactMethod("Discord");
    setBuyerContact("");
    setBuyerDesired("");
    setBuyerMessage("");
    setInterestCaptchaToken("");
    setInterestCaptchaResetKey((key) => key + 1);
  }

  async function sendReport() {
    const cleanedReason = cleanMultiline(reportReason, 500);
    const cleanedContact = cleanText(reportContact, 80);

    const missingReportFields = [
      !cleanedReason && text.reportReason,
      shouldShowCaptcha && !reportCaptchaToken && text.captcha,
    ].filter(Boolean) as string[];

    if (!reportedListing || missingReportFields.length > 0) {
      showMissingFields(missingReportFields);
      return;
    }

    setIsSendingReport(true);
    const response = await fetch("/api/listing-reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        captcha: reportCaptchaToken,
        listing_id: reportedListing.id,
        reason: cleanedReason,
        reporter_contact: cleanedContact,
      }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setIsSendingReport(false);
      setReportCaptchaToken("");
      setReportCaptchaResetKey((key) => key + 1);
      toast.error(result.error || text.captchaFailed);
      return;
    }

    toast.success(text.reportSent);
    setIsSendingReport(false);
    setReportedListing(null);
    setReportReason("");
    setReportContact("");
    setReportCaptchaToken("");
    setReportCaptchaResetKey((key) => key + 1);
  }

  async function submitBuyOrder() {
    const cleanedBuyOrder = {
      desired: cleanText(buyOrder.desired, quantityMaxLength),
      server: buyOrder.server,
      type: buyOrder.type,
      max_price: buyOrder.max_price.trim().slice(0, priceMaxLength),
      buyer_contact: cleanText(buyOrder.buyer_contact, contactMaxLength),
      message: cleanMultiline(buyOrder.message, 600),
    };

    const missingBuyOrderFields = [
      !cleanedBuyOrder.server && text.chooseServer,
      !cleanedBuyOrder.desired && text.quantity,
      isIncompleteCentPrice(cleanedBuyOrder.max_price) && buyText.maxPrice,
      !buyOrder.buyer_contact_method && text.contactMethod,
      buyOrder.buyer_contact_method &&
        !cleanedBuyOrder.buyer_contact &&
        text.buyerContact,
    ].filter(Boolean) as string[];

    if (missingBuyOrderFields.length > 0) {
      showMissingFields(missingBuyOrderFields);
      return;
    }

    if (!isValidCentPrice(cleanedBuyOrder.max_price)) {
      toast.error(text.invalidPrice);
      return;
    }

    setIsSubmittingBuyOrder(true);
    const response = await fetch("/api/buy-orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        desired: cleanedBuyOrder.desired,
        server: cleanedBuyOrder.server,
        type: cleanedBuyOrder.type,
        max_price: normalizeCentPrice(cleanedBuyOrder.max_price),
        buyer_contact_method: buyOrder.buyer_contact_method,
        buyer_contact: cleanedBuyOrder.buyer_contact,
        message: cleanedBuyOrder.message,
        captcha: buyCaptchaToken,
      }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setIsSubmittingBuyOrder(false);
      setBuyCaptchaToken("");
      setBuyCaptchaResetKey((key) => key + 1);
      toast.error(result.error || text.captchaFailed);
      return;
    }

    toast.success(buyText.sent);
    setIsSubmittingBuyOrder(false);
    setBuyCaptchaToken("");
    setBuyCaptchaResetKey((key) => key + 1);
    setBuyOrder({
      desired: "",
      server: "",
      type: "Wons",
      max_price: "0.",
      buyer_contact_method: "Discord",
      buyer_contact: "",
      message: "",
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34rem),linear-gradient(180deg,#09090b,#0a0a0a_34rem,#050505)] text-white">
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#171717",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "14px",
          },
          success: {
            iconTheme: {
              primary: "#22c55e",
              secondary: "#000",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#000",
            },
          },
        }}
      />
      {shouldShowCaptcha && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setIsTurnstileReady(true)}
          onReady={() => setIsTurnstileReady(true)}
        />
      )}
      <TawkWidget />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/[0.82] backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <button
            type="button"
            onClick={() => {
              setView("market");
              setCurrentPage(1);
            }}
            className="w-fit text-left"
          >
            <h1 className="text-2xl font-black tracking-tight">
              Asrold Market
            </h1>
            <p className="text-sm text-emerald-200/70">Metin2 Marketplace</p>
          </button>

          <div className="flex justify-start lg:justify-center">
            <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
              <Link
                href="/how-it-works"
                className="rounded-xl border border-emerald-300/40 bg-emerald-300 px-5 py-2.5 text-sm font-black text-black shadow-xl shadow-emerald-950/20 hover:-translate-y-0.5 hover:bg-emerald-200"
              >
                {text.howItWorks}
              </Link>
              <Link
                href="/rules"
                className="rounded-xl border border-white/10 bg-neutral-900 px-5 py-2.5 text-sm font-black text-white shadow-xl shadow-black/20 hover:-translate-y-0.5 hover:border-emerald-300/35"
              >
                Rules
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
              <DiscordButton label="Asrold#3891" compact disabled />
              <DiscordButton
                label="Join Discord server"
                href="https://discord.gg/AGT9YFnvK"
                compact
              />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLanguageMenuOpen((open) => !open)}
                aria-label={languageOptions[lang].label}
                title={languageOptions[lang].label}
                className="flex h-10 w-[4.25rem] items-center justify-center gap-2 rounded-lg border border-white/10 bg-neutral-900/80 text-neutral-300 hover:border-white/25 hover:bg-neutral-800"
              >
                <span
                  aria-hidden="true"
                  className={`language-flag ${languageOptions[lang].flagClass}`}
                />
                <span className="text-sm font-black leading-none text-emerald-300">
                  ▾
                </span>
              </button>

              {isLanguageMenuOpen && (
                <div className="absolute right-0 top-12 z-50 grid gap-2 rounded-xl border border-white/10 bg-neutral-950 p-2 shadow-2xl shadow-black/40">
                  {(["en", "es", "pt", "de", "ro", "tr"] as Lang[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        setLang(l);
                        setIsLanguageMenuOpen(false);
                      }}
                      aria-label={languageOptions[l].label}
                      title={languageOptions[l].label}
                      className={`flex h-10 w-12 items-center justify-center rounded-lg border ${
                        lang === l
                          ? "border-white bg-white text-black shadow-lg shadow-white/10"
                          : "border-white/10 bg-neutral-900/80 text-neutral-300 hover:border-white/25 hover:bg-neutral-800"
                      }`}
                    >
                  <span
                    aria-hidden="true"
                    className={`language-flag ${languageOptions[l].flagClass}`}
                  />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {view === "market" && (
        <>
          <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(24,24,27,0.96),rgba(3,7,18,0.9)),radial-gradient(circle_at_80%_20%,rgba(250,204,21,0.18),transparent_22rem)] p-8 shadow-2xl shadow-black/30 md:p-12">
              <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-emerald-400/10 blur-2xl" />
              <p className="mb-4 w-fit rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-100">
                Asrold Market
              </p>

              <h2 className="relative max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
                {text.hero}
              </h2>

              <p className="relative mt-5 max-w-2xl text-lg leading-8 text-neutral-300">
                {text.sub}
              </p>

              <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setView("sell")}
                  className="rounded-2xl border border-red-200/40 bg-red-300 px-7 py-4 text-base font-black text-black shadow-2xl shadow-red-950/25 hover:-translate-y-1 hover:bg-red-200"
                >
                  {text.sell}
                </button>

                <button
                  onClick={() => setView("buy")}
                  className="rounded-2xl border border-emerald-200/50 bg-emerald-300 px-7 py-4 text-base font-black text-black shadow-2xl shadow-emerald-950/30 hover:-translate-y-1 hover:bg-emerald-200"
                >
                  {buyText.nav}
                </button>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-5">
            <div className="mb-6 rounded-2xl border border-white/10 bg-neutral-900/80 p-4 shadow-xl shadow-black/20 backdrop-blur">
              <div className="grid gap-3 md:grid-cols-4">
                <input
                  placeholder={text.search}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                />

                <select
                  value={server}
                  onChange={(e) => {
                    setServer(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-12 outline-none [color-scheme:dark] focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                >
                  {servers.map((s) => (
                    <option key={s} value={s}>
                      {s === "Todos" ? text.allServers : formatServerLabel(s)}
                    </option>
                  ))}
                </select>

                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    if (e.target.value !== "Item") {
                      setItemCategory("Todos");
                    }
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-12 outline-none [color-scheme:dark] focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                >
                  {allTypes.map((t) => (
                    <option key={t} value={t}>
                      {typeLabels[t as keyof typeof typeLabels]}
                    </option>
                  ))}
                </select>

                <select
                  value={itemCategory}
                  onChange={(e) => {
                    setItemCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  disabled={type !== "Todos" && type !== "Item"}
                  className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-12 outline-none [color-scheme:dark] focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {itemCategories.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category] || category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                <select
                  value={sortMode}
                  onChange={(e) => {
                    setSortMode(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-12 outline-none [color-scheme:dark] focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                >
                  <option value="best">
                    {text.sortBy}: {text.sortBest}
                  </option>
                  <option value="newest">
                    {text.sortBy}: {text.sortNewest}
                  </option>
                  <option value="quantity">
                    {text.sortBy}: {text.sortQuantity}
                  </option>
                  <option value="server">
                    {text.sortBy}: {text.sortServer}
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setBestPriceOnly((value) => !value);
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-black transition ${
                    bestPriceOnly
                      ? "border-emerald-200/50 bg-emerald-300 text-black"
                      : "border-white/10 bg-neutral-950/90 text-neutral-300 hover:border-emerald-300/35 hover:text-emerald-100"
                  }`}
                >
                  {text.bestPriceOnly}
                </button>
              </div>
            </div>

            {wonStockByServer.length > 0 && (
              <div className="mb-6 rounded-2xl border border-white/10 bg-neutral-900/65 p-4 shadow-xl shadow-black/15">
                <p className="mb-3 text-sm font-black text-neutral-200">
                  {text.stockTitle}
                </p>
                <div className="flex flex-wrap gap-2">
                  {wonStockByServer.map((item) => (
                    <span
                      key={item.serverName}
                      className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-sm font-bold text-yellow-100"
                    >
                      {formatServerLabel(item.serverName)}: {item.quantity}W
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
              <h3 className="text-2xl font-bold">{text.market}</h3>
              <p className="text-sm text-neutral-400">
                {filtered.length} {text.found}
              </p>
              </div>
            </div>

            {isLoadingListings ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="min-h-[420px] animate-pulse rounded-2xl border border-white/10 bg-neutral-900/[0.72]"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-900/70 p-10 text-center">
                <p className="text-lg font-bold">{text.noListingsTitle}</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
                  {text.noListingsText}
                </p>
              </div>
            ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedListings.map((item) => (
<article
  key={item.id}
  className="group flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/[0.92] shadow-xl shadow-black/15 transition hover:-translate-y-1 hover:border-emerald-200/35 hover:shadow-2xl hover:shadow-emerald-950/20"
>
  {item.type !== "Wons" ? (
    <div className="relative h-48 w-full overflow-hidden bg-neutral-800">
      {item.image_url ? (
        <button
          type="button"
          onClick={() => setOpenedImage(item.image_url)}
          className="h-full w-full cursor-zoom-in"
        >
          <img
            src={item.image_url}
            alt={item.title}
            className="pointer-events-none h-full w-full object-cover transition group-hover:scale-105"
          />
        </button>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-neutral-500">
          {text.noImage}
        </div>
      )}

      <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs backdrop-blur">
        {formatServerLabel(item.server)}
      </div>

      <div className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black shadow-lg shadow-black/20">
        {typeLabels[item.type as keyof typeof typeLabels] || item.type}
      </div>
    </div>
  ) : (
    <div className="relative p-5">
      {parseListingPrice(item.price) === bestWonPriceByServer.get(item.server) && (
        <span className="absolute right-8 top-8 z-10 rounded-full border border-emerald-200/35 bg-emerald-300 px-3 py-1 text-xs font-black text-black shadow-lg shadow-emerald-950/25">
          {text.bestPrice}
        </span>
      )}
      <div className="rounded-2xl border border-yellow-500/25 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.22),rgba(234,179,8,0.08))] p-6 text-center shadow-inner shadow-yellow-900/20">
        <p className="text-lg font-black text-yellow-100">
          {formatServerLabel(item.server)}
        </p>
        <p className="mt-3 flex items-baseline justify-center gap-2 text-yellow-300">
          <span className="text-5xl font-black leading-none">{item.title}</span>
          <span className="text-3xl font-black leading-none">W</span>
        </p>
      </div>
    </div>
  )}

  <div className="flex flex-1 flex-col p-5">
    <div className="mb-3 flex flex-wrap gap-2">
      <span className="rounded-full border border-white/10 bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
        {formatServerLabel(item.server)}
      </span>
      <span className="rounded-full border border-white/10 bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
        {typeLabels[item.type as keyof typeof typeLabels] || item.type}
      </span>
    </div>

    <span className="w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
      {item.status || text.available}
    </span>

    {isReservedListing(item) && (
      <span className="mt-2 w-fit rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-xs font-bold text-yellow-200">
        {text.reserved}
      </span>
    )}

    <h2 className="mt-4 text-lg font-bold leading-snug">
      {item.type === "Wons" ? `${item.title} W` : item.title}
    </h2>

    <div className="mt-auto pt-5">
      <p className="text-xs text-neutral-500">{text.price}</p>
      <p className="text-2xl font-black">{item.price}</p>

      <button
        onClick={() => {
          setSelectedListing(item);
          setBuyerDesired(item.type === "Wons" ? item.title : "");
          setBuyerContactMethod("Discord");
        }}
        className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-black shadow-lg shadow-white/10 hover:-translate-y-0.5 hover:bg-neutral-200"
      >
        {text.interest}
      </button>

      <button
        type="button"
        onClick={() => setReportedListing(item)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-2.5 text-sm font-bold text-neutral-300 hover:border-red-300/35 hover:bg-red-500/10 hover:text-red-100"
      >
        {text.reportListing}
      </button>
    </div>
  </div>
</article>
              ))}
            </div>
            )}

            {!isLoadingListings && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 hover:bg-neutral-800 disabled:opacity-40"
                >
                  {text.previous}
                </button>

                <span className="text-sm text-neutral-400">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 hover:bg-neutral-800 disabled:opacity-40"
                >
                  {text.next}
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {view === "sell" && (
        <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl border border-white/10 bg-neutral-900/85 p-8 shadow-xl shadow-black/20">
              <h3 className="text-2xl font-bold">{text.submitTitle}</h3>
              <p className="mt-2 leading-7 text-neutral-300">{text.submitText}</p>
              <p className="mt-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-semibold leading-6 text-red-200">
                {text.contactNotice}
              </p>

              <button
                onClick={() => setView("market")}
                className="mt-6 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold hover:border-white/25 hover:bg-white/5"
              >
                {text.backMarket}
              </button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-neutral-900/85 p-6 shadow-xl shadow-black/20">
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="relative">
                    <select
                      value={sale.server}
                      onChange={(e) =>
                        setSale({ ...sale, server: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-12 outline-none [color-scheme:dark] focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                    >
                      <option value="" disabled>
                        {text.chooseServer}
                      </option>
                      {servers
                        .filter((s) => s !== "Todos")
                        .map((s) => (
                          <option key={s} value={s}>
                            {formatServerLabel(s)}
                          </option>
                        ))}
                    </select>
                    <RequiredMark show={!sale.server} />
                  </div>

                  <select
                    value={sale.type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setSale({
                        ...sale,
                        type: nextType,
                        item_category: nextType === "Item" ? sale.item_category : "",
                        seller_expected_price: getInitialPriceForType(nextType),
                      });
                      setImageFile(null);

                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-12 outline-none [color-scheme:dark] focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                  >
                    {saleTypes.map((t) => (
                      <option key={t} value={t}>
                        {typeLabels[t as keyof typeof typeLabels]}
                      </option>
                    ))}
                  </select>
                </div>

                {sale.type === "Item" && (
                  <div className="relative">
                    <select
                      value={sale.item_category}
                      onChange={(e) =>
                        setSale({ ...sale, item_category: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-12 outline-none [color-scheme:dark] focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                    >
                      <option value="" disabled>
                        {text.itemCategory}
                      </option>
                      {itemCategories
                        .filter((category) => category !== "Todos")
                        .map((category) => (
                          <option key={category} value={category}>
                            {categoryLabels[category] || category}
                          </option>
                        ))}
                    </select>
                    <RequiredMark show={!sale.item_category} />
                  </div>
                )}

                <div className="relative">
                  <input
                    type={sale.type === "Wons" ? "number" : "text"}
                    min={sale.type === "Wons" ? "0" : undefined}
                    maxLength={
                      sale.type === "Wons" ? quantityMaxLength : titleMaxLength
                    }
                    placeholder={
                      sale.type === "Wons" ? text.quantity : text.title
                    }
                    value={sale.title}
                    onChange={(e) =>
                      setSale({
                        ...sale,
                        title: e.target.value.slice(
                          0,
                          sale.type === "Wons"
                            ? quantityMaxLength
                            : titleMaxLength
                        ),
                      })
                    }
                    className={`w-full rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15 ${
                      sale.type === "Wons" ? "pr-10" : ""
                    }`}
                  />

                  {sale.type === "Wons" && (
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-bold text-yellow-300">
                      W
                    </span>
                  )}
                  <RequiredMark show={!sale.title.trim()} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={
                        sale.type === "Wons"
                          ? priceMaxLength
                          : itemPriceMaxLength
                      }
                      placeholder={
                        sale.type === "Wons"
                          ? text.sellerPricePerWon
                          : text.sellerPrice
                      }
                      value={sale.seller_expected_price}
                      onChange={(e) =>
                        setSale({
                          ...sale,
                          seller_expected_price:
                            sale.type === "Wons"
                              ? formatCentPriceInput(e.target.value)
                              : formatItemPriceInput(e.target.value),
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-14 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                    />

                    <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-neutral-400">
                      €
                    </span>
                    <RequiredMark
                      show={
                        sale.type === "Wons"
                          ? isIncompleteCentPrice(sale.seller_expected_price)
                          : !sale.seller_expected_price.trim()
                      }
                    />
                  </div>

                  <div className="grid gap-3 md:col-span-2 sm:grid-cols-[9rem_1fr]">
                    <select
                      value={sale.seller_contact_method}
                      onChange={(e) =>
                        setSale({
                          ...sale,
                          seller_contact_method: e.target.value,
                        })
                      }
                      className="w-full min-w-0 rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-12 outline-none [color-scheme:dark] focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                    >
                      {contactMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>

                    <div className="relative">
                      <input
                        placeholder={contactPlaceholder(
                          sale.seller_contact_method
                        )}
                        maxLength={contactMaxLength}
                        value={sale.seller_contact}
                        onChange={(e) =>
                          setSale({ ...sale, seller_contact: e.target.value })
                        }
                        className="w-full min-w-0 rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                      />
                      <RequiredMark show={!sale.seller_contact.trim()} />
                    </div>
                    <div className="sm:col-start-2">
                      <ContactHint
                        method={sale.seller_contact_method}
                        text={text}
                      />
                    </div>
                  </div>
                </div>

                {(sale.type === "Item" || sale.type === "Conta") && (
                  <div>
                    <p className="mb-2 text-sm text-neutral-400">
                      {text.imageRequired}
                    </p>
                    <input
                      id="sale-image"
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;

                        if (
                          file &&
                          (!allowedImageTypes.includes(file.type) ||
                            file.size > maxImageSizeBytes)
                        ) {
                          toast.error(text.invalidImage);
                          e.target.value = "";
                          setImageFile(null);
                          return;
                        }

                        setImageFile(file);
                      }}
                      className="sr-only"
                    />
                    <label
                      htmlFor="sale-image"
                      className="flex cursor-pointer flex-col gap-1 rounded-xl border border-dashed border-white/15 bg-neutral-950/90 px-4 py-3 text-sm outline-none hover:border-emerald-300/45 hover:bg-neutral-900 focus-within:border-emerald-300/60"
                    >
                      <span className="font-semibold text-white">
                        {text.chooseImage}
                      </span>
                      <span className="truncate text-neutral-400">
                        {imageFile?.name || text.noFileSelected}
                      </span>
                    </label>
                  </div>
                )}

                {shouldShowCaptcha && (
                  <div className="w-fit">
                    <TurnstileBox
                      isReady={isTurnstileReady}
                      resetKey={saleCaptchaResetKey}
                      onToken={setSaleCaptchaToken}
                      onExpire={() => setSaleCaptchaToken("")}
                    />
                  </div>
                )}

                <button
                  onClick={submitSale}
                  disabled={isSubmittingSale}
                  className="rounded-xl bg-white px-5 py-3 font-bold text-black shadow-lg shadow-white/10 hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingSale ? text.loading : text.sendSale}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {view === "buy" && (
        <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl border border-white/10 bg-neutral-900/85 p-8 shadow-xl shadow-black/20">
              <h3 className="text-2xl font-bold">{buyText.title}</h3>
              <p className="mt-2 leading-7 text-neutral-300">
                {buyText.intro}
              </p>
              <p className="mt-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-semibold leading-6 text-red-200">
                {text.contactNotice}
              </p>

              <button
                onClick={() => setView("market")}
                className="mt-6 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold hover:border-white/25 hover:bg-white/5"
              >
                {text.backMarket}
              </button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-neutral-900/85 p-6 shadow-xl shadow-black/20">
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="relative">
                    <select
                      value={buyOrder.server}
                      onChange={(e) =>
                        setBuyOrder({ ...buyOrder, server: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-12 outline-none [color-scheme:dark] focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                    >
                      <option value="" disabled>
                        {text.chooseServer}
                      </option>
                      {servers
                        .filter((s) => s !== "Todos")
                        .map((s) => (
                          <option key={s} value={s}>
                            {formatServerLabel(s)}
                          </option>
                        ))}
                    </select>
                    <RequiredMark show={!buyOrder.server} />
                  </div>

                  <select
                    value={buyOrder.type}
                    onChange={(e) =>
                      setBuyOrder({ ...buyOrder, type: e.target.value })
                    }
                    className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-12 outline-none [color-scheme:dark] focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                  >
                    {buyOrderTypes.map((t) => (
                      <option key={t} value={t}>
                        {typeLabels[t as keyof typeof typeLabels]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder={text.quantity}
                    maxLength={quantityMaxLength}
                    value={buyOrder.desired}
                    onChange={(e) =>
                      setBuyOrder({
                        ...buyOrder,
                        desired: e.target.value.slice(0, quantityMaxLength),
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-10 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-bold text-yellow-300">
                    W
                  </span>
                  <RequiredMark show={!buyOrder.desired.trim()} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={priceMaxLength}
                      placeholder={buyText.maxPrice}
                      value={buyOrder.max_price}
                      onChange={(e) =>
                        setBuyOrder({
                          ...buyOrder,
                          max_price: formatCentPriceInput(e.target.value),
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-14 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                    />
                    <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-neutral-400">
                      €
                    </span>
                    <RequiredMark
                      show={isIncompleteCentPrice(buyOrder.max_price)}
                    />
                  </div>

                  <div className="grid gap-3 md:col-span-2 sm:grid-cols-[9rem_1fr]">
                    <select
                      value={buyOrder.buyer_contact_method}
                      onChange={(e) =>
                        setBuyOrder({
                          ...buyOrder,
                          buyer_contact_method: e.target.value,
                        })
                      }
                      className="w-full min-w-0 rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-12 outline-none [color-scheme:dark] focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                    >
                      {contactMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>

                    <div className="relative">
                      <input
                        placeholder={contactPlaceholder(
                          buyOrder.buyer_contact_method
                        )}
                        maxLength={contactMaxLength}
                        value={buyOrder.buyer_contact}
                        onChange={(e) =>
                          setBuyOrder({
                            ...buyOrder,
                            buyer_contact: e.target.value,
                          })
                        }
                        className="w-full min-w-0 rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                      />
                      <RequiredMark show={!buyOrder.buyer_contact.trim()} />
                    </div>
                    <div className="sm:col-start-2">
                      <ContactHint
                        method={buyOrder.buyer_contact_method}
                        text={text}
                      />
                    </div>
                  </div>
                </div>

                <textarea
                  placeholder={text.message}
                  maxLength={600}
                  value={buyOrder.message}
                  onChange={(e) =>
                    setBuyOrder({ ...buyOrder, message: e.target.value })
                  }
                  className="min-h-28 rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                />

                {shouldShowCaptcha && (
                  <div className="w-fit">
                    <TurnstileBox
                      isReady={isTurnstileReady}
                      resetKey={buyCaptchaResetKey}
                      onToken={setBuyCaptchaToken}
                      onExpire={() => setBuyCaptchaToken("")}
                    />
                  </div>
                )}

                <button
                  onClick={submitBuyOrder}
                  disabled={isSubmittingBuyOrder}
                  className="rounded-xl bg-white px-5 py-3 font-bold text-black shadow-lg shadow-white/10 hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingBuyOrder ? text.loading : buyText.send}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/50">
            <h3 className="text-xl font-bold">{selectedListing.title}</h3>
            <p className="mt-1 text-sm text-neutral-400">
              {formatServerLabel(selectedListing.server)} - {selectedListing.price}
            </p>

            {selectedListing.type === "Wons" && (
              <div className="mt-5">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    maxLength={quantityMaxLength}
                    placeholder={text.quantity}
                    value={buyerDesired}
                    onChange={(e) =>
                      setBuyerDesired(e.target.value.slice(0, quantityMaxLength))
                    }
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 pr-10 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-bold text-yellow-300">
                    W
                  </span>
                </div>

              </div>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-[9rem_1fr]">
              <select
                value={buyerContactMethod}
                onChange={(e) => setBuyerContactMethod(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 pr-12 outline-none [color-scheme:dark] focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
              >
                {contactMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>

              <div className="relative">
                <input
                  placeholder={contactPlaceholder(buyerContactMethod)}
                  maxLength={contactMaxLength}
                  value={buyerContact}
                  onChange={(e) => setBuyerContact(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                />
                <RequiredMark show={!buyerContact.trim()} />
              </div>
              <div className="sm:col-start-2">
                <ContactHint method={buyerContactMethod} text={text} />
              </div>
            </div>

            <textarea
              placeholder={text.message}
              maxLength={600}
              value={buyerMessage}
              onChange={(e) => setBuyerMessage(e.target.value)}
              className="mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
            />

            {shouldShowCaptcha && (
              <div className="mt-3 w-fit">
                <TurnstileBox
                  isReady={isTurnstileReady}
                  resetKey={interestCaptchaResetKey}
                  onToken={setInterestCaptchaToken}
                  onExpire={() => setInterestCaptchaToken("")}
                />
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={sendInterest}
                disabled={isSendingInterest}
                className="flex-1 rounded-xl bg-white px-4 py-3 font-bold text-black shadow-lg shadow-white/10 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingInterest ? text.loading : text.sendRequest}
              </button>

              <button
                onClick={() => {
                  setSelectedListing(null);
                  setBuyerDesired("");
                  setInterestCaptchaToken("");
                  setInterestCaptchaResetKey((key) => key + 1);
                }}
                className="flex-1 rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 hover:bg-neutral-700"
              >
                {text.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/50">
            <h3 className="text-xl font-bold">{text.reportListing}</h3>
            <p className="mt-1 text-sm text-neutral-400">
              {reportedListing.title} · {formatServerLabel(reportedListing.server)}
            </p>

            <textarea
              placeholder={text.reportReason}
              maxLength={500}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="mt-5 min-h-28 w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-red-300/60 focus:ring-2 focus:ring-red-400/15"
            />

            <input
              placeholder={text.reportContact}
              maxLength={80}
              value={reportContact}
              onChange={(e) => setReportContact(e.target.value)}
              className="mt-3 w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
            />

            {shouldShowCaptcha && (
              <div className="mt-3 w-fit">
                <TurnstileBox
                  isReady={isTurnstileReady}
                  resetKey={reportCaptchaResetKey}
                  onToken={setReportCaptchaToken}
                  onExpire={() => setReportCaptchaToken("")}
                />
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={sendReport}
                disabled={isSendingReport}
                className="flex-1 rounded-xl bg-red-200 px-4 py-3 font-bold text-black shadow-lg shadow-red-950/20 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingReport ? text.loading : text.sendReport}
              </button>

              <button
                onClick={() => {
                  setReportedListing(null);
                  setReportReason("");
                  setReportContact("");
                  setReportCaptchaToken("");
                  setReportCaptchaResetKey((key) => key + 1);
                }}
                className="flex-1 rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 hover:bg-neutral-700"
              >
                {text.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {openedImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/[0.92] p-5 backdrop-blur">
          <button
            type="button"
            onClick={() => setOpenedImage(null)}
            className="absolute right-6 top-6 rounded-full bg-white px-4 py-2 font-bold text-black shadow-xl shadow-black/30 hover:bg-neutral-200"
          >
            X
          </button>

          <img
            src={openedImage}
            alt="Imagem ampliada"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
          />
        </div>
      )}

      <footer className="mt-16 border-t border-white/10 bg-black/20 px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 text-sm text-neutral-500 md:flex-row">
          <p>© Asrold Market  Metin2 Marketplace</p>
          <p>Manual mediation to reduce scam risk.</p>
        </div>
      </footer>
    </main>
  );
}
