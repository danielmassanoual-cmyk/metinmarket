"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../lib/supabase";

type Lang = "pt" | "en" | "de" | "ro" | "tr";
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
};

const servers = ["Todos", "EUW-Iberia", "EUW-Tigerghost", "EUW-Ruby", "EUW-Germania", "EUW-Teutonia", "EUW-Oceane", "EUW-Chimera", "EUW-Europe", "EUW-Italia", "EUW-Lumen", "TR-Safir", "TR-Star", "TR-Charon", "TR-Lucifer"];
const allTypes = ["Todos", "Item", "Conta", "Wons"];
const saleTypes = ["Item", "Conta", "Wons"];
const buyOrderTypes = ["Wons"];
const contactMethods = ["Discord", "Whatsapp", "Facebook"];
const itemsPerPage = 12;
const titleMaxLength = 25;
const quantityMaxLength = 6;
const priceMaxLength = 4;
const contactMaxLength = 50;
const descriptionMaxLength = 200;
const maxImageSizeBytes = 4 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

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

function normalizeServer(value: string) {
  return value.trim().toLowerCase().replace(/^(euw|tr)-/, "");
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
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;
  }, [onExpire, onToken]);

  useEffect(() => {
    const turnstile = window.turnstile;

    if (!siteKey || !isReady || !containerRef.current || !turnstile) return;

    if (widgetIdRef.current && turnstile.remove) {
      turnstile.remove(widgetIdRef.current);
    }

    containerRef.current.innerHTML = "";
    widgetIdRef.current = turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onExpireRef.current(),
      "error-callback": () => onExpireRef.current(),
    });

    return () => {
      if (widgetIdRef.current && turnstile.remove) {
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

  return <div ref={containerRef} className="min-h-[65px]" />;
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
  const [view, setView] = useState<View>("market");

  const [listings, setListings] = useState<Listing[]>([]);
  const [server, setServer] = useState("Todos");
  const [type, setType] = useState("Todos");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [buyerContactMethod, setBuyerContactMethod] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [buyerMessage, setBuyerMessage] = useState("");

  const [openedImage, setOpenedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [isSendingInterest, setIsSendingInterest] = useState(false);
  const [isSubmittingBuyOrder, setIsSubmittingBuyOrder] = useState(false);
  const [isTurnstileReady, setIsTurnstileReady] = useState(false);
  const [saleCaptchaToken, setSaleCaptchaToken] = useState("");
  const [buyCaptchaToken, setBuyCaptchaToken] = useState("");
  const [saleCaptchaResetKey, setSaleCaptchaResetKey] = useState(0);
  const [buyCaptchaResetKey, setBuyCaptchaResetKey] = useState(0);

  const [sale, setSale] = useState({
    title: "",
    description: "",
    server: "EUW-Iberia",
    type: "Item",
    seller_expected_price: "",
    seller_contact_method: "",
    seller_contact: "",
  });

  const [buyOrder, setBuyOrder] = useState({
    desired: "",
    server: "EUW-Iberia",
    type: "Wons",
    max_price: "",
    buyer_contact_method: "",
    buyer_contact: "",
    message: "",
  });

  const text = {
    pt: {
      hero: "Compra e vende no Metin2 com mais segurança.",
      sub: "Anúncios de contas, itens e wons com intermediação manual.",
      market: "Mercado",
      sell: "Vender",
      buyOrder: "Buy order",
      search: "Pesquisar anúncio...",
      allServers: "Todos os servidores",
      allTypes: "Todos os tipos",
      found: "anúncio(s) encontrados",
      noImage: "Sem imagem",
      price: "Preço",
      available: "Disponível",
      interest: "Tenho interesse",
      submitTitle: "Queres vender?",
      submitText:
        "Submete o teu item, conta ou wons. O teu contacto e preço pretendido ficam privados e só são visíveis para o administrador.",
      title: "Título",
      quantity: "Quantidade",
      sellerPrice: "Preço pretendido pelo vendedor",
      sellerPricePerWon: "Preço por won",
      sellerContact: "Contacto do vendedor (privado)",
      description: "Descrição",
      imageRequired: "Imagem obrigatória para itens e contas",
      chooseImage: "Escolher imagem",
      noFileSelected: "Nenhuma imagem selecionada",
      sendSale: "Enviar para aprovação",
      backMarket: "← Voltar ao mercado",
      buyerContact: "O teu contacto",
      contactMethod: "Contacto",
      contactNotice:
        "Os contactos fornecidos deverao ser Discord, Facebook ou WhatsApp.",
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
      captcha: "Verificacao de seguranca",
      captchaMissing: "Completa a verificacao de seguranca.",
      captchaFailed: "A verificacao de seguranca falhou. Tenta novamente.",
      loading: "A carregar...",
      noListingsTitle: "Sem anúncios disponíveis",
      noListingsText: "Tenta ajustar os filtros ou volta mais tarde.",
      buyOrderTitle: "Nao encontras o que queres?",
      buyOrderText:
        "Cria uma buy order. Quando existir relacao com um anuncio, o admin recebe um aviso para acelerar a venda.",
      desiredItem: "O que queres comprar",
      maxPrice: "Preco maximo",
      sendBuyOrder: "Criar buy order",
      buyOrderSent: "Buy order enviada.",
      buyOrderMissing: "Preenche o que procuras, contacto e preco maximo.",
      invalidPrice: "Introduz um preco valido.",
      invalidImage: "Usa uma imagem JPG, PNG ou WebP ate 4MB.",
    },
    en: {
      hero: "Buy and sell in Metin2 with more safety.",
      sub: "Listings for accounts, items and wons with manual mediation.",
      market: "Market",
      sell: "Sell",
      buyOrder: "Buy order",
      search: "Search listing...",
      allServers: "All servers",
      allTypes: "All types",
      found: "listing(s) found",
      noImage: "No image",
      price: "Price",
      available: "Available",
      interest: "I'm interested",
      submitTitle: "Want to sell?",
      submitText:
        "Submit your item, account or wons. Your contact and desired price stay private and are only visible to the admin.",
      title: "Title",
      quantity: "Quantity",
      sellerPrice: "Seller desired price",
      sellerPricePerWon: "Price per won",
      sellerContact: "Seller contact (private)",
      description: "Description",
      imageRequired: "Image required for items and accounts",
      chooseImage: "Choose image",
      noFileSelected: "No image selected",
      sendSale: "Send for approval",
      backMarket: "← Back to market",
      buyerContact: "Your contact",
      contactMethod: "Contact",
      contactNotice:
        "Provided contacts must be Discord, Facebook or WhatsApp.",
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
        "Create a buy order. When it matches a listing, the admin gets an alert to speed up the sale.",
      desiredItem: "What you want to buy",
      maxPrice: "Max price",
      sendBuyOrder: "Create buy order",
      buyOrderSent: "Buy order submitted.",
      buyOrderMissing: "Fill what you want, contact and max price.",
      invalidPrice: "Enter a valid price.",
      invalidImage: "Use a JPG, PNG or WebP image up to 4MB.",
    },
    de: {
      hero: "Kaufe und verkaufe in Metin2 mit mehr Sicherheit.",
      sub: "Anzeigen für Accounts, Items und Wons mit manueller Vermittlung.",
      market: "Markt",
      sell: "Verkaufen",
      search: "Anzeige suchen...",
      allServers: "Alle Server",
      allTypes: "Alle Typen",
      found: "Anzeige(n) gefunden",
      noImage: "Kein Bild",
      price: "Preis",
      available: "Verfügbar",
      interest: "Ich bin interessiert",
      submitTitle: "Möchtest du verkaufen?",
      submitText:
        "Reiche dein Item, deinen Account oder Wons ein. Dein Kontakt und Wunschpreis bleiben privat und sind nur für den Admin sichtbar.",
      title: "Titel",
      quantity: "Menge",
      sellerPrice: "Gewünschter Verkäuferpreis",
      sellerPricePerWon: "Preis pro Won",
      sellerContact: "Verkäuferkontakt (privat)",
      description: "Beschreibung",
      imageRequired: "Bild erforderlich für Items und Accounts",
      chooseImage: "Bild auswählen",
      noFileSelected: "Kein Bild ausgewählt",
      sendSale: "Zur Prüfung senden",
      backMarket: "← Zurück zum Markt",
      buyerContact: "Dein Kontakt",
      contactMethod: "Kontakt",
      contactNotice:
        "Die angegebenen Kontakte muessen Discord, Facebook oder WhatsApp sein.",
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
      captcha: "Sicherheitspruefung",
      captchaMissing: "Schliesse die Sicherheitspruefung ab.",
      captchaFailed: "Sicherheitspruefung fehlgeschlagen. Bitte erneut versuchen.",
loading: "Laden...",
noListingsTitle: "Keine Anzeigen verfügbar",
noListingsText: "Passe die Filter an oder schau später wieder vorbei.",
buyOrder: "Kaufauftrag",
invalidPrice: "Gib einen gültigen Preis ein.",
invalidImage: "Verwende ein JPG-, PNG- oder WebP-Bild bis 4MB.",
    },
    ro: {
      hero: "Cumpără și vinde în Metin2 mai sigur.",
      sub: "Anunțuri pentru conturi, iteme și wons cu intermediere manuală.",
      market: "Piață",
      sell: "Vinde",
      search: "Caută anunț...",
      allServers: "Toate serverele",
      allTypes: "Toate tipurile",
      found: "anunț(uri) găsite",
      noImage: "Fără imagine",
      price: "Preț",
      available: "Disponibil",
      interest: "Sunt interesat",
      submitTitle: "Vrei să vinzi?",
      submitText:
        "Trimite itemul, contul sau wons. Contactul și prețul dorit rămân private și sunt vizibile doar administratorului.",
      title: "Titlu",
      quantity: "Cantitate",
      sellerPrice: "Preț dorit de vânzător",
      sellerPricePerWon: "Preț per won",
      sellerContact: "Contact vânzător (privat)",
      description: "Descriere",
      imageRequired: "Imagine obligatorie pentru iteme și conturi",
      chooseImage: "Alege imaginea",
      noFileSelected: "Nicio imagine selectată",
      sendSale: "Trimite spre aprobare",
      backMarket: "← Înapoi la piață",
      buyerContact: "Contactul tău",
      contactMethod: "Contact",
      contactNotice:
        "Contactele furnizate trebuie sa fie Discord, Facebook sau WhatsApp.",
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
      captchaMissing: "Completeaza verificarea de securitate.",
      captchaFailed: "Verificarea de securitate a esuat. Incearca din nou.",
loading: "Se încarcă...",
noListingsTitle: "Nu există anunțuri disponibile",
noListingsText: "Încearcă să ajustezi filtrele sau revino mai târziu.",
buyOrder: "Ordin de cumpărare",
invalidPrice: "Introdu un preț valid.",
invalidImage: "Folosește o imagine JPG, PNG sau WebP de maximum 4MB.",
    },
    tr: {
      hero: "Metin2'de daha guvenli alisveris yap.",
      sub: "Hesaplar, itemler ve wons icin manuel aracilikli ilanlar.",
      market: "Pazar",
      sell: "Sat",
      buyOrder: "Alis emri",
      search: "Ilan ara...",
      allServers: "Tum sunucular",
      allTypes: "Tum turler",
      found: "ilan bulundu",
      noImage: "Gorsel yok",
      price: "Fiyat",
      available: "Musait",
      interest: "Ilgileniyorum",
      submitTitle: "Satmak ister misin?",
      submitText:
        "Itemini, hesabini veya wons miktarini gonder. Iletisim bilgin ve istedigin fiyat gizli kalir, sadece admin tarafindan gorulur.",
      title: "Baslik",
      quantity: "Miktar",
      sellerPrice: "Saticinin istedigi fiyat",
      sellerPricePerWon: "Won basina fiyat",
      sellerContact: "Satici iletisimi (gizli)",
      description: "Aciklama",
      imageRequired: "Itemler ve hesaplar icin gorsel zorunlu",
      chooseImage: "Gorsel sec",
      noFileSelected: "Gorsel secilmedi",
      sendSale: "Onaya gonder",
      backMarket: "← Pazara don",
      buyerContact: "Iletisim bilgin",
      contactMethod: "Iletisim",
      contactNotice:
        "Verilen iletisim bilgileri Discord, Facebook veya WhatsApp olmalidir.",
      message: "Mesaj",
      sendRequest: "Talep gonder",
      close: "Kapat",
      previous: "Onceki",
      next: "Sonraki",
      fillRequired: "Baslik, istenen fiyat ve iletisim bilgisini doldur.",
      imageMissing: "Itemler ve hesaplar icin gorsel zorunludur.",
      saleSent: "Satis onaya gonderildi.",
      requestSent: "Talep gonderildi.",
      contactMissing: "Iletisim bilgini doldur.",
      captcha: "Guvenlik kontrolu",
      captchaMissing: "Guvenlik kontrolunu tamamla.",
      captchaFailed: "Guvenlik kontrolu basarisiz. Lutfen tekrar dene.",
      loading: "Yukleniyor...",
      noListingsTitle: "Mevcut ilan yok",
      noListingsText: "Filtreleri degistirmeyi dene veya daha sonra tekrar bak.",
      buyOrderTitle: "Aradigini bulamadim mi?",
      buyOrderText:
        "Bir alis emri olustur. Bir ilanla eslestiginde admin satisi hizlandirmak icin bildirim alir.",
      desiredItem: "Ne almak istiyorsun",
      maxPrice: "Maksimum fiyat",
      sendBuyOrder: "Alis emri olustur",
      buyOrderSent: "Alis emri gonderildi.",
      buyOrderMissing:
        "Aradigin miktari, iletisim bilgisini ve maksimum fiyati doldur.",
      invalidPrice: "Gecerli bir fiyat gir.",
      invalidImage: "4MB'a kadar JPG, PNG veya WebP gorsel kullan.",
    },
  }[lang];

  const buyText = {
    pt: {
      nav: "Ordem de compra",
      title: "Nao encontras o que queres?",
      intro:
        "Cria uma buy order. Quando existir relacao com um anuncio, o admin recebe um aviso para acelerar a venda.",
      desired: "O que queres comprar",
      maxPrice: "Preco maximo",
      send: "Criar buy order",
      sent: "Buy order enviada.",
      missing: "Preenche o que procuras, contacto e preco maximo.",
    },
    en: {
      nav: "Buy order",
      title: "Can not find what you want?",
      intro:
        "Create a buy order. When it matches a listing, the admin gets an alert to speed up the sale.",
      desired: "What you want to buy",
      maxPrice: "Max price",
      send: "Create buy order",
      sent: "Buy order submitted.",
      missing: "Fill what you want, contact and max price.",
    },
    de: {
      nav: "Kaufauftrag",
      title: "Findest du nicht, was du suchst?",
      intro:
        "Erstelle eine Buy Order. Wenn sie zu einer Anzeige passt, bekommt der Admin eine Meldung.",
      desired: "Was du kaufen willst",
      maxPrice: "Maximaler Preis",
      send: "Buy order erstellen",
      sent: "Buy order gesendet.",
      missing: "Fuellen Sie Wunsch, Kontakt und Maximalpreis aus.",
    },
    ro: {
      nav: "Ordin de cumparare",
      title: "Nu gasesti ce cauti?",
      intro:
        "Creeaza o buy order. Cand se potriveste cu un anunt, adminul primeste o alerta.",
      desired: "Ce vrei sa cumperi",
      maxPrice: "Pret maxim",
      send: "Creeaza buy order",
      sent: "Buy order trimisa.",
      missing: "Completeaza ce cauti, contactul si pretul maxim.",
    },
    tr: {
      nav: "Alis emri",
      title: "Aradigini bulamadim mi?",
      intro:
        "Bir alis emri olustur. Bir ilanla eslestiginde admin satisi hizlandirmak icin bildirim alir.",
      desired: "Ne almak istiyorsun",
      maxPrice: "Maksimum fiyat",
      send: "Alis emri olustur",
      sent: "Alis emri gonderildi.",
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
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, description, server, type, price, status, image_url")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setIsLoadingListings(false);
      return;
    }

    setListings(data || []);
    setIsLoadingListings(false);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchListings();
  }, [fetchListings]);

  const filtered = useMemo(() => {
    return listings.filter((item) => {
      const matchServer =
        server === "Todos" ||
        normalizeServer(item.server) === normalizeServer(server);
      const matchType = type === "Todos" || item.type === type;
      const matchSearch = item.title
        .toLowerCase()
        .includes(query.toLowerCase());

      return matchServer && matchType && matchSearch;
    });
  }, [listings, server, type, query]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginatedListings = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  function showMissingFields(fields: string[]) {
    toast.error(`${validationText.missingFields}: ${fields.join(", ")}.`);
  }

  async function submitSale() {
    const cleanedSale = {
      title: cleanText(
        sale.title,
        sale.type === "Wons" ? quantityMaxLength : titleMaxLength
      ),
      description: cleanMultiline(sale.description, descriptionMaxLength),
      server: sale.server,
      type: sale.type,
      seller_expected_price: sale.seller_expected_price
        .trim()
        .slice(0, priceMaxLength),
      seller_contact: cleanText(sale.seller_contact, contactMaxLength),
    };

    const missingSaleFields = [
      !cleanedSale.title && (sale.type === "Wons" ? text.quantity : text.title),
      !cleanedSale.seller_expected_price &&
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

    if (!isPositiveNumber(cleanedSale.seller_expected_price)) {
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
    formData.append("seller_expected_price", cleanedSale.seller_expected_price);
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
      server: "EUW-Iberia",
      type: "Item",
      seller_expected_price: "",
      seller_contact_method: "",
      seller_contact: "",
    });

    setImageFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function sendInterest() {
    const cleanedBuyerContact = cleanText(buyerContact, contactMaxLength);
    const cleanedBuyerMessage = cleanMultiline(buyerMessage, 600);

    const missingInterestFields = [
      !buyerContactMethod && text.contactMethod,
      buyerContactMethod && !cleanedBuyerContact && text.buyerContact,
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
        listing_id: selectedListing.id,
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
      toast.error(result.error || text.captchaFailed);
      return;
    }

    toast.success(text.requestSent);
    setIsSendingInterest(false);
    setSelectedListing(null);
    setBuyerContactMethod("");
    setBuyerContact("");
    setBuyerMessage("");
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
      !cleanedBuyOrder.desired && text.quantity,
      !cleanedBuyOrder.max_price && buyText.maxPrice,
      !buyOrder.buyer_contact_method && text.contactMethod,
      buyOrder.buyer_contact_method &&
        !cleanedBuyOrder.buyer_contact &&
        text.buyerContact,
    ].filter(Boolean) as string[];

    if (missingBuyOrderFields.length > 0) {
      showMissingFields(missingBuyOrderFields);
      return;
    }

    if (!isPositiveNumber(cleanedBuyOrder.max_price)) {
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
        captcha: buyCaptchaToken,
        desired: cleanedBuyOrder.desired,
        server: cleanedBuyOrder.server,
        max_price: cleanedBuyOrder.max_price,
        buyer_contact_method: buyOrder.buyer_contact_method,
        buyer_contact: cleanedBuyOrder.buyer_contact,
        message: cleanedBuyOrder.message,
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
      server: "EUW-Iberia",
      type: "Wons",
      max_price: "",
      buyer_contact_method: "",
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
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setIsTurnstileReady(true)}
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/[0.82] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Asrold Market
            </h1>
            <p className="text-sm text-emerald-200/70">Metin2 Marketplace</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <div className="flex items-center gap-2">
              {(["en", "pt", "de", "ro", "tr"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`w-11 rounded-lg border px-3 py-2 text-center text-sm ${
                    lang === l
                      ? "border-white bg-white text-black shadow-lg shadow-white/10"
                      : "border-white/10 bg-neutral-900/80 text-neutral-300 hover:border-white/25 hover:bg-neutral-800"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="grid w-full grid-cols-1 gap-2 min-[520px]:w-auto min-[520px]:grid-cols-3">
              <button
                onClick={() => setView("market")}
                className={`w-full whitespace-nowrap rounded-xl border px-4 py-2 text-center text-sm font-semibold min-[520px]:w-44 ${
                  view === "market"
                    ? "border-white bg-white text-black shadow-lg shadow-white/10"
                    : "border-white/10 bg-neutral-900/80 text-white hover:border-white/25 hover:bg-neutral-800"
                }`}
              >
                {text.market}
              </button>

              <button
                onClick={() => setView("sell")}
                className={`w-full whitespace-nowrap rounded-xl border px-4 py-2 text-center text-sm font-semibold min-[520px]:w-44 ${
                  view === "sell"
                    ? "border-white bg-white text-black shadow-lg shadow-white/10"
                    : "border-white/10 bg-neutral-900/80 text-white hover:border-white/25 hover:bg-neutral-800"
                }`}
              >
                {text.sell}
              </button>

              <button
                onClick={() => setView("buy")}
                className={`w-full whitespace-nowrap rounded-xl border px-4 py-2 text-center text-sm font-semibold min-[520px]:w-44 ${
                  view === "buy"
                    ? "border-white bg-white text-black shadow-lg shadow-white/10"
                    : "border-white/10 bg-neutral-900/80 text-white hover:border-white/25 hover:bg-neutral-800"
                }`}
              >
                {buyText.nav}
              </button>
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

              <button
                onClick={() => setView("sell")}
                className="relative mt-8 rounded-xl bg-white px-6 py-3 font-semibold text-black shadow-xl shadow-white/10 hover:-translate-y-0.5 hover:bg-neutral-200"
              >
                {text.sell}
              </button>

              <button
                onClick={() => setView("buy")}
                className="relative ml-3 mt-8 rounded-xl bg-white px-6 py-3 font-semibold text-black shadow-xl shadow-white/10 hover:-translate-y-0.5 hover:bg-neutral-200"
              >
                {buyText.nav}
              </button>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-5">
            <div className="mb-6 rounded-2xl border border-white/10 bg-neutral-900/80 p-4 shadow-xl shadow-black/20 backdrop-blur">
              <div className="grid gap-3 md:grid-cols-3">
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
                  className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                >
                  {servers.map((s) => (
                    <option key={s} value={s}>
                      {s === "Todos" ? text.allServers : s}
                    </option>
                  ))}
                </select>

                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                >
                  {allTypes.map((t) => (
                    <option key={t} value={t}>
                      {typeLabels[t as keyof typeof typeLabels]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
        {item.server}
      </div>

      <div className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black shadow-lg shadow-black/20">
        {typeLabels[item.type as keyof typeof typeLabels] || item.type}
      </div>
    </div>
  ) : (
    <div className="p-5">
      <div className="rounded-2xl border border-yellow-500/25 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.22),rgba(234,179,8,0.08))] p-6 text-center shadow-inner shadow-yellow-900/20">
        <p className="text-xs font-bold tracking-widest text-yellow-200">
          WONS
        </p>
        <p className="mt-2 text-4xl font-black text-yellow-300">
          {item.title}
        </p>
        <p className="mt-1 text-sm text-yellow-100/70">
          {item.server}
        </p>
      </div>
    </div>
  )}

  <div className="flex flex-1 flex-col p-5">
    <div className="mb-3 flex flex-wrap gap-2">
      <span className="rounded-full border border-white/10 bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
        {item.server}
      </span>
      <span className="rounded-full border border-white/10 bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
        {typeLabels[item.type as keyof typeof typeLabels] || item.type}
      </span>
    </div>

    <span className="w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
      {item.status || text.available}
    </span>

    <h2 className="mt-4 text-lg font-bold leading-snug">
      {item.type === "Wons" ? "Wons Package" : item.title}
    </h2>

    {item.description && (
      <p className="mt-2 line-clamp-2 text-sm text-neutral-400">
        {item.description}
      </p>
    )}

    <div className="mt-auto pt-5">
      <p className="text-xs text-neutral-500">{text.price}</p>
      <p className="text-2xl font-black">{item.price}</p>

      <button
        onClick={() => setSelectedListing(item)}
        className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-black shadow-lg shadow-white/10 hover:-translate-y-0.5 hover:bg-neutral-200"
      >
        {text.interest}
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
                  <select
                    value={sale.server}
                    onChange={(e) =>
                      setSale({ ...sale, server: e.target.value })
                    }
                    className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                  >
                    {servers
                      .filter((s) => s !== "Todos")
                      .map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                  </select>

                  <select
                    value={sale.type}
                    onChange={(e) => {
                      setSale({ ...sale, type: e.target.value });
                      setImageFile(null);

                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                  >
                    {saleTypes.map((t) => (
                      <option key={t} value={t}>
                        {typeLabels[t as keyof typeof typeLabels]}
                      </option>
                    ))}
                  </select>
                </div>

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
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="9999"
                      placeholder={
                        sale.type === "Wons"
                          ? text.sellerPricePerWon
                          : text.sellerPrice
                      }
                      value={sale.seller_expected_price}
                      onChange={(e) =>
                        setSale({
                          ...sale,
                          seller_expected_price: e.target.value.slice(
                            0,
                            priceMaxLength
                          ),
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-10 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
                      €
                    </span>
                  </div>

                  <div
                    className={`grid gap-3 md:col-span-2 ${
                      sale.seller_contact_method
                        ? "sm:grid-cols-[9rem_1fr]"
                        : ""
                    }`}
                  >
                    <select
                      value={sale.seller_contact_method}
                      onChange={(e) =>
                        setSale({
                          ...sale,
                          seller_contact_method: e.target.value,
                        })
                      }
                      className="w-full min-w-0 rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                    >
                      <option value="">{text.contactMethod}</option>
                      {contactMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>

                    {sale.seller_contact_method && (
                      <input
                        placeholder={text.sellerContact}
                        maxLength={contactMaxLength}
                        value={sale.seller_contact}
                        onChange={(e) =>
                          setSale({ ...sale, seller_contact: e.target.value })
                        }
                        className="w-full min-w-0 rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                      />
                    )}
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

                <textarea
                  placeholder={text.description}
                  maxLength={descriptionMaxLength}
                  value={sale.description}
                  onChange={(e) =>
                    setSale({ ...sale, description: e.target.value })
                  }
                  className="min-h-28 rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                />

                <div className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3">
                  <p className="mb-3 text-sm font-semibold text-neutral-300">
                    {text.captcha}
                  </p>
                  <TurnstileBox
                    isReady={isTurnstileReady}
                    resetKey={saleCaptchaResetKey}
                    onToken={setSaleCaptchaToken}
                    onExpire={() => setSaleCaptchaToken("")}
                  />
                </div>

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
                  <select
                    value={buyOrder.server}
                    onChange={(e) =>
                      setBuyOrder({ ...buyOrder, server: e.target.value })
                    }
                    className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                  >
                    {servers
                      .filter((s) => s !== "Todos")
                      .map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                  </select>

                  <select
                    value={buyOrder.type}
                    onChange={(e) =>
                      setBuyOrder({ ...buyOrder, type: e.target.value })
                    }
                    className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
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
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="9999"
                      placeholder={buyText.maxPrice}
                      value={buyOrder.max_price}
                      onChange={(e) =>
                        setBuyOrder({
                          ...buyOrder,
                          max_price: e.target.value.slice(0, priceMaxLength),
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 pr-10 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
                      €
                    </span>
                  </div>

                  <div
                    className={`grid gap-3 md:col-span-2 ${
                      buyOrder.buyer_contact_method
                        ? "sm:grid-cols-[9rem_1fr]"
                        : ""
                    }`}
                  >
                    <select
                      value={buyOrder.buyer_contact_method}
                      onChange={(e) =>
                        setBuyOrder({
                          ...buyOrder,
                          buyer_contact_method: e.target.value,
                        })
                      }
                      className="w-full min-w-0 rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3 outline-none focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                    >
                      <option value="">{text.contactMethod}</option>
                      {contactMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>

                    {buyOrder.buyer_contact_method && (
                      <input
                        placeholder={text.buyerContact}
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
                    )}
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

                <div className="rounded-xl border border-white/10 bg-neutral-950/90 px-4 py-3">
                  <p className="mb-3 text-sm font-semibold text-neutral-300">
                    {text.captcha}
                  </p>
                  <TurnstileBox
                    isReady={isTurnstileReady}
                    resetKey={buyCaptchaResetKey}
                    onToken={setBuyCaptchaToken}
                    onExpire={() => setBuyCaptchaToken("")}
                  />
                </div>

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
              {selectedListing.server} · {selectedListing.price}
            </p>

            <div
              className={`mt-5 grid gap-3 ${
                buyerContactMethod ? "sm:grid-cols-[9rem_1fr]" : ""
              }`}
            >
              <select
                value={buyerContactMethod}
                onChange={(e) => setBuyerContactMethod(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
              >
                <option value="">{text.contactMethod}</option>
                {contactMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>

              {buyerContactMethod && (
                <input
                  placeholder={text.buyerContact}
                  maxLength={contactMaxLength}
                  value={buyerContact}
                  onChange={(e) => setBuyerContact(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
                />
              )}
            </div>

            <textarea
              placeholder={text.message}
              maxLength={600}
              value={buyerMessage}
              onChange={(e) => setBuyerMessage(e.target.value)}
              className="mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 outline-none placeholder:text-neutral-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={sendInterest}
                disabled={isSendingInterest}
                className="flex-1 rounded-xl bg-white px-4 py-3 font-bold text-black shadow-lg shadow-white/10 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingInterest ? text.loading : text.sendRequest}
              </button>

              <button
                onClick={() => setSelectedListing(null)}
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
          <p>© Asrold Market — Metin2 Marketplace</p>
          <p>Manual mediation to reduce scam risk.</p>
        </div>
      </footer>
    </main>
  );
}
