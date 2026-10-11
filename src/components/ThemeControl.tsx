"use client";

import { useSyncExternalStore } from "react";
import GlideSelect from "./GlideSelect";

type Theme = "light" | "dark";
const options = [{ value: "light", label: "Light", tag: "Green" }, { value: "dark", label: "Dark", tag: "Red" }];

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
  function change(next: string) {
    const themeValue: Theme = next === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = themeValue;
    localStorage.setItem("menhel-theme", themeValue);
    window.dispatchEvent(new Event("menhel-theme"));
  }
  return <div className="theme-dock"><GlideSelect options={options} value={theme} onChange={change} ariaLabel="Color theme" /></div>;
}
