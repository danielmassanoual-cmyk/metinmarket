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

function DiscordButton({
  label,
  href = "https://discord.com/channels/@me",
  disabled = false,
}: {
  label: string;
  href?: string;
  disabled?: boolean;
}) {
  const className = `relative inline-flex h-10 items-center gap-2 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/12 px-3 text-sm font-bold text-indigo-100 ${
    disabled
      ? "cursor-default"
      : "hover:border-[#5865F2]/70 hover:bg-[#5865F2]/25"
  }`;
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

export function StaticPageHeader({
  lang,
  onLanguageChange,
}: {
  lang: Lang;
  onLanguageChange: (lang: Lang) => void;
}) {
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/[0.82] backdrop-blur-xl">
      <div className="mx-auto grid max-w-6xl gap-4 px-5 py-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <Link href="/" className="w-fit text-left">
          <h1 className="text-2xl font-black tracking-tight">Asrold Market</h1>
          <p className="text-sm text-emerald-200/70">Metin2 Marketplace</p>
        </Link>

        <div className="flex justify-start lg:justify-center">
          <Link
            href="/"
            className="rounded-xl border border-emerald-300/40 bg-emerald-300 px-5 py-2.5 text-sm font-black text-black shadow-xl shadow-emerald-950/20 hover:-translate-y-0.5 hover:bg-emerald-200"
          >
            Return Market
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
            <DiscordButton label="Asrold#3891" disabled />
            <DiscordButton
              label="Join Discord server"
              href="https://discord.gg/AGT9YFnvK"
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
                {(["en", "es", "pt", "de", "ro", "tr"] as Lang[]).map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        onLanguageChange(option);
                        setIsLanguageMenuOpen(false);
                      }}
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
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
