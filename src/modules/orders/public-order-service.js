import { prisma } from "@/lib/prisma";

function publicOrderInclude() {
  return {
    store: {
      select: {
        id: true,
        nameEn: true,
        nameBn: true,
        logoUrl: true,
        location: true,
        timezone: true,
        vatNumber: true,
        vatPercentage: true,
        receiptTheme: true,
        receiptFontSize: true,
        receiptAccentColor: true,
        receiptPaperWidth: true,
        receiptHeaderText: true,
        receiptFooterText: true,
        receiptShowLogo: true,
        receiptShowTopLogo: true,
        receiptShowBottomLogo: true,
        receiptShowSeller: true,
        receiptShowBuyer: true,
        receiptShowOrderStatus: true,
        receiptShowItemNotes: true,
        receiptShowQr: true,
        receiptShowSign: true,
        receiptWatermark: true,
        receiptFrontOpacity: true
      }
    },
    items: {
      include: {
        dish: true,
        stockItem: true
      }
    }
  };
}

export async function getPublicOrderByCode(receiptPublicCode) {
  const normalizedCode = String(receiptPublicCode || "").trim();
  if (!normalizedCode) return null;

  return prisma.order.findUnique({
    where: { receiptPublicCode: normalizedCode },
    include: publicOrderInclude()
  });
}
