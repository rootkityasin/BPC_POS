import { describe, it, expect } from "vitest";
import {
  buildMealPeriodBreakdown,
  findPeakHour,
  buildCategoryDistribution,
  buildRecentOrders
} from "../src/modules/reports/sales-report-service.js";

describe("Sales Report Analytics Engine", () => {
  const sampleOrders = [
    {
      id: "ord-1",
      invoiceNumber: "INV-001",
      customerName: "Rahim",
      customerPhone: "01711111111",
      totalAmount: 500,
      status: "COMPLETED",
      createdAt: new Date("2026-09-08T08:30:00"),
      items: [
        {
          quantity: 2,
          unitPrice: 250,
          dish: { category: { nameEn: "Breakfast Items", nameBn: "সকালের নাস্তা" } }
        }
      ]
    },
    {
      id: "ord-2",
      invoiceNumber: "INV-002",
      customerName: "Karim",
      customerPhone: null,
      totalAmount: 1200,
      status: "COMPLETED",
      createdAt: new Date("2026-09-08T13:15:00"),
      items: [
        {
          quantity: 3,
          unitPrice: 400,
          dish: { category: { nameEn: "Rice & Biryani", nameBn: "বিরিয়ানি" } }
        }
      ]
    },
    {
      id: "ord-3",
      invoiceNumber: "INV-003",
      customerName: "Ayesha",
      customerPhone: "01822222222",
      totalAmount: 300,
      status: "COMPLETED",
      createdAt: new Date("2026-09-08T16:45:00"),
      items: [
        {
          quantity: 2,
          unitPrice: 150,
          dish: { category: { nameEn: "Snacks & Beverages", nameBn: "স্ন্যাকস" } }
        }
      ]
    },
    {
      id: "ord-4",
      invoiceNumber: "INV-004",
      customerName: "Tanvir",
      customerPhone: "01933333333",
      totalAmount: 1500,
      status: "COMPLETED",
      createdAt: new Date("2026-09-08T20:00:00"),
      items: [
        {
          quantity: 3,
          unitPrice: 500,
          dish: { category: { nameEn: "Rice & Biryani", nameBn: "বিরিয়ানি" } }
        }
      ]
    }
  ];

  describe("buildMealPeriodBreakdown()", () => {
    it("correctly buckets orders into meal periods with accurate revenues", () => {
      const breakdown = buildMealPeriodBreakdown(sampleOrders);
      expect(breakdown).toHaveLength(4);

      const breakfast = breakdown.find((p) => p.key === "breakfast");
      const lunch = breakdown.find((p) => p.key === "lunch");
      const snacks = breakdown.find((p) => p.key === "snacks");
      const dinner = breakdown.find((p) => p.key === "dinner");

      expect(breakfast.orders).toBe(1);
      expect(breakfast.revenue).toBe(500);

      expect(lunch.orders).toBe(1);
      expect(lunch.revenue).toBe(1200);

      expect(snacks.orders).toBe(1);
      expect(snacks.revenue).toBe(300);

      expect(dinner.orders).toBe(1);
      expect(dinner.revenue).toBe(1500);

      expect(dinner.sharePct).toBe(43);
    });
  });

  describe("findPeakHour()", () => {
    it("identifies the hour with the highest sales volume", () => {
      const peak = findPeakHour(sampleOrders);
      expect(peak).not.toBeNull();
      expect(peak.revenue).toBe(1500);
      expect(peak.orders).toBe(1);
      expect(peak.windowLabel).toBeDefined();
    });

    it("returns null for empty order lists", () => {
      expect(findPeakHour([])).toBeNull();
    });
  });

  describe("buildCategoryDistribution()", () => {
    it("aggregates revenue and quantity across dish categories", () => {
      const categories = buildCategoryDistribution(sampleOrders);
      expect(categories.length).toBeGreaterThan(0);

      const biryani = categories.find((c) => c.nameEn === "Rice & Biryani");
      expect(biryani).toBeDefined();
      expect(biryani.revenue).toBe(2700);
      expect(biryani.units).toBe(6);
    });
  });

  describe("buildRecentOrders()", () => {
    it("orders recent transactions from newest to oldest", () => {
      const recent = buildRecentOrders(sampleOrders);
      expect(recent).toHaveLength(4);
      expect(recent[0].invoiceNumber).toBe("INV-004");
      expect(recent[3].invoiceNumber).toBe("INV-001");
    });
  });
});
