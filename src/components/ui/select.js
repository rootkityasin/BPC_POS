"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select({
  value,
  defaultValue,
  onChange,
  onValueChange,
  options,
  children,
  placeholder = "Select option",
  disabled = false,
  className = "",
  wrapperClassName = "",
  dropdownClassName = "",
  itemClassName = "",
  name,
  id,
  align = "left",
  icon: Icon,
  "data-no-translate": dataNoTranslate,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue !== undefined ? defaultValue : ""
  );

  const currentValue = isControlled ? value : uncontrolledValue;

  // Parse options either from options prop or option children
  const parsedOptions = React.useMemo(() => {
    if (Array.isArray(options) && options.length > 0) {
      return options.map((opt) =>
        typeof opt === "object" && opt !== null
          ? {
              value: String(opt.value ?? ""),
              label: opt.label ?? opt.value,
              disabled: Boolean(opt.disabled),
              icon: opt.icon
            }
          : { value: String(opt), label: String(opt) }
      );
    }

    if (!children) return [];

    return React.Children.toArray(children)
      .map((child) => {
        if (React.isValidElement(child)) {
          return {
            value:
              child.props.value !== undefined
                ? String(child.props.value)
                : String(child.props.children ?? ""),
            label: child.props.children ?? child.props.value,
            disabled: Boolean(child.props.disabled)
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [options, children]);

  // Find currently selected option
  const selectedOption = parsedOptions.find(
    (opt) => String(opt.value) === String(currentValue ?? "")
  );

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSelect(optValue) {
    if (disabled) return;

    if (!isControlled) {
      setUncontrolledValue(optValue);
    }
    setIsOpen(false);

    if (onValueChange) {
      onValueChange(optValue);
    }

    if (onChange) {
      const syntheticEvent = {
        target: { value: optValue, name: name || id || "" },
        currentTarget: { value: optValue, name: name || id || "" },
        value: optValue,
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      onChange(syntheticEvent, optValue);
    }
  }

  function handleKeyDownTrigger(e) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block text-left", wrapperClassName)}
      data-no-translate={dataNoTranslate}
    >
      {name && (
        <input
          type="hidden"
          name={name}
          id={id}
          value={currentValue ?? ""}
        />
      )}

      <button
        type="button"
        id={id ? `${id}-trigger` : undefined}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDownTrigger}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "group relative flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs transition-all duration-150",
          "hover:border-slate-300 hover:bg-slate-50/50",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2771cb]/30 focus-visible:border-[#2771cb]",
          isOpen && "border-[#2771cb] ring-2 ring-[#2771cb]/15 shadow-xs bg-slate-50/30",
          disabled && "opacity-50 cursor-not-allowed hover:bg-white hover:border-slate-200/90",
          className
        )}
        {...props}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-500" /> : null}
          <span className="truncate text-slate-800">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-out",
            isOpen && "rotate-180 text-[#2771cb]"
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={cn(
            "absolute z-50 mt-1.5 min-w-full max-h-60 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-[0_14px_38px_rgba(15,23,42,0.12)] transition-all duration-150 animate-in fade-in-0 zoom-in-95",
            align === "right" ? "right-0" : "left-0",
            dropdownClassName
          )}
        >
          {parsedOptions.length === 0 ? (
            <div className="px-3 py-2 text-center text-xs text-slate-400">
              No options available
            </div>
          ) : (
            parsedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(currentValue ?? "");
              const OptIcon = opt.icon;

              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-all duration-150",
                    isSelected
                      ? "bg-[#e5f1ff] font-semibold text-[#13508b]"
                      : "font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100",
                    opt.disabled && "opacity-40 cursor-not-allowed pointer-events-none",
                    itemClassName
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    {OptIcon ? <OptIcon className="h-4 w-4 shrink-0" /> : null}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#2771cb] stroke-[2.5]" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function SelectOption({ value, children, disabled, ...props }) {
  return (
    <option value={value} disabled={disabled} {...props}>
      {children}
    </option>
  );
}
