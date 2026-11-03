"use client";

import { useCallback, useEffect, useState } from "react";
import type { Language } from "@/lib/i18n";

const STORAGE_KEY = "patsomadhan.name";
/** Previous app name kept its key; an existing value is migrated instead of ignored. */
const LEGACY_KEY = "boibondhu.name";

/** The name shown until the student sets their own. */
export function defaultNameFor(language: Language): string {
  return language === "bn" ? "শিক্ষার্থী" : "Student";
}

export function useUserName(language: Language) {
  const [customName, setCustomName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
      const cleaned = (stored ?? "").trim();
      if (!cleaned) {
        return;
      }
      setCustomName(cleaned);
      // Carry an old install forward under the current key.
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        window.localStorage.setItem(STORAGE_KEY, cleaned);
      }
    } catch {
      // localStorage can be unavailable (private mode); the default name is fine.
    }
  }, []);

  const saveUserName = useCallback((next: string) => {
    const cleaned = next.trim();
    if (!cleaned) {
      return false;
    }
    setCustomName(cleaned);
    try {
      window.localStorage.setItem(STORAGE_KEY, cleaned);
    } catch {
      // Ignore persistence failures; the in-memory name still updates.
    }
    return true;
  }, []);

  return {
    userName: customName ?? defaultNameFor(language),
    isCustomName: customName !== null,
    saveUserName,
  };
}
