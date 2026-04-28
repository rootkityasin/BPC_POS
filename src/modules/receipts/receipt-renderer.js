import { formatCurrency } from "@/lib/utils";
import { formatOrderId } from "@/lib/order-id";
import qrcodeGenerator from "qrcode-generator";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatReceiptDate(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localeOptions = timeZone ? { timeZone } : {};
  const weekday = date.toLocaleDateString("en-US", { ...localeOptions, weekday: "short" });
  const month = date.toLocaleDateString("en-US", { ...localeOptions, month: "short" });
  const day = date.toLocaleDateString("en-US", { ...localeOptions, day: "2-digit" });
  const year = date.toLocaleDateString("en-US", { ...localeOptions, year: "numeric" });
  const time = date.toLocaleTimeString("en-US", {
    ...localeOptions,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  return `${weekday}, ${month} ${day}, ${year} • ${time}`;
}

function formatReceiptField(value) {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue ? normalizedValue : "null";
}

function hexToRgb(hex) {
  const normalized = String(hex || "").trim();
  const match = normalized.match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) return { r: 255, g: 36, b: 45 };

  const value = match[1];
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function toRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getReceiptThemeStyles(theme, accentColor) {
  if (theme === "minimal") {
    return {
      theme,
      pageBackground: "#f8fafc",
      paperBackground: "#ffffff",
      primaryText: "#0f172a",
      secondaryText: "#64748b",
      separatorColor: "#d4d4d8",
      borderColor: accentColor,
      borderStyle: "solid",
      accentColor,
      accentSoft: toRgba(accentColor, 0.08)
    };
  }

  if (theme === "classic") {
    return {
      theme,
      pageBackground: "#f7f1e5",
      paperBackground: "#fffdf7",
      primaryText: "#2c241b",
      secondaryText: "#7c6b58",
      separatorColor: "#cebfae",
      borderColor: toRgba(accentColor, 0.85),
      borderStyle: "double",
      accentColor: toRgba(accentColor, 0.92),
      accentSoft: toRgba(accentColor, 0.1)
    };
  }

  return {
    theme,
    pageBackground: "#ffffff",
    paperBackground: "#ffffff",
    primaryText: "#111111",
    secondaryText: "#7b7b7b",
    separatorColor: "#b8b8b8",
    borderColor: accentColor,
    borderStyle: "dashed",
    accentColor,
    accentSoft: toRgba(accentColor, 0.08)
  };
}

function buildReceiptQrDataUri(value) {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return "";

  const qr = qrcodeGenerator(0, "M");
  qr.addData(normalizedValue);
  qr.make();
  return qr.createDataURL(6, 2);
}

export function getReceiptSettingsFromStore(store) {
  return {
    timezone: store?.timezone || "Asia/Dhaka",
    theme: store?.receiptTheme || "modern",
    fontSize: Number(store?.receiptFontSize || 14),
    accentColor: store?.receiptAccentColor || "#ff242d",
    paperWidth: store?.receiptPaperWidth || "58mm",
    headerText: store?.receiptHeaderText || "",
    footerText: store?.receiptFooterText || "",
    showLogo: Boolean(store?.receiptShowTopLogo || store?.receiptShowBottomLogo || store?.receiptShowLogo),
    showTopLogo: Boolean(store?.receiptShowTopLogo ?? store?.receiptShowLogo),
    showBottomLogo: Boolean(store?.receiptShowBottomLogo ?? store?.receiptShowLogo),
    showSeller: Boolean(store?.receiptShowSeller),
    showBuyer: Boolean(store?.receiptShowBuyer),
    showOrderStatus: Boolean(store?.receiptShowOrderStatus),
    showItemNotes: Boolean(store?.receiptShowItemNotes),
    showQr: Boolean(store?.receiptShowQr),
    showSign: Boolean(store?.receiptShowSign),
    watermark: Number(store?.receiptWatermark || 0.1),
    frontOpacity: Number(store?.receiptFrontOpacity ?? 1)
  };
}

export function buildReceiptHtml(order, t, getItemLabel, options = {}) {
  const settings = getReceiptSettingsFromStore(order.store);
  const themeStyles = getReceiptThemeStyles(settings.theme, settings.accentColor);
  const baseFontSize = Math.max(12, Number(settings.fontSize || 14));
  const sectionFontSize = Math.max(15, baseFontSize + 4);
  const metaFontSize = Math.max(12, baseFontSize - 1);
  const footerFontSize = Math.max(12, baseFontSize);
  const updatedAtValue = options.updatedAtOverride || order.updatedAt || null;
  const createdAtValue = order.createdAt || null;
  const updatedAtDate = updatedAtValue ? new Date(updatedAtValue) : null;
  const createdAtDate = createdAtValue ? new Date(createdAtValue) : null;
  const isUpdated = options.forceUpdated
    || (updatedAtDate && createdAtDate && updatedAtDate.getTime() - createdAtDate.getTime() > 1000);
  const rows = order.items
    .map((item) => {
      const originalQty = Number(item.quantity || 0);
      const refundedQty = Number(item.refundedQuantity || 0);
      const effectiveQty = isUpdated ? Math.max(0, originalQty - refundedQty) : originalQty;
      if (isUpdated && effectiveQty <= 0) return "";

      const name = escapeHtml(getItemLabel(item));
      const quantity = `x${escapeHtml(effectiveQty)}`;
      const price = escapeHtml(formatCurrency(Number(item.unitPrice || 0) * effectiveQty));

      return `
        <tr>
          <td style="padding:3px 0 2px 0;vertical-align:top;">
            <div style="font-size:${sectionFontSize}px;line-height:1.15;color:${themeStyles.primaryText};">${name}</div>
            ${settings.showItemNotes && item.note ? `<div style="margin-top:3px;font-size:${Math.max(11, metaFontSize - 1)}px;color:${themeStyles.primaryText};">${escapeHtml(item.note)}</div>` : ""}
          </td>
          <td style="padding:3px 0 2px 0;vertical-align:top;text-align:center;width:56px;font-size:${sectionFontSize}px;line-height:1.15;color:${themeStyles.primaryText};">${quantity}</td>
          <td style="padding:3px 0 2px 0;vertical-align:top;text-align:right;width:92px;font-size:${sectionFontSize}px;line-height:1.15;color:${themeStyles.primaryText};">${price}</td>
        </tr>`;
    })
    .filter(Boolean)
    .join("");
  const storeName = order.store?.nameEn || "Store";
  const storeLogo = (settings.showTopLogo || settings.showBottomLogo || settings.showLogo) ? order.store?.logoUrl || "" : "";
  const topLogo = settings.showTopLogo ? storeLogo : "";
  const bottomLogo = settings.showBottomLogo ? storeLogo : "";
  const storeLocation = settings.showSeller ? String(order.store?.location || "").trim() : "";
  const receiptPaperWidth = options.paperWidthOverride || settings.paperWidth;
  const paperWidth = receiptPaperWidth === "58mm" ? "300px" : "380px";
  const ticketDate = formatReceiptDate(order.createdAt, settings.timezone);
  const paymentType = String(order.paymentMethod || "cash").toUpperCase();
  const customerName = formatReceiptField(order.customerName);
  const customerPhone = formatReceiptField(order.customerPhone);
  const operatorName = order.createdBy || order.cashierName || order.operatorName || order.user?.name || "Manager";
  const invoiceNumber = String(order.invoiceNumber || "");
  const shortOrderId = formatOrderId(invoiceNumber);
  const publicReceiptPath = order.receiptPublicCode ? `/r/${encodeURIComponent(order.receiptPublicCode)}` : "";
  const publicReceiptUrl = String(options.qrValueOverride || order.publicReceiptUrl || (typeof window !== "undefined" && publicReceiptPath ? `${window.location.origin}${publicReceiptPath}` : publicReceiptPath)).trim();
  const invoiceFontSize = receiptPaperWidth === "58mm" ? Math.max(sectionFontSize, 18) : Math.max(sectionFontSize + 1, 20);
  const footerNote = String(settings.footerText || "").trim() || "Thanks for fueling our passion. Drop by again, if your wallet isn't still sulking. You're always welcome here!";
  const qrImage = settings.showQr ? buildReceiptQrDataUri(publicReceiptUrl || shortOrderId || invoiceNumber || storeName) : "";
  const frontOpacity = Math.min(1, Math.max(0, Number(settings.frontOpacity || 1)));

  const totalItemsAmount = Number(order.totalAmount || 0);
  const vatAmount = Number(order.vatAmount || 0);
  const amountLabel = formatCurrency(totalItemsAmount);
  const vatLabelValue = formatCurrency(vatAmount);
  const totalLabel = formatCurrency(totalItemsAmount);

  return `<!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(order.invoiceNumber)}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: auto; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: ${themeStyles.pageBackground};
            color: ${themeStyles.primaryText};
            font-family: "Courier New", Courier, monospace;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt {
            width: ${paperWidth};
            margin: 0 auto;
            padding: 18px 18px 20px;
            background: ${themeStyles.paperBackground};
            position: relative;
            overflow: hidden;
          }
          .content {
            position: relative;
            z-index: 1;
            opacity: ${frontOpacity};
          }
          .watermark {
            position: absolute;
            inset: 120px 12px 110px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: ${receiptPaperWidth === "58mm" ? 28 : 36}px;
            font-weight: 700;
            letter-spacing: 0.16em;
            color: ${toRgba(themeStyles.accentColor, Math.min(0.35, Math.max(0, settings.watermark)))};
            opacity: ${Math.min(1, Math.max(0, settings.watermark))};
            transform: rotate(-16deg);
            pointer-events: none;
            text-transform: uppercase;
          }
          .center {
            text-align: center;
          }
          .logo {
            width: 82px;
            height: 82px;
            object-fit: contain;
            display: inline-block;
          }
          .date {
            margin-top: 12px;
            font-size: ${metaFontSize}px;
            line-height: 1.4;
            color: ${themeStyles.primaryText};
            letter-spacing: 0.01em;
          }
          .header-note {
            margin-top: 10px;
            font-size: ${metaFontSize}px;
            line-height: 1.4;
            color: ${themeStyles.primaryText};
            white-space: pre-line;
          }
          .updated-note {
            margin-top: 8px;
            font-size: ${metaFontSize}px;
            line-height: 1.4;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: ${themeStyles.accentColor};
            font-weight: 700;
          }
          .order-box {
            margin-top: 14px;
            border: 2px ${themeStyles.borderStyle} ${themeStyles.borderColor};
            border-radius: 14px;
            padding: 12px 10px 14px;
            text-align: center;
            background: ${themeStyles.accentSoft};
          }
          .order-label {
            display: inline-block;
            padding: 0 12px;
             background: ${themeStyles.paperBackground};
             position: relative;
             top: -24px;
             font-size: ${sectionFontSize}px;
             letter-spacing: 0.2em;
             color: ${themeStyles.accentColor};
             text-transform: none;
             font-weight: 700;
            }
          .order-number {
            margin-top: -10px;
             font-size: ${invoiceFontSize}px;
             font-weight: 700;
             letter-spacing: 0.03em;
             color: ${themeStyles.primaryText};
             white-space: nowrap;
            word-break: keep-all;
            overflow-wrap: normal;
            line-height: 1.08;
          }
          .section {
            margin-top: 28px;
          }
          .line {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: baseline;
            font-size: ${sectionFontSize}px;
            line-height: 1.45;
          }
          .label {
            color: ${themeStyles.primaryText};
          }
          .value {
            color: ${themeStyles.primaryText};
            text-align: right;
            white-space: nowrap;
          }
          .sep {
            margin: 16px 0;
            border-top: 2px ${themeStyles.theme === "classic" ? "dashed" : "dotted"} ${themeStyles.separatorColor};
          }
          .items-head {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: ${sectionFontSize}px;
            line-height: 1.35;
            color: ${themeStyles.primaryText};
            margin-bottom: 8px;
          }
          .items-head .left { flex: 1; }
          .items-head .qty { width: 56px; text-align: center; }
          .items-head .price { width: 92px; text-align: right; }
          table.items {
            width: 100%;
            border-collapse: collapse;
          }
          table.items td { vertical-align: top; }
          .totals .line { font-size: ${sectionFontSize}px; }
          .totals .total {
            font-size: ${Math.max(sectionFontSize + 1, 19)}px;
            font-weight: 400;
          }
          .totals .total .value {
            color: ${themeStyles.accentColor};
          }
          .operator {
            margin-top: 20px;
            padding-top: 18px;
          }
          .footer-note {
            margin-top: 28px;
            text-align: center;
            font-size: ${footerFontSize}px;
            line-height: 1.3;
            color: ${themeStyles.primaryText};
            white-space: pre-line;
          }
          .receipt-bottom-logo {
            margin-top: 18px;
            text-align: center;
          }
          .payment-type {
            font-size: ${sectionFontSize}px;
            letter-spacing: 0.12em;
            color: ${themeStyles.accentColor};
          }
          .signature {
            margin-top: 22px;
            padding-top: 18px;
            border-top: 2px dashed ${themeStyles.separatorColor};
            text-align: center;
            font-size: ${metaFontSize}px;
            color: ${themeStyles.primaryText};
          }
          .qr-section {
            margin-top: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
          .qr-box {
            width: ${receiptPaperWidth === "58mm" ? 108 : 132}px;
            height: ${receiptPaperWidth === "58mm" ? 108 : 132}px;
            padding: 10px;
            border: 2px dashed ${themeStyles.borderColor};
            border-radius: 18px;
            background: #ffffff;
          }
          .qr-caption {
            font-size: ${metaFontSize}px;
            color: ${themeStyles.primaryText};
            letter-spacing: 0.05em;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="watermark">${escapeHtml(storeName)}</div>
          <div class="content">
          <div class="center">
            ${topLogo ? `<img class="logo" src="${escapeHtml(topLogo)}" alt="${escapeHtml(storeName)}" />` : `<div style="height:82px;"></div>`}
            <div class="date">${escapeHtml(ticketDate)}</div>
            ${isUpdated ? `<div class="updated-note">UPDATED</div>` : ""}
            ${settings.headerText ? `<div class="header-note">${escapeHtml(settings.headerText)}</div>` : ""}
            ${storeLocation ? `<div class="header-note">${escapeHtml(storeLocation)}</div>` : ""}
          </div>

          <div class="order-box">
            <div class="order-label">Order ID</div>
            <div class="order-number">${escapeHtml(shortOrderId || invoiceNumber)}</div>
          </div>

          <div class="section">
            <div class="line">
              <div class="label">Payment Type</div>
              <div class="value payment-type">${escapeHtml(paymentType)}</div>
            </div>
            ${settings.showOrderStatus ? `<div class="line" style="margin-top: 6px;"><div class="label">Order Status</div><div class="value">${escapeHtml(formatReceiptField(order.status))}</div></div>` : ""}
          </div>

          <div class="sep"></div>

          ${settings.showBuyer ? `
          <div class="section">
            <div class="line">
              <div class="label">Customer Name</div>
              <div class="value">${escapeHtml(customerName)}</div>
            </div>
            <div class="line" style="margin-top: 6px;">
              <div class="label">Customer Number</div>
              <div class="value">${escapeHtml(customerPhone)}</div>
            </div>
          </div>` : ""}

          <div class="section" style="margin-top: 34px;">
            <div class="items-head">
              <div class="left">Item</div>
              <div class="qty">QTY</div>
              <div class="price">PRICE</div>
            </div>
            <div class="sep" style="margin: 10px 0 12px;"></div>
            <table class="items">
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>

          <div class="sep" style="margin-top: 26px;"></div>

          <div class="section totals">
            <div class="line">
              <div class="label">Amount</div>
              <div class="value">${escapeHtml(amountLabel)} BDT</div>
            </div>
            <div class="line" style="margin-top: 8px;">
              <div class="label">Tax</div>
              <div class="value">${escapeHtml(vatLabelValue)} BDT</div>
            </div>
            <div class="line total" style="margin-top: 8px;">
              <div class="label">Total</div>
              <div class="value">${escapeHtml(totalLabel)} BDT</div>
            </div>
          </div>

          <div class="sep" style="margin-top: 22px;"></div>

          <div class="section operator">
            <div class="line">
              <div class="label">Operator</div>
              <div class="value">${escapeHtml(operatorName)}</div>
            </div>
          </div>

          ${settings.showQr && qrImage ? `<div class="qr-section"><div class="qr-box"><img src="${qrImage}" alt="QR" style="width:100%;height:100%;display:block;" /></div><div class="qr-caption">${escapeHtml(shortOrderId || invoiceNumber)}</div></div>` : ""}

          ${settings.showSign ? `<div class="signature">Authorized signature: ____________________</div>` : ""}

          <div class="footer-note">${escapeHtml(footerNote)}</div>

          <div class="receipt-bottom-logo">
            ${bottomLogo ? `<img class="logo" src="${escapeHtml(bottomLogo)}" alt="${escapeHtml(storeName)}" />` : ""}
          </div>
          </div>
        </div>
      </body>
    </html>`;
}
