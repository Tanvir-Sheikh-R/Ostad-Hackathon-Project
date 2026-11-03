"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyDocumentLanguage,
  currentLanguage,
  storeLanguage,
  translate,
  type Language,
  type StringKey,
} from "@/lib/i18n";

/**
 * The UI language as React state, persisted in localStorage.
 *
 * English is the default; the stored choice wins on mount. Two translators come back:
 * `t` is reactive (re-renders with the language, used for labels), `tf` is a stable
 * callback that reads the language at call time (used inside event handlers and data
 * loaders, so changing the language never invalidates their identity).
 */
export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(currentLanguageSafe());
  const languageRef = useRef(language);

  useEffect(() => {
    const stored = currentLanguage();
    setLanguageState(stored);
    languageRef.current = stored;
    applyDocumentLanguage(stored);
  }, []);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    languageRef.current = next;
    storeLanguage(next);
    applyDocumentLanguage(next);
  }, []);

  const toggle = useCallback(() => {
    setLanguage(language === "en" ? "bn" : "en");
  }, [language, setLanguage]);

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language],
  );

  const tf = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) =>
      translate(languageRef.current, key, vars),
    [],
  );

  return { language, setLanguage, toggle, t, tf };
}

/** SSR-safe read: the server always renders English, the client adopts the stored value. */
function currentLanguageSafe(): Language {
  return typeof window === "undefined" ? "en" : currentLanguage();
}
