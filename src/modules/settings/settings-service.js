import { prisma } from "@/lib/prisma";

export async function getDeviceSettings(user) {
  const store = await prisma.store.findUnique({
    where: { id: user.storeId },
    include: {
      terminals: {
        where: user.storeId ? undefined : { assignedUserId: user.sub }
      }
    }
  });

  if (!store) return null;

  return {
    timezone: store.timezone,
    printers: store.terminals,
    receiptTheme: store.receiptTheme,
    receiptFontSize: store.receiptFontSize,
    receiptShowLogo: store.receiptShowLogo,
    receiptShowSeller: store.receiptShowSeller,
    receiptShowBuyer: store.receiptShowBuyer,
    receiptShowQr: store.receiptShowQr,
    receiptShowSign: store.receiptShowSign,
    receiptWatermark: store.receiptWatermark
  };
}

export async function updateDeviceSettings(storeId, payload) {
  return prisma.store.update({
    where: { id: storeId },
    data: {
      timezone: payload.timezone,
      receiptTheme: payload.receiptTheme,
      receiptFontSize: Number(payload.receiptFontSize),
      receiptShowLogo: Boolean(payload.receiptShowLogo),
      receiptShowSeller: Boolean(payload.receiptShowSeller),
      receiptShowBuyer: Boolean(payload.receiptShowBuyer),
      receiptShowQr: Boolean(payload.receiptShowQr),
      receiptShowSign: Boolean(payload.receiptShowSign),
      receiptWatermark: Number(payload.receiptWatermark)
    }
  });
}
