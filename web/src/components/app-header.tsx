"use client";

import { PanelLeft } from "lucide-react";
import { BannerImage } from "@/components/banner";
import { LanguageToggle } from "@/components/language-toggle";
import { TabNav, type TabKey } from "@/components/tab-nav";
import { UserMenu } from "@/components/user-menu";
import type { Language, TFunction } from "@/lib/i18n";

/**
 * The one-row app header:
 *   [page name + description + buildathon sticker] | [banner] | [tabs] | [lang] [user]
 *
 * Below `lg` the tabs move to a second row so nothing is squeezed, and the banner is
 * hidden to keep the title readable on a phone.
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
    <header className="rounded-3xl bg-surface px-3 py-2.5 card-shadow sm:px-4">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleNav}
          aria-label={t("sidebar.chats")}
          className="shrink-0 rounded-xl p-1.5 text-muted transition hover:bg-neutral-100 hover:text-ink lg:hidden"
        >
          <PanelLeft className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-bold tracking-tight text-ink sm:text-base">
            {t("app.title")}
          </h1>
          <p className="hidden truncate text-[12px] leading-snug text-muted sm:block">
            {t("app.description")}
          </p>
          {/* Buildathon sticker: always visible, never truncated away. */}
          <span className="mt-1 inline-block max-w-full rounded-full bg-gradient-to-r from-amber-100 via-orange-100 to-rose-100 px-2 py-0.5 text-[9.5px] leading-tight font-semibold text-amber-900 ring-1 ring-amber-300/60">
            🏆 {t("app.sticker")}
          </span>
        </div>

        <BannerImage
          alt={t("app.bannerAlt")}
          title={bannerSubtitle}
          className="hidden h-14 w-32 shrink-0 sm:block lg:w-40"
        />

        <div className="hidden shrink-0 lg:block">
          <TabNav active={tab} onChange={onTabChange} t={t} className="w-[300px]" />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <LanguageToggle language={language} onChange={onLanguageChange} t={t} />
          <UserMenu userName={userName} onSaveName={onSaveName} t={t} />
        </div>
      </div>

      <div className="mt-2 lg:hidden">
        <TabNav active={tab} onChange={onTabChange} t={t} className="w-full" />
      </div>
    </header>
  );
}
