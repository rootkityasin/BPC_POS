"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGE_STORAGE_KEY } from "@/modules/i18n/i18n";

function UkFlagIcon() {
  return (
    <svg viewBox="0 0 60 60" className="h-full w-full rounded-full" aria-hidden="true">
      <clipPath id="uk-flag-clip">
        <circle cx="30" cy="30" r="30" />
      </clipPath>
      <g clipPath="url(#uk-flag-clip)">
        {/* Navy Blue Field */}
        <rect width="60" height="60" fill="#012169" />
        {/* White Diagonal Saltire */}
        <path d="M0,0 L60,60 M60,0 L0,60" stroke="#FFFFFF" strokeWidth="9" />
        {/* Red Diagonal Cross */}
        <path d="M0,0 L30,30" stroke="#C8102E" strokeWidth="3" />
        <path d="M60,60 L30,30" stroke="#C8102E" strokeWidth="3" />
        <path d="M60,0 L30,30" stroke="#C8102E" strokeWidth="3" />
        <path d="M0,60 L30,30" stroke="#C8102E" strokeWidth="3" />
        {/* White Central Cross */}
        <path d="M30,0 v60 M0,30 h60" stroke="#FFFFFF" strokeWidth="15" />
        {/* Red Central Cross */}
        <path d="M30,0 v60 M0,30 h60" stroke="#C8102E" strokeWidth="9" />
      </g>
      <circle cx="30" cy="30" r="29.5" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
    </svg>
  );
}

function BangladeshFlagIcon() {
  return (
    <svg viewBox="0 0 60 60" className="h-full w-full rounded-full" aria-hidden="true">
      <clipPath id="bd-flag-clip">
        <circle cx="30" cy="30" r="30" />
      </clipPath>
      <g clipPath="url(#bd-flag-clip)">
        {/* Bottle Green Field */}
        <rect width="60" height="60" fill="#006A4E" />
        {/* Red Sun Disc (slightly offset toward hoist for official aesthetic balance) */}
        <circle cx="28" cy="30" r="14" fill="#F42A41" />
      </g>
      <circle cx="30" cy="30" r="29.5" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
    </svg>
  );
}

export function AdminLanguageSwitch() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "bn";
  const isBangla = currentLang === "bn";

  useEffect(() => {
    document.documentElement.lang = currentLang;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLang);
    document.cookie = `${LANGUAGE_STORAGE_KEY}=${currentLang}; path=/; max-age=31536000; SameSite=Lax`;
  }, [currentLang]);

  function setLanguage(lang) {
    if (currentLang !== lang) {
      i18n.changeLanguage(lang);
      window.dispatchEvent(new Event("bpc:translations-updated"));
    }
  }

  function toggleLanguage() {
    setLanguage(isBangla ? "en" : "bn");
  }

  return (
    <div
      data-no-translate="true"
      className="inline-flex items-center gap-2 select-none"
      title={isBangla ? "Switch to English" : "বাংলা ভাষায় পরিবর্তন করুন"}
    >
      {/* Left Label: BN (Default) */}
      <button
        type="button"
        onClick={() => setLanguage("bn")}
        className={`text-xs font-black tracking-wider transition-colors duration-200 ${
          isBangla ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        BN
      </button>

      {/* Neumorphic Inset Pill Track */}
      <button
        type="button"
        role="switch"
        aria-checked={!isBangla}
        aria-label="Language switch"
        onClick={toggleLanguage}
        className="relative flex h-8 w-[62px] cursor-pointer items-center rounded-full border border-slate-300/70 bg-[#e4e7ec] p-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15),inset_0_-1px_2px_rgba(255,255,255,0.7)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2771cb]/30"
      >
        {/* Sliding Flag Knob: Left (translate-x-0) = BN (Default), Right (translate-x-[30px]) = EN */}
        <div
          className={`relative flex h-[26px] w-[26px] transform items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25),0_1px_2px_rgba(0,0,0,0.15)] ring-1 ring-black/5 transition-transform duration-300 ease-out ${
            isBangla ? "translate-x-0" : "translate-x-[30px]"
          }`}
        >
          {isBangla ? <BangladeshFlagIcon /> : <UkFlagIcon />}
        </div>
      </button>

      {/* Right Label: EN */}
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`text-xs font-black tracking-wider transition-colors duration-200 ${
          !isBangla ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        EN
      </button>
    </div>
  );
}
