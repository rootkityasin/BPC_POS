export const BANGLADESH_TIMEZONE = "Asia/Dhaka";
export const MEAL_PERIOD_STORAGE_KEY = "bpc_pos_meal_periods";

export const DEFAULT_MEAL_PERIODS = {
  breakfast: {
    key: "breakfast",
    labelEn: "Breakfast",
    labelBn: "সকালের নাস্তা",
    icon: "☕",
    start: "05:00",
    end: "11:00"
  },
  lunch: {
    key: "lunch",
    labelEn: "Lunch",
    labelBn: "দুপুরের খাবার",
    icon: "🍲",
    start: "11:00",
    end: "15:00"
  },
  meal: {
    key: "meal",
    labelEn: "Meal",
    labelBn: "মিল / বিকালের খাবার",
    icon: "📦",
    start: "15:00",
    end: "18:00"
  },
  dinner: {
    key: "dinner",
    labelEn: "Dinner",
    labelBn: "রাতের খাবার",
    icon: "🍽️",
    start: "18:00",
    end: "05:00"
  }
};

/**
 * Checks if a given HH:mm time falls within [start, end).
 * Supports ranges that cross midnight (e.g. 18:00 to 05:00).
 */
export function isTimeInRange(current, start, end) {
  if (!current || !start || !end) return false;
  if (start <= end) {
    return current >= start && current < end;
  }
  // Crosses midnight (e.g. 18:00 to 05:00)
  return current >= start || current < end;
}

/**
 * Gets current HH:mm formatted string in Bangladesh Timezone.
 */
export function getBangladeshTimeHHMM(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: BANGLADESH_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);
    const hh = parts.find((p) => p.type === "hour")?.value || "00";
    const mm = parts.find((p) => p.type === "minute")?.value || "00";
    return `${hh}:${mm}`;
  } catch {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
}

/**
 * Determines which meal period is currently active based on Bangladesh time.
 */
export function getActiveMealPeriodKey(mealPeriods = DEFAULT_MEAL_PERIODS, currentHHMM = null) {
  const current = currentHHMM || getBangladeshTimeHHMM();
  const periods = Object.values(mealPeriods);

  for (const period of periods) {
    if (isTimeInRange(current, period.start, period.end)) {
      return period.key;
    }
  }

  return "dinner";
}

/**
 * Normalizes category name for matching.
 */
export function normalizeCategoryKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Finds the matching category ID from a list of categories for a given meal period key.
 */
export function findMatchingCategoryId(categories = [], periodKey = "lunch") {
  if (!Array.isArray(categories) || categories.length === 0) return null;

  const matched = categories.find((category) => {
    if (!category) return false;
    const nameEn = String(category.nameEn || "").toLowerCase();
    const nameBn = String(category.nameBn || "").toLowerCase();
    const normKey = normalizeCategoryKey(nameEn);

    switch (periodKey) {
      case "breakfast":
        return (
          normKey.includes("breakfast") ||
          normKey.includes("break") ||
          nameEn.includes("breakfast") ||
          nameEn.includes("break fast") ||
          nameBn.includes("নাস্তা") ||
          nameBn.includes("ব্রেকফাস্ট") ||
          nameBn.includes("সকাল")
        );
      case "lunch":
        return (
          normKey.includes("lunch") ||
          nameEn.includes("lunch") ||
          nameBn.includes("লাঞ্চ") ||
          nameBn.includes("দুপুর")
        );
      case "meal":
        return (
          normKey === "meal" ||
          nameEn === "meal" ||
          nameEn.includes("set meal") ||
          nameBn.includes("মিল")
        );
      case "dinner":
        return (
          normKey.includes("dinner") ||
          nameEn.includes("dinner") ||
          nameBn.includes("ডিনার") ||
          nameBn.includes("রাত")
        );
      default:
        return normKey === periodKey;
    }
  });

  return matched ? matched.id : null;
}

/**
 * Loads meal period settings from localStorage (per store or global).
 */
export function loadMealPeriodSettings(storeId = null) {
  if (typeof window === "undefined") return DEFAULT_MEAL_PERIODS;

  try {
    const key = storeId ? `${MEAL_PERIOD_STORAGE_KEY}_${storeId}` : MEAL_PERIOD_STORAGE_KEY;
    const stored = window.localStorage.getItem(key) || window.localStorage.getItem(MEAL_PERIOD_STORAGE_KEY);
    if (!stored) return DEFAULT_MEAL_PERIODS;

    const parsed = JSON.parse(stored);
    return {
      breakfast: { ...DEFAULT_MEAL_PERIODS.breakfast, ...(parsed.breakfast || {}) },
      lunch: { ...DEFAULT_MEAL_PERIODS.lunch, ...(parsed.lunch || {}) },
      meal: { ...DEFAULT_MEAL_PERIODS.meal, ...(parsed.meal || {}) },
      dinner: { ...DEFAULT_MEAL_PERIODS.dinner, ...(parsed.dinner || {}) }
    };
  } catch {
    return DEFAULT_MEAL_PERIODS;
  }
}

/**
 * Saves meal period settings to localStorage.
 */
export function saveMealPeriodSettings(settings, storeId = null) {
  if (typeof window === "undefined") return;

  try {
    const key = storeId ? `${MEAL_PERIOD_STORAGE_KEY}_${storeId}` : MEAL_PERIOD_STORAGE_KEY;
    const data = JSON.stringify(settings);
    window.localStorage.setItem(key, data);
    if (storeId) {
      window.localStorage.setItem(MEAL_PERIOD_STORAGE_KEY, data);
    }
    window.dispatchEvent(new CustomEvent("bpc:meal-periods-updated", { detail: settings }));
  } catch (err) {
    console.error("Failed to save meal periods:", err);
  }
}
