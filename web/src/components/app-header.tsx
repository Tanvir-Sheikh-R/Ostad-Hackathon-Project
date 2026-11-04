"use client";

import { PanelLeft } from "lucide-react";
import { BannerImage } from "@/components/banner";
import { LanguageToggle } from "@/components/language-toggle";
import { TabNav, type TabKey } from "@/components/tab-nav";
import { UserMenu } from "@/components/user-menu";
import type { Language, TFunction } from "@/lib/i18n";

/**
 * A single transparent header row (no card behind it):
 *
 *   left   [page name + description + buildathon sticker] [banner image]
 *   middle [Chat | Quiz | Progress]  — centred, active tab marked by an underline
 *   right  [language toggle] [user icon]
 *
 * Below `lg` the tabs drop to their own row so nothing is squeezed.
 */
export function AppHeader({
  tab,
  onTabChange,
  language,
  onLanguageChange,
  userName,
  onSaveName,
  onToggleNav,
  bannerSubtitle,
  t,
}: {
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  userName: string;
  onSaveName: (name: string) => void;
  onToggleNav: () => void;
  bannerSubtitle: string;
  t: TFunction;
}) {
  return (
    <header className="px-1 pb-1 sm:px-2">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
        {/* left: page name + description, then the banner image */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleNav}
            aria-label={t("sidebar.chats")}
            className="shrink-0 rounded-xl p-1.5 text-muted transition hover:bg-white/70 hover:text-ink lg:hidden"
          >
            <PanelLeft className="size-4" />
          </button>
          

          <div className="min-w-0">
            <h1 className="truncate text-[16px] leading-tight font-bold tracking-tight text-ink sm:text-lg">
              {t("app.title")}
            </h1>
            <p className="truncate pt-0.5 text-[12px] leading-snug text-muted">
              {t("app.description")}
            </p>
            {/* <span className="mt-1 inline-block max-w-full rounded-full bg-gradient-to-r from-amber-100 via-orange-100 to-rose-100 px-2 py-0.5 text-[9.5px] leading-tight font-semibold text-amber-900 ring-1 ring-amber-300/60">
              🏆 {t("app.sticker")}
            </span> */}
          </div>

          <BannerImage
            alt={t("app.bannerAlt")}
            title={bannerSubtitle}
            className="hidden h-13 w-26 shrink-0 sm:block lg:w-46 rounded-lg"
          />
        </div>

        {/* middle: tabs, centred between the title group and the controls */}
        <div className="hidden justify-center lg:flex">
          <TabNav active={tab} onChange={onTabChange} t={t} />
        </div>

        {/* right: language + user */}
        <div className="flex shrink-0 items-center justify-end gap-1.5">
          <LanguageToggle language={language} onChange={onLanguageChange} t={t} />
          <UserMenu userName={userName} onSaveName={onSaveName} t={t} />
        </div>
      </div>

      <div className="mt-1.5 lg:hidden">
        <TabNav active={tab} onChange={onTabChange} t={t} className="justify-center" />
      </div>
    </header>
  );
}
