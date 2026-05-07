"use client";

import Link from "next/link";
import { useState } from "react";

type Lang = "en" | "es" | "pt" | "de" | "ro" | "tr";

const languageOptions: Record<Lang, { flagClass: string; label: string }> = {
  en: { flagClass: "flag-gb", label: "English" },
  es: { flagClass: "flag-es", label: "Español" },
  pt: { flagClass: "flag-pt", label: "Português" },
  de: { flagClass: "flag-de", label: "Deutsch" },
  ro: { flagClass: "flag-ro", label: "Română" },
  tr: { flagClass: "flag-tr", label: "Türkçe" },
};

const content = {
  en: {
    title: "How it works",
    eyebrow: "Manual mediation for safer trades",
    intro:
      "Asrold Market is a manually mediated marketplace for Metin2 accounts, items and wons. Buyers and sellers can show interest freely, but the admin confirms the real match before any sale is counted.",
    back: "Back to market",
    steps: [
      "A seller submits an item, account or wons.",
      "The admin reviews the submission and publishes it.",
      "A buyer clicks Buy or I want to buy and admin will message you.",
      "The admin confirms sold or cancelled.",
      "Only confirmed sales count toward stock.",
    ],
    cards: [
      ["Market", "Browse approved listings. Wons with the same server and public price are grouped so the available amount is easy to read."],
      ["Sell", "Submit what you want to sell. Your contact and desired price stay private until the admin reviews the post."],
      ["Buy", "Create a public buy request for wons when you cannot find the amount you need."],
      ["I want to buy", "Send interest for a specific listing. For grouped wons, the admin sees every seller in that group."],
      ["Admin mediation", "The admin checks contacts, confirms matches, updates quantities."],
      ["Support", "Use Discord, the Discord server, or live chat if you need help before buying or selling."],
    ],
  },
  es: {
    title: "Cómo funciona",
    eyebrow: "Mediación manual para intercambios más seguros",
    intro:
      "Asrold Market es un mercado mediado manualmente para cuentas, objetos y wons de Metin2. Compradores y vendedores pueden mostrar interés libremente, pero el administrador confirma el match real antes de que cualquier venta cuente.",
    back: "Volver al mercado",
    steps: [
      "El vendedor envía un objeto, cuenta o wons.",
      "El administrador revisa la solicitud y publica el anuncio.",
      "El comprador hace clic en Comprar o Quiero comprar y el admin contacta contigo.",
      "El administrador confirma vendido o cancelado.",
      "Solo las ventas confirmadas cuentan para el stock.",
    ],
    cards: [
      ["Mercado", "Explora anuncios aprobados. Los wons con el mismo servidor y precio público se agrupan para que la cantidad disponible sea fácil de leer."],
      ["Vender", "Envía lo que quieres vender. Tu contacto y precio deseado permanecen privados hasta que el admin revise el anuncio."],
      ["Comprar", "Crea una solicitud pública de compra de wons cuando no encuentras la cantidad que necesitas."],
      ["Quiero comprar", "Envía interés por un anuncio específico. Para wons agrupados, el admin ve todos los vendedores de ese grupo."],
      ["Mediación del admin", "El admin verifica contactos, confirma matches y actualiza cantidades."],
      ["Soporte", "Usa Discord, el servidor de Discord o el chat en vivo si necesitas ayuda antes de comprar o vender."],
    ],
  },
  pt: {
    title: "Como funciona",
    eyebrow: "Mediação manual para trocas mais seguras",
    intro:
      "O Asrold Market é um mercado mediado manualmente para contas, itens e wons de Metin2. Compradores e vendedores podem mostrar interesse livremente, mas o administrador confirma o match real antes de qualquer venda contar.",
    back: "Voltar ao mercado",
    steps: [
      "O vendedor submete um item, conta ou wons.",
      "O administrador revê a submissão e publica o anúncio.",
      "O comprador clica em Comprar ou Quero comprar.",
      "O administrador confirma como vendido ou cancelado.",
      "Só vendas confirmadas contam para stock e lucro.",
    ],
    cards: [
      ["Mercado", "Vê anúncios aprovados. Wons com o mesmo servidor e preço público ficam agrupados para a quantidade disponível ser fácil de ler."],
      ["Vender", "Submete aquilo que queres vender. O teu contacto e preço pretendido ficam privados até o administrador rever o anúncio."],
      ["Comprar", "Cria um pedido público de compra de wons quando não encontras a quantidade que precisas."],
      ["Quero comprar", "Envia interesse num anúncio específico. Em wons agrupados, o administrador vê todos os vendedores desse grupo."],
      ["Mediação do administrador", "O administrador verifica contactos, confirma matches, atualiza quantidades."],
      ["Suporte", "Usa Discord, o servidor Discord ou o chat ao vivo se precisares de ajuda antes de comprar ou vender."],
    ],
  },
  de: {
    title: "So funktioniert es",
    eyebrow: "Manuelle Vermittlung für sicherere Trades",
    intro:
      "Asrold Market ist ein manuell vermittelter Marktplatz für Metin2 Accounts, Items und Wons. Käufer und Verkäufer zeigen Interesse, der Admin bestätigt aber den echten Match.",
    back: "Zurück zum Markt",
    steps: [
      "Ein Verkäufer sendet Item, Account oder Wons ein.",
      "Der Admin prüft die Einsendung und veröffentlicht sie.",
      "Ein Käufer klickt Kaufen oder Ich möchte kaufen.",
      "Der Admin bestätigt verkauft oder storniert.",
      "Nur bestätigte Verkäufe zählen für Bestand und Gewinn.",
    ],
    cards: [
      ["Markt", "Durchsuche genehmigte Anzeigen. Wons mit gleichem Server und Preis werden gruppiert."],
      ["Verkaufen", "Sende ein, was du verkaufen möchtest. Kontakt und Wunschpreis bleiben privat, bis der Admin prüft."],
      ["Kaufen", "Erstelle eine öffentliche Kaufanfrage für Wons, wenn du die passende Menge nicht findest."],
      ["Ich möchte kaufen", "Sende Interesse an einer bestimmten Anzeige. Bei gruppierten Wons sieht der Admin alle Verkäufer."],
      ["Admin-Vermittlung", "Der Admin prüft Kontakte, bestätigt Matches, aktualisiert Mengen."],
      ["Support", "Nutze Discord, den Discord-Server oder Live-Chat, wenn du Hilfe brauchst."],
    ],
  },
  ro: {
    title: "Cum funcționează",
    eyebrow: "Mediere manuală pentru tranzacții mai sigure",
    intro:
      "Asrold Market este o piață mediată manual pentru conturi, iteme și wons Metin2. Cumpărătorii și vânzătorii pot arăta interes, dar administratorul confirmă potrivirea reală.",
    back: "Înapoi la piață",
    steps: [
      "Vânzătorul trimite un item, cont sau wons.",
      "Administratorul verifică trimiterea și publică anunțul.",
      "Cumpărătorul apasă Cumpără sau Vreau să cumpăr.",
      "Administratorul confirmă vândut sau anulat.",
      "Doar vânzările confirmate contează la stoc și profit.",
    ],
    cards: [
      ["Piață", "Vezi anunțuri aprobate. Wons cu același server și preț sunt grupate pentru claritate."],
      ["Vinde", "Trimite ce vrei să vinzi. Contactul și prețul dorit rămân private până la verificarea administratorului."],
      ["Cumpără", "Creează o cerere publică pentru wons când nu găsești cantitatea dorită."],
      ["Vreau să cumpăr", "Trimite interes pentru un anunț anume. Pentru wons grupate, administratorul vede toți vânzătorii."],
      ["Mediere admin", "Administratorul verifică contactele, confirmă potrivirile, actualizează cantitățile."],
      ["Suport", "Folosește Discord, serverul Discord sau live chat dacă ai nevoie de ajutor."],
    ],
  },
  tr: {
    title: "Nasıl çalışır",
    eyebrow: "Daha güvenli işlemler için manuel aracılık",
    intro:
      "Asrold Market, Metin2 hesapları, itemleri ve wons için manuel aracılıklı bir pazardır. Alıcı ve satıcı ilgi gösterebilir, gerçek eşleşmeyi admin onaylar.",
    back: "Pazara dön",
    steps: [
      "Satıcı item, hesap veya wons gönderir.",
      "Admin gönderiyi kontrol eder ve yayınlar.",
      "Alıcı Al veya Satın almak istiyorum butonuna basar.",
      "Admin satıldı veya iptal olarak onaylar.",
      "Sadece onaylanan satışlar stok ve kâra yansır.",
    ],
    cards: [
      ["Pazar", "Onaylanmış ilanları gör. Aynı sunucu ve fiyattaki wons ilanları gruplanır."],
      ["Sat", "Satmak istediğini gönder. İletişim ve istenen fiyat admin inceleyene kadar gizli kalır."],
      ["Al", "İstediğin wons miktarını bulamazsan herkese açık bir alış talebi oluştur."],
      ["Satın almak istiyorum", "Belirli bir ilan için ilgi gönder. Gruplanmış wons için admin tüm satıcıları görür."],
      ["Admin aracılığı", "Admin kontakları kontrol eder, eşleşmeleri onaylar, miktarları günceller."],
      ["Destek", "Yardıma ihtiyacın olursa Discord, Discord sunucusu veya canlı sohbeti kullan."],
    ],
  },
} satisfies Record<
  Lang,
  {
    title: string;
    eyebrow: string;
    intro: string;
    back: string;
    steps: string[];
    cards: [string, string][];
  }
>;

export default function HowItWorks() {
  const [lang, setLang] = useState<Lang>("en");
  const text = content[lang];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_32rem),linear-gradient(180deg,#070707,#050505)] text-white">
      <header className="border-b border-white/10 bg-neutral-950/[0.84] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 md:flex-row md:items-start md:justify-between">
          <Link href="/" className="w-fit">
            <h1 className="text-2xl font-black tracking-tight">Asrold Market</h1>
            <p className="text-sm text-emerald-200/70">Metin2 Marketplace</p>
          </Link>

          <div className="mt-2 flex items-center gap-2 md:mt-4">
            {(["en", "es", "pt", "de", "ro", "tr"] as Lang[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLang(option)}
                aria-label={languageOptions[option].label}
                title={languageOptions[option].label}
                className={`flex h-10 w-12 items-center justify-center rounded-lg border ${
                  lang === option
                    ? "border-white bg-white text-black shadow-lg shadow-white/10"
                    : "border-white/10 bg-neutral-900/80 text-neutral-300 hover:border-white/25 hover:bg-neutral-800"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`language-flag ${languageOptions[option].flagClass}`}
                />
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(24,24,27,0.96),rgba(3,7,18,0.92)),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.18),transparent_18rem)] p-8 shadow-2xl shadow-black/30 md:p-10">
            <p className="mb-4 w-fit rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-100">
              {text.eyebrow}
            </p>
            <h2 className="text-4xl font-black tracking-tight md:text-6xl">
              {text.title}
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-neutral-300">
              {text.intro}
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-black shadow-lg shadow-white/10 hover:bg-neutral-200"
            >
              {text.back}
            </Link>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-neutral-900/85 p-6 shadow-2xl shadow-black/25">
            <ol className="grid gap-4">
              {text.steps.map((step, index) => (
                <li key={step} className="grid grid-cols-[2.25rem_1fr] gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-300 text-sm font-black text-black">
                    {index + 1}
                  </span>
                  <p className="pt-1 leading-6 text-neutral-200">{step}</p>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {text.cards.map(([title, body]) => (
            <article
              key={title}
              className="rounded-2xl border border-white/10 bg-neutral-900/80 p-5 shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:border-emerald-200/25"
            >
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-3 leading-7 text-neutral-300">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
