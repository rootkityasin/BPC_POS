import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-panel", className)} {...props} />;
}
