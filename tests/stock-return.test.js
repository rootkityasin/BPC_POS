import { describe, expect, it } from "vitest";

function calculateLoss(buyingPrice, returnQuantity) {
  const price = Number(buyingPrice ?? 0);
  const qty = Number(returnQuantity ?? 0);
  if (price <= 0 || qty <= 0) return null;
  return Number((price * qty).toFixed(2));
}

function validateReturnQuantity(currentStock, requestedReturn) {
  const stock = Number(currentStock ?? 0);
  const qty = Math.floor(Number(requestedReturn));
  if (isNaN(qty) || qty <= 0) {
    return { valid: false, error: "Quantity must be greater than zero." };
  }
  if (qty > stock) {
    return { valid: false, error: `Quantity (${qty}) exceeds available stock (${stock}).` };
  }
  return { valid: true, quantity: qty };
}

describe("Stock Return logic", () => {
  it("calculates cost loss accurately based on buying price and quantity", () => {
    expect(calculateLoss(30, 2)).toBe(60.00);
    expect(calculateLoss(15.50, 4)).toBe(62.00);
    expect(calculateLoss(null, 2)).toBe(null);
    expect(calculateLoss(0, 5)).toBe(null);
  });

  it("validates return quantity within available stock limits", () => {
    expect(validateReturnQuantity(10, 2)).toEqual({ valid: true, quantity: 2 });
    expect(validateReturnQuantity(5, 5)).toEqual({ valid: true, quantity: 5 });
    expect(validateReturnQuantity(5, 6).valid).toBe(false);
    expect(validateReturnQuantity(5, 0).valid).toBe(false);
    expect(validateReturnQuantity(5, -1).valid).toBe(false);
  });
});
