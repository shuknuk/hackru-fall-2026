"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

export default function ThemeControl() {
  const theme = useSyncExternalStore(
    (notify) => {
      window.addEventListener("storage", notify);
      window.addEventListener("menhel-theme", notify);
      return () => { window.removeEventListener("storage", notify); window.removeEventListener("menhel-theme", notify); };
    },
    () => localStorage.getItem("menhel-theme") === "dark" ? "dark" : "light",
    () => "light",
  ) as Theme;
  function toggle() {
    const themeValue: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = themeValue;
    localStorage.setItem("menhel-theme", themeValue);
    window.dispatchEvent(new Event("menhel-theme"));
  }
  const dark = theme === "dark";
  return <div className="theme-dock">
    <button type="button" className="theme-toggle" aria-label={`Switch to ${dark ? "light" : "dark"} theme`} aria-pressed={dark} onClick={toggle}>
      <span aria-hidden="true">{dark ? <Moon size={17} /> : <Sun size={17} />}</span>
      <span>{dark ? "Dark" : "Light"}</span>
    </button>
  </div>;
}
