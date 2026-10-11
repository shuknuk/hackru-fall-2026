"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "./GlideSelect.css";

export type GlideOption = { value: string; label: ReactNode; tag?: string };

export default function GlideSelect({ options, value, onChange, ariaLabel = "Select", className = "" }: {
  options: GlideOption[];
  value: string;
  onChange: (value: string, option: GlideOption) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(Math.max(0, options.findIndex((item) => item.value === value)));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selected = Math.max(0, options.findIndex((item) => item.value === value));
  const css = { "--gs-active": active } as CSSProperties;

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);

  function choose(index: number) {
    const option = options[index];
    setActive(index);
    if (option.value !== value) onChange(option.value, option);
    setOpen(false);
    trigger.current?.focus();
  }

  function keyboard(event: React.KeyboardEvent) {
    if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    if (!open) { setOpen(true); setActive(selected); return; }
    if (event.key === "Enter" || event.key === " ") { choose(active); return; }
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (active + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    setActive(next);
  }

  return <div ref={root} className={`glide-select ${className}`} style={css}>
    <button ref={trigger} type="button" className="glide-select__trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} onClick={() => { setOpen((current) => !current); setActive(selected); }} onKeyDown={keyboard}>
      <span>{options[selected]?.label}</span><ChevronDown size={18} aria-hidden="true" />
    </button>
    {open ? <div id={id} className="glide-select__menu" role="listbox" aria-label={ariaLabel} onKeyDown={keyboard}>
      <span className="glide-select__pill" aria-hidden="true" />
      {options.map((option, index) => <div key={option.value} role="option" aria-selected={index === selected} className="glide-select__option" onPointerEnter={() => setActive(index)} onClick={() => choose(index)}>
        <span>{option.label}</span>{option.tag ? <small>{option.tag}</small> : null}<Check size={17} aria-hidden="true" className={index === selected ? "is-selected" : ""} />
      </div>)}
    </div> : null}
  </div>;
}
