import { prisma } from "@/lib/prisma";

const VALID_RECEIPT_THEMES = new Set(["modern", "minimal", "classic"]);
const VALID_PAPER_WIDTHS = new Set(["58mm", "80mm"]);
const VALID_PRINTER_STATUSES = new Set(["CONNECTED", "DISCONNECTED", "MAINTENANCE"]);
const DEFAULT_TIMEZONE = "Asia/Dhaka";
const DEFAULT_RECEIPT_THEME = "modern";
const DEFAULT_RECEIPT_FONT_SIZE = 14;
const DEFAULT_RECEIPT_ACCENT_COLOR = "#ff242d";
const DEFAULT_RECEIPT_PAPER_WIDTH = "58mm";
const DEFAULT_RECEIPT_WATERMARK = 0.1;
const DEFAULT_RECEIPT_FRONT_OPACITY = 1;

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
}

function sanitizeText(value) {
  return String(value || "").trim();
}

function sanitizeNullableText(value) {
  const text = sanitizeText(value);
  return text || null;
}

function sanitizeHexColor(value, fallback = "#2771cb") {
  const text = sanitizeText(value);
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
}

function buildTerminalCode(name) {
  const base = sanitizeText(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12);

  return `TERM-${base || "PRINTER"}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function getDeviceSettings(storeId) {
  if (!storeId) return null;

  const [store, latestOrder] = await Promise.all([
    prisma.store.findUnique({
      where: { id: storeId },
      include: {
        terminals: {
          orderBy: { createdAt: "asc" }
        }
      }
    }),
    prisma.order.findFirst({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          select: {
            id: true,
            itemName: true,
            quantity: true,
            unitPrice: true,
            printStatus: true
          }
        }
      }
    })
  ]);

  if (!store) return null;

  return {
    storeName: store.nameEn,
    storeLocation: store.location,
    storeLogoUrl: store.logoUrl,
    timezone: store.timezone || DEFAULT_TIMEZONE,
    printers: store.terminals,
    defaultPrinterId: store.defaultPrinterId,
    receiptTheme: store.receiptTheme || DEFAULT_RECEIPT_THEME,
    receiptFontSize: Number(store.receiptFontSize || DEFAULT_RECEIPT_FONT_SIZE),
    receiptAccentColor: store.receiptAccentColor || DEFAULT_RECEIPT_ACCENT_COLOR,
    receiptPaperWidth: store.receiptPaperWidth || DEFAULT_RECEIPT_PAPER_WIDTH,
    receiptHeaderText: store.receiptHeaderText,
    receiptFooterText: store.receiptFooterText,
    receiptShowLogo: store.receiptShowLogo,
    receiptShowTopLogo: store.receiptShowTopLogo ?? store.receiptShowLogo,
    receiptShowBottomLogo: store.receiptShowBottomLogo ?? store.receiptShowLogo,
    receiptShowSeller: store.receiptShowSeller,
    receiptShowBuyer: store.receiptShowBuyer,
    receiptShowOrderStatus: store.receiptShowOrderStatus,
    receiptShowItemNotes: store.receiptShowItemNotes,
    receiptShowQr: store.receiptShowQr,
    receiptShowSign: store.receiptShowSign,
    receiptWatermark: store.receiptWatermark ?? DEFAULT_RECEIPT_WATERMARK,
    receiptFrontOpacity: store.receiptFrontOpacity ?? DEFAULT_RECEIPT_FRONT_OPACITY,
    previewOrder: latestOrder
      ? {
          invoiceNumber: latestOrder.invoiceNumber,
          receiptPublicCode: latestOrder.receiptPublicCode,
          customerName: latestOrder.customerName,
          customerPhone: latestOrder.customerPhone,
          status: latestOrder.status,
          subtotalAmount: latestOrder.subtotalAmount,
          vatAmount: latestOrder.vatAmount,
          vatPercentage: latestOrder.vatPercentage,
          totalAmount: latestOrder.totalAmount,
          createdAt: latestOrder.createdAt,
          items: latestOrder.items
        }
      : null
  };
}

export async function updateDeviceSettings(storeId, payload) {
  const receiptTheme = VALID_RECEIPT_THEMES.has(payload.receiptTheme) ? payload.receiptTheme : DEFAULT_RECEIPT_THEME;
  const receiptPaperWidth = VALID_PAPER_WIDTHS.has(payload.receiptPaperWidth) ? payload.receiptPaperWidth : DEFAULT_RECEIPT_PAPER_WIDTH;
  const receiptFontSize = clampNumber(payload.receiptFontSize, 10, 18, DEFAULT_RECEIPT_FONT_SIZE);
  const receiptWatermark = clampNumber(payload.receiptWatermark, 0, 1, DEFAULT_RECEIPT_WATERMARK);
  const receiptFrontOpacity = clampNumber(payload.receiptFrontOpacity, 0, 1, DEFAULT_RECEIPT_FRONT_OPACITY);
  const receiptShowTopLogo = Boolean(payload.receiptShowTopLogo);
  const receiptShowBottomLogo = Boolean(payload.receiptShowBottomLogo);
  const printers = Array.isArray(payload.printers) ? payload.printers : [];
  const timezone = sanitizeText(payload.timezone) || DEFAULT_TIMEZONE;

  return prisma.$transaction(async (tx) => {
    const existingTerminals = await tx.terminal.findMany({
      where: { storeId },
      orderBy: { createdAt: "asc" }
    });
    const existingIds = new Set(existingTerminals.map((terminal) => terminal.id));
    const printerIdByKey = new Map();

    for (const printer of printers) {
      const name = sanitizeText(printer.name);
      const printerTarget = sanitizeNullableText(printer.printerTarget);
      const printerConnection = sanitizeNullableText(printer.printerConnection);
      const printerModel = sanitizeNullableText(printer.printerModel);
      const printerStatus = VALID_PRINTER_STATUSES.has(printer.printerStatus) ? printer.printerStatus : "DISCONNECTED";
      const clientKey = sanitizeText(printer.clientKey || printer.id);

      if (!name) continue;

      if (printer.id && existingIds.has(printer.id)) {
        const updatedPrinter = await tx.terminal.update({
          where: { id: printer.id },
          data: {
            name,
            printerTarget,
            printerConnection,
            printerModel,
            printerStatus,
            timezone
          }
        });
        if (clientKey) printerIdByKey.set(clientKey, updatedPrinter.id);
        continue;
      }

      const createdPrinter = await tx.terminal.create({
        data: {
          storeId,
          name,
          code: buildTerminalCode(name),
          printerTarget,
          printerConnection,
          printerModel,
          printerStatus,
          timezone
        }
      });
      if (clientKey) printerIdByKey.set(clientKey, createdPrinter.id);
    }

    const defaultPrinterKey = sanitizeText(payload.defaultPrinterKey);
    const defaultPrinterId = defaultPrinterKey ? printerIdByKey.get(defaultPrinterKey) || null : null;

    return tx.store.update({
      where: { id: storeId },
      data: {
        timezone,
        defaultPrinterId,
        receiptTheme,
        receiptFontSize,
        receiptAccentColor: sanitizeHexColor(payload.receiptAccentColor, DEFAULT_RECEIPT_ACCENT_COLOR),
        receiptPaperWidth,
        receiptHeaderText: sanitizeNullableText(payload.receiptHeaderText),
        receiptFooterText: sanitizeNullableText(payload.receiptFooterText),
        receiptShowLogo: receiptShowTopLogo || receiptShowBottomLogo,
        receiptShowTopLogo,
        receiptShowBottomLogo,
        receiptShowSeller: Boolean(payload.receiptShowSeller),
        receiptShowBuyer: Boolean(payload.receiptShowBuyer),
        receiptShowOrderStatus: Boolean(payload.receiptShowOrderStatus),
        receiptShowItemNotes: Boolean(payload.receiptShowItemNotes),
        receiptShowQr: Boolean(payload.receiptShowQr),
        receiptShowSign: Boolean(payload.receiptShowSign),
        receiptWatermark,
        receiptFrontOpacity
      }
    });
  });
}

export async function getStoreSetup(user, selectedStoreId = null, options = {}) {
  const { allowUserStoreFallback = true } = options;
  const storeId = selectedStoreId || (allowUserStoreFallback ? user.storeId : null) || null;
  const [store, managers, stores] = await Promise.all([
    storeId
      ? prisma.store.findUnique({
          where: { id: storeId },
          include: {
            users: {
              where: { role: { code: "MANAGER" } },
              orderBy: { createdAt: "desc" },
              include: { store: true }
            }
          }
        })
      : Promise.resolve(null),
    prisma.user.findMany({
      where: { role: { code: "MANAGER" } },
      orderBy: { createdAt: "desc" },
      include: { store: true }
    }),
    prisma.store.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          where: { role: { code: "MANAGER" } },
          orderBy: { createdAt: "desc" }
        }
      }
    })
  ]);

  return {
    store,
    assignedManagers: store?.users || [],
    managers,
    stores
  };
}
