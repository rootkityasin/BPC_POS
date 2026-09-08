import { describe, expect, it } from "vitest";

function calculateNewStock(currentQuantity, addQuantity) {
  const current = Math.max(0, parseInt(currentQuantity || 0, 10));
  const add = Math.max(0, parseInt(addQuantity || 0, 10));
  return current + add;
}

function isRestockRequired(currentStock, lowStockLevel = 5) {
  return Number(currentStock || 0) <= Number(lowStockLevel);
}

describe("Quick Restock Logic", () => {
  it("increments current stock accurately when restocked", () => {
    expect(calculateNewStock(0, 10)).toBe(10);
    expect(calculateNewStock(2, 25)).toBe(27);
    expect(calculateNewStock(5, 5)).toBe(10);
  });

  it("handles zero or invalid addQuantity safely", () => {
    expect(calculateNewStock(5, 0)).toBe(5);
    expect(calculateNewStock(5, -10)).toBe(5);
    expect(calculateNewStock(5, null)).toBe(5);
  });

  it("identifies low stock items requiring restock correctly", () => {
    expect(isRestockRequired(0, 5)).toBe(true);
    expect(isRestockRequired(5, 5)).toBe(true);
    expect(isRestockRequired(6, 5)).toBe(false);
    expect(isRestockRequired(20, 5)).toBe(false);
  });
});
