"use client";

import Link from "next/link";
import { useState } from "react";
import { StaticPageHeader } from "../static-page-header";

type Lang = "en" | "es" | "pt" | "de" | "ro" | "tr";

const content = {
  en: {
    title: "Rules",
    intro: "Simple safety rules for buying and selling through Asrold Market.",
    back: "Back to market",
    items: [
      "Do not share sensitive payment details or private information outside the mediated flow.",
      "Only trust the official Discord shown on this website.",
      "Do not send payment before the admin confirms the mediated flow.",
      "Listings, reports and requests may be removed if they look suspicious.",
      "Spam, fake contacts or repeated bad submissions may be blocked.",
      "Confirmed sales are recorded only after admin review.",
    ],
  },
  es: {
    title: "Reglas",
    intro: "Reglas simples de seguridad para comprar y vender en Asrold Market.",
    back: "Volver al mercado",
    items: [
      "No compartas datos sensibles de pago ni información privada fuera del flujo mediado.",
      "Confía solo en el Discord oficial mostrado en esta web.",
      "No envíes pagos antes de que el admin confirme el flujo mediado.",
      "Anuncios, reportes y pedidos pueden eliminarse si parecen sospechosos.",
      "Spam, contactos falsos o envíos repetidos pueden ser bloqueados.",
      "Las ventas confirmadas solo se registran después de revisión del admin.",
    ],
  },
  pt: {
    title: "Regras",
    intro: "Regras simples de segurança para comprar e vender no Asrold Market.",
    back: "Voltar ao mercado",
    items: [
      "Não partilhes dados sensíveis de pagamento ou informação privada fora do fluxo mediado.",
      "Confia apenas no Discord oficial mostrado neste site.",
      "Não envies pagamentos antes de o admin confirmar o fluxo mediado.",
      "Anúncios, reports e pedidos podem ser removidos se parecerem suspeitos.",
      "Spam, contactos falsos ou submissões repetidas podem ser bloqueados.",
      "Vendas confirmadas só são registadas após revisão do admin.",
    ],
  },
  de: {
    title: "Regeln",
    intro: "Einfache Sicherheitsregeln für Käufe und Verkäufe über Asrold Market.",
    back: "Zurück zum Markt",
    items: [
      "Teile keine sensiblen Zahlungsdaten oder privaten Informationen außerhalb des vermittelten Ablaufs.",
      "Vertraue nur dem offiziellen Discord, der auf dieser Website angezeigt wird.",
      "Sende keine Zahlung, bevor der Admin den vermittelten Ablauf bestätigt.",
      "Anzeigen, Meldungen und Anfragen können entfernt werden, wenn sie verdächtig wirken.",
      "Spam, falsche Kontakte oder wiederholte schlechte Einsendungen können blockiert werden.",
      "Bestätigte Verkäufe werden erst nach Admin-Prüfung erfasst.",
    ],
  },
  ro: {
    title: "Reguli",
    intro: "Reguli simple de siguranță pentru cumpărare și vânzare prin Asrold Market.",
    back: "Înapoi la piață",
    items: [
      "Nu împărtăși date sensibile de plată sau informații private în afara fluxului mediat.",
      "Ai încredere doar în Discordul oficial afișat pe acest site.",
      "Nu trimite plata înainte ca adminul să confirme fluxul mediat.",
      "Anunțurile, rapoartele și cererile pot fi eliminate dacă par suspecte.",
      "Spam-ul, contactele false sau trimiterile repetate pot fi blocate.",
      "Vânzările confirmate sunt înregistrate doar după verificarea adminului.",
    ],
  },
  tr: {
    title: "Kurallar",
    intro: "Asrold Market üzerinden alış ve satış için basit güvenlik kuralları.",
    back: "Pazara dön",
    items: [
      "Aracılı akış dışında hassas ödeme bilgisi veya özel bilgi paylaşma.",
      "Sadece bu sitede gösterilen resmi Discord'a güven.",
      "Admin aracılı akışı onaylamadan ödeme gönderme.",
      "Şüpheli görünen ilanlar, bildirimler ve talepler kaldırılabilir.",
      "Spam, sahte iletişim veya tekrarlı kötü gönderiler engellenebilir.",
      "Onaylanan satışlar yalnızca admin incelemesinden sonra kaydedilir.",
    ],
  },
} satisfies Record<
  Lang,
  { title: string; intro: string; back: string; items: string[] }
>;

export default function Rules() {
  const [lang, setLang] = useState<Lang>("en");
  const text = content[lang];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_32rem),linear-gradient(180deg,#070707,#050505)] text-white">
      <StaticPageHeader lang={lang} onLanguageChange={setLang} />

      <section className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(24,24,27,0.96),rgba(3,7,18,0.92)),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.18),transparent_18rem)] p-8 shadow-2xl shadow-black/30 md:p-10">
          <p className="mb-4 w-fit rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-100">
            Asrold Market
          </p>
          <h2 className="text-4xl font-black tracking-tight md:text-6xl">
            {text.title}
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-neutral-300">
            {text.intro}
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          {text.items.map((item, index) => (
            <div
              key={item}
              className="grid grid-cols-[2.25rem_1fr] gap-3 rounded-2xl border border-white/10 bg-neutral-900/80 p-5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-300 text-sm font-black text-black">
                {index + 1}
              </span>
              <p className="pt-1 leading-7 text-neutral-200">{item}</p>
            </div>
          ))}
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-black shadow-lg shadow-white/10 hover:bg-neutral-200"
        >
          {text.back}
        </Link>
      </section>
    </main>
  );
}
