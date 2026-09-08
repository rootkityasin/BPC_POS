import { describe, it, expect } from "vitest";
import {
  DEFAULT_MEAL_PERIODS,
  isTimeInRange,
  getActiveMealPeriodKey,
  findMatchingCategoryId,
  normalizeCategoryKey
} from "../src/modules/pos/meal-periods.js";

describe("Meal Period Time Ranges and Auto-Selection", () => {
  describe("isTimeInRange()", () => {
    it("handles daytime ranges properly", () => {
      // Range: 11:00 to 15:00
      expect(isTimeInRange("11:00", "11:00", "15:00")).toBe(true);
      expect(isTimeInRange("13:30", "11:00", "15:00")).toBe(true);
      expect(isTimeInRange("14:59", "11:00", "15:00")).toBe(true);
      expect(isTimeInRange("15:00", "11:00", "15:00")).toBe(false);
      expect(isTimeInRange("10:59", "11:00", "15:00")).toBe(false);
    });

    it("handles midnight-crossing overnight ranges properly", () => {
      // Dinner Range: 18:00 to 05:00
      expect(isTimeInRange("18:00", "18:00", "05:00")).toBe(true);
      expect(isTimeInRange("21:30", "18:00", "05:00")).toBe(true);
      expect(isTimeInRange("23:59", "18:00", "05:00")).toBe(true);
      expect(isTimeInRange("00:00", "18:00", "05:00")).toBe(true);
      expect(isTimeInRange("03:15", "18:00", "05:00")).toBe(true);
      expect(isTimeInRange("04:59", "18:00", "05:00")).toBe(true);
      expect(isTimeInRange("05:00", "18:00", "05:00")).toBe(false);
      expect(isTimeInRange("12:00", "18:00", "05:00")).toBe(false);
      expect(isTimeInRange("17:59", "18:00", "05:00")).toBe(false);
    });

    it("returns false for invalid or empty inputs", () => {
      expect(isTimeInRange(null, "11:00", "15:00")).toBe(false);
      expect(isTimeInRange("12:00", null, "15:00")).toBe(false);
      expect(isTimeInRange("12:00", "11:00", "")).toBe(false);
    });
  });

  describe("getActiveMealPeriodKey()", () => {
    it("identifies breakfast period", () => {
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "05:00")).toBe("breakfast");
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "08:30")).toBe("breakfast");
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "10:59")).toBe("breakfast");
    });

    it("identifies lunch period", () => {
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "11:00")).toBe("lunch");
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "13:00")).toBe("lunch");
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "14:59")).toBe("lunch");
    });

    it("identifies meal period", () => {
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "15:00")).toBe("meal");
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "16:45")).toBe("meal");
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "17:59")).toBe("meal");
    });

    it("identifies dinner period during late night and early morning", () => {
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "18:00")).toBe("dinner");
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "22:00")).toBe("dinner");
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "01:30")).toBe("dinner");
      expect(getActiveMealPeriodKey(DEFAULT_MEAL_PERIODS, "04:59")).toBe("dinner");
    });

    it("works correctly with custom adjusted time periods", () => {
      const customPeriods = {
        breakfast: { key: "breakfast", start: "06:00", end: "10:00" },
        lunch: { key: "lunch", start: "10:00", end: "14:00" },
        meal: { key: "meal", start: "14:00", end: "19:00" },
        dinner: { key: "dinner", start: "19:00", end: "06:00" }
      };

      expect(getActiveMealPeriodKey(customPeriods, "10:15")).toBe("lunch");
      expect(getActiveMealPeriodKey(customPeriods, "17:00")).toBe("meal");
      expect(getActiveMealPeriodKey(customPeriods, "20:00")).toBe("dinner");
    });
  });

  describe("findMatchingCategoryId()", () => {
    const categories = [
      { id: "cat-1", nameEn: "Break Fast", nameBn: "সকালের নাস্তা" },
      { id: "cat-2", nameEn: "Lunch", nameBn: "দুপুরের খাবার" },
      { id: "cat-3", nameEn: "Meal", nameBn: "মিল" },
      { id: "cat-4", nameEn: "Dinner", nameBn: "রাতের খাবার" },
      { id: "cat-5", nameEn: "Beverage", nameBn: "পানীয়" }
    ];

    it("matches English category names including spaced 'Break Fast'", () => {
      expect(findMatchingCategoryId(categories, "breakfast")).toBe("cat-1");
      expect(findMatchingCategoryId(categories, "lunch")).toBe("cat-2");
      expect(findMatchingCategoryId(categories, "meal")).toBe("cat-3");
      expect(findMatchingCategoryId(categories, "dinner")).toBe("cat-4");
    });

    it("matches Bengali category names", () => {
      const bnOnlyCategories = [
        { id: "cat-bn-1", nameEn: "", nameBn: "সকালের নাস্তা" },
        { id: "cat-bn-2", nameEn: "", nameBn: "লাঞ্চ বক্স" },
        { id: "cat-bn-3", nameEn: "", nameBn: "রেগুলার মিল" },
        { id: "cat-bn-4", nameEn: "", nameBn: "রাতের ডিনার" }
      ];

      expect(findMatchingCategoryId(bnOnlyCategories, "breakfast")).toBe("cat-bn-1");
      expect(findMatchingCategoryId(bnOnlyCategories, "lunch")).toBe("cat-bn-2");
      expect(findMatchingCategoryId(bnOnlyCategories, "meal")).toBe("cat-bn-3");
      expect(findMatchingCategoryId(bnOnlyCategories, "dinner")).toBe("cat-bn-4");
    });

    it("returns null if categories array is empty or no match is found", () => {
      expect(findMatchingCategoryId([], "lunch")).toBeNull();
      expect(findMatchingCategoryId([{ id: "cat-other", nameEn: "Dessert", nameBn: "মিষ্টি" }], "breakfast")).toBeNull();
    });
  });
});
