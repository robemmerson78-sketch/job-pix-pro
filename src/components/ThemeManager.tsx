import { useEffect } from "react";

import { applyTheme, loadPreferences } from "@/lib/settings";

/** Keeps the document theme in sync with the saved appearance preference. */
export function ThemeManager() {
  useEffect(() => {
    const sync = () => applyTheme(loadPreferences().theme);
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    window.addEventListener("cq:prefs", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("cq:prefs", sync);
    };
  }, []);

  return null;
}
