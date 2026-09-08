"use client";

import { Search, X } from "lucide-react";

export function SearchBar({
  value = "",
  onChange,
  onKeyDown,
  onSubmit,
  placeholder = "Search...",
  className = "",
  inputClassName = "",
  autoFocus = false,
  disabled = false,
  showClear = true
}) {
  function handleChange(e) {
    if (onChange) {
      onChange(e.target.value, e);
    }
  }

  function handleClear() {
    if (onChange) {
      onChange("", null);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && onSubmit) {
      onSubmit(value);
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  }

  return (
    <div
      className={`group flex h-14 items-center rounded-2xl border border-slate-200/80 bg-white px-5 shadow-sm transition-all duration-150 hover:border-slate-300 focus-within:border-[#2771cb] focus-within:ring-2 focus-within:ring-[#2771cb]/15 ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}
    >
      <Search className="mr-3 h-5 w-5 shrink-0 text-slate-400 transition-colors group-focus-within:text-[#2771cb]" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className={`w-full border-0 bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 ${inputClassName}`}
      />
      {showClear && Boolean(value) && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
