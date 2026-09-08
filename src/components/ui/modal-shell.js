"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function ModalShell({ isOpen, children, maxWidthClass = "max-w-md", onBackdropClick }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onBackdropClick}
      />
      <div className={`popup-scrollbar relative w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-[32px] bg-white p-8 shadow-2xl`}>
        <button
          type="button"
          onClick={onBackdropClick}
          aria-label="Close popup"
          className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
