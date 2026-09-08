"use client";

import { useEffect, useState } from "react";
import { Clock, RotateCcw, Check, Sun, Moon, Coffee, Utensils } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_MEAL_PERIODS,
  getBangladeshTimeHHMM,
  getActiveMealPeriodKey
} from "@/modules/pos/meal-periods";

const PERIOD_ICONS = {
  breakfast: Coffee,
  lunch: Sun,
  meal: Utensils,
  dinner: Moon
};

export function SetTimeModal({ isOpen, onClose, mealPeriods, onSavePeriods }) {
  const { i18n } = useTranslation();
  const [form, setForm] = useState(mealPeriods || DEFAULT_MEAL_PERIODS);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    if (mealPeriods) {
      setForm(mealPeriods);
    }
  }, [mealPeriods]);

  useEffect(() => {
    if (!isOpen) return;

    function updateLiveTime() {
      setCurrentTime(getBangladeshTimeHHMM());
    }

    updateLiveTime();
    const timer = setInterval(updateLiveTime, 10000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const isBangla = i18n.language === "bn";
  const activePeriodKey = getActiveMealPeriodKey(form, currentTime);

  function handleTimeChange(periodKey, field, value) {
    setForm((prev) => ({
      ...prev,
      [periodKey]: {
        ...prev[periodKey],
        [field]: value
      }
    }));
  }

  function handleReset() {
    setForm(DEFAULT_MEAL_PERIODS);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSavePeriods(form);
    onClose();
  }

  const periodList = [
    { key: "breakfast", ...form.breakfast },
    { key: "lunch", ...form.lunch },
    { key: "meal", ...form.meal },
    { key: "dinner", ...form.dinner }
  ];

  return (
    <ModalShell isOpen={isOpen} maxWidthClass="max-w-xl" onBackdropClick={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header */}
        <div className="border-b border-slate-100 pb-3 pr-10">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-slate-700" />
            <h3 className="text-lg font-bold text-slate-900">
              {isBangla ? "খাবারের সময় নির্ধারণ" : "Meal Period Settings"}
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isBangla
              ? "পস সেকশনে সময় অনুযায়ী ক্যাটাগরি স্বয়ংক্রিয় নির্বাচনের সময়সূচি নির্ধারণ করুন।"
              : "Configure time intervals for automatic category tab selection in POS."}
          </p>
        </div>

        {/* Clean Structured Info Bar: No spark emoji, no faux button shapes */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">
              {isBangla ? "বর্তমান সময়:" : "Current Time:"}
            </span>
            <span className="font-bold text-slate-900 tabular-nums">
              {currentTime || "--:--"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">
              {isBangla ? "সক্রিয় সময়কাল:" : "Active Period:"}
            </span>
            <span className="font-bold text-slate-900">
              {form[activePeriodKey]
                ? (isBangla ? form[activePeriodKey].labelBn : form[activePeriodKey].labelEn)
                : activePeriodKey}
            </span>
          </div>
        </div>

        {/* Period Time Fields */}
        <div className="space-y-3">
          {periodList.map((period) => {
            const isActive = period.key === activePeriodKey;
            const title = isBangla ? period.labelBn : period.labelEn;
            const Icon = PERIOD_ICONS[period.key] || Clock;

            return (
              <div
                key={period.key}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                  isActive
                    ? "border-slate-400 bg-slate-50/70"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{title}</h4>
                      {isActive && (
                        <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {isBangla ? "সক্রিয়" : "Active"}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {period.start} – {period.end}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                      {isBangla ? "শুরু" : "Start"}
                    </label>
                    <input
                      type="time"
                      value={period.start}
                      onChange={(e) => handleTimeChange(period.key, "start", e.target.value)}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-slate-400"
                      required
                    />
                  </div>

                  <span className="mt-4 text-xs font-medium text-slate-400">–</span>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                      {isBangla ? "শেষ" : "End"}
                    </label>
                    <input
                      type="time"
                      value={period.end}
                      onChange={(e) => handleTimeChange(period.key, "end", e.target.value)}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-slate-400"
                      required
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{isBangla ? "ডিফল্ট সময় রিসেট" : "Reset Defaults"}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              {isBangla ? "বাতিল" : "Cancel"}
            </button>
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-black transition"
            >
              <Check className="h-4 w-4" />
              <span>{isBangla ? "সংরক্ষণ করুন" : "Save Settings"}</span>
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
