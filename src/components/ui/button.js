import { cn } from "@/lib/utils";

export function Button({ className, variant = "default", ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
        variant === "default" && "bg-slate-900 text-white hover:bg-crab-red",
        variant === "ghost" && "bg-transparent text-slate-600 hover:bg-slate-100",
        variant === "outline" && "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        className
      )}
      {...props}
    />
  );
}
