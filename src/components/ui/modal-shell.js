"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
      <div className={`relative w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-[32px] bg-white p-8 shadow-2xl`}>
        {children}
      </div>
    </div>,
    document.body
  );
}
