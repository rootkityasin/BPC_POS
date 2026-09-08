"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  className = "",
  wrapperClassName = "",
  name,
  id,
  value,
  ...props
}) {
  return (
    <span
      className={cn(
        "relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center select-none",
        disabled && "opacity-50 cursor-not-allowed",
        wrapperClassName
      )}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none flex h-full w-full items-center justify-center rounded-[5px] border border-slate-300 bg-white transition-all duration-150 shadow-2xs",
          "peer-hover:border-slate-400",
          "peer-checked:border-[#2771cb] peer-checked:bg-[#2771cb] peer-checked:shadow-xs",
          "peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-[#2771cb]/30 peer-focus-visible:ring-offset-1 peer-focus-visible:border-[#2771cb]",
          "peer-disabled:bg-slate-100 peer-disabled:border-slate-200",
          className
        )}
      >
        <Check
          className="h-3 w-3 stroke-[3] text-white opacity-0 scale-75 transition-all duration-150 ease-out"
        />
      </span>
    </span>
  );
}
