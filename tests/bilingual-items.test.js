import { describe, it, expect } from "vitest";

function getItemDisplayName(item, lang) {
  if (!item) return "";
  const nameEn = String(item.nameEn || item.name || "").trim();
  const nameBn = String(item.nameBn || "").trim();
  return lang === "bn" && nameBn ? nameBn : nameEn;
}

describe("Bilingual item name resolution with fallback", () => {
  it("returns Bangla name when language is 'bn' and nameBn is provided", () => {
    const dish = {
      nameEn: "Chicken Biryani",
      nameBn: "চিকেন বিরিয়ানি"
    };
    expect(getItemDisplayName(dish, "bn")).toBe("চিকেন বিরিয়ানি");
  });

  it("falls back to English name when language is 'bn' but nameBn is empty or whitespace", () => {
    const dishWithEmptyBn = {
      nameEn: "Beef Burger",
      nameBn: ""
    };
    expect(getItemDisplayName(dishWithEmptyBn, "bn")).toBe("Beef Burger");

    const dishWithNullBn = {
      nameEn: "Beef Burger",
      nameBn: null
    };
    expect(getItemDisplayName(dishWithNullBn, "bn")).toBe("Beef Burger");

    const dishWithWhitespaceBn = {
      nameEn: "Beef Burger",
      nameBn: "   "
    };
    expect(getItemDisplayName(dishWithWhitespaceBn, "bn")).toBe("Beef Burger");
  });

  it("returns English name when language is 'en' even if nameBn is provided", () => {
    const dish = {
      nameEn: "Chicken Biryani",
      nameBn: "চিকেন বিরিয়ানি"
    };
    expect(getItemDisplayName(dish, "en")).toBe("Chicken Biryani");
  });

  it("handles stock item naming with fallback", () => {
    const stockItemWithBn = {
      name: "Sugar",
      nameBn: "চিনি"
    };
    expect(getItemDisplayName(stockItemWithBn, "bn")).toBe("চিনি");
    expect(getItemDisplayName(stockItemWithBn, "en")).toBe("Sugar");

    const stockItemNoBn = {
      name: "Salt",
      nameBn: null
    };
    expect(getItemDisplayName(stockItemNoBn, "bn")).toBe("Salt");
    expect(getItemDisplayName(stockItemNoBn, "en")).toBe("Salt");
  });
});
