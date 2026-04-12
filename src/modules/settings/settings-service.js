import { prisma } from "@/lib/prisma";

const VALID_RECEIPT_THEMES = new Set(["modern", "minimal", "classic"]);
const VALID_PAPER_WIDTHS = new Set(["58mm", "80mm"]);
const VALID_PRINTER_STATUSES = new Set(["CONNECTED", "DISCONNECTED", "MAINTENANCE"]);

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

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      terminals: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!store) return null;

  return {
    storeName: store.nameEn,
    timezone: store.timezone,
    printers: store.terminals,
    defaultPrinterId: store.defaultPrinterId,
    receiptTheme: store.receiptTheme,
    receiptFontSize: store.receiptFontSize,
    receiptAccentColor: store.receiptAccentColor,
    receiptPaperWidth: store.receiptPaperWidth,
    receiptHeaderText: store.receiptHeaderText,
    receiptFooterText: store.receiptFooterText,
    receiptShowLogo: store.receiptShowLogo,
    receiptShowSeller: store.receiptShowSeller,
    receiptShowBuyer: store.receiptShowBuyer,
    receiptShowOrderStatus: store.receiptShowOrderStatus,
    receiptShowItemNotes: store.receiptShowItemNotes,
    receiptShowQr: store.receiptShowQr,
    receiptShowSign: store.receiptShowSign,
    receiptWatermark: store.receiptWatermark
  };
}

export async function updateDeviceSettings(storeId, payload) {
  const receiptTheme = VALID_RECEIPT_THEMES.has(payload.receiptTheme) ? payload.receiptTheme : "modern";
  const receiptPaperWidth = VALID_PAPER_WIDTHS.has(payload.receiptPaperWidth) ? payload.receiptPaperWidth : "80mm";
  const receiptFontSize = clampNumber(payload.receiptFontSize, 10, 18, 14);
  const receiptWatermark = clampNumber(payload.receiptWatermark, 0, 1, 0.1);
  const printers = Array.isArray(payload.printers) ? payload.printers : [];

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
            timezone: sanitizeText(payload.timezone) || "Asia/Dhaka"
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
          timezone: sanitizeText(payload.timezone) || "Asia/Dhaka"
        }
      });
      if (clientKey) printerIdByKey.set(clientKey, createdPrinter.id);
    }

    const defaultPrinterKey = sanitizeText(payload.defaultPrinterKey);
    const defaultPrinterId = defaultPrinterKey ? printerIdByKey.get(defaultPrinterKey) || null : null;

    return tx.store.update({
      where: { id: storeId },
      data: {
        timezone: sanitizeText(payload.timezone) || "Asia/Dhaka",
        defaultPrinterId,
        receiptTheme,
        receiptFontSize,
        receiptAccentColor: sanitizeHexColor(payload.receiptAccentColor),
        receiptPaperWidth,
        receiptHeaderText: sanitizeNullableText(payload.receiptHeaderText),
        receiptFooterText: sanitizeNullableText(payload.receiptFooterText),
        receiptShowLogo: Boolean(payload.receiptShowLogo),
        receiptShowSeller: Boolean(payload.receiptShowSeller),
        receiptShowBuyer: Boolean(payload.receiptShowBuyer),
        receiptShowOrderStatus: Boolean(payload.receiptShowOrderStatus),
        receiptShowItemNotes: Boolean(payload.receiptShowItemNotes),
        receiptShowQr: Boolean(payload.receiptShowQr),
        receiptShowSign: Boolean(payload.receiptShowSign),
        receiptWatermark
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
