import { formatCurrency } from "@/lib/utils";
import { calculateVatExclusiveUnitPrice } from "@/modules/pos/vat";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getReceiptSettingsFromStore(store) {
  return {
    theme: store?.receiptTheme || "modern",
    fontSize: Number(store?.receiptFontSize || 14),
    accentColor: store?.receiptAccentColor || "#ff242d",
    paperWidth: store?.receiptPaperWidth || "80mm",
    headerText: store?.receiptHeaderText || "",
    footerText: store?.receiptFooterText || "",
    showLogo: Boolean(store?.receiptShowLogo),
    showSeller: Boolean(store?.receiptShowSeller),
    showBuyer: Boolean(store?.receiptShowBuyer),
    showOrderStatus: Boolean(store?.receiptShowOrderStatus),
    showItemNotes: Boolean(store?.receiptShowItemNotes),
    showQr: Boolean(store?.receiptShowQr),
    showSign: Boolean(store?.receiptShowSign),
    watermark: Number(store?.receiptWatermark || 0.1)
  };
}

function buildThemeStyles(settings) {
  if (settings.theme === "classic") {
    return {
      container: "background:#fffdf7;border:1px solid #e2d7c0;border-radius:12px;",
      title: `color:${settings.accentColor};letter-spacing:0.08em;text-transform:uppercase;`
    };
  }

  if (settings.theme === "minimal") {
    return {
      container: "background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;",
      title: "color:#0f172a;letter-spacing:0.02em;"
    };
  }

  return {
    container: "background:linear-gradient(180deg,#ffffff 0%,#fff7f7 100%);border:1px solid #fecdd3;border-radius:18px;",
    title: `color:${settings.accentColor};letter-spacing:0.04em;`
  };
}

export function buildReceiptHtml(order, t, getItemLabel, options = {}) {
  const settings = getReceiptSettingsFromStore(order.store);
  const themeStyles = buildThemeStyles(settings);
  const rows = order.items
    .map((item) => {
      const netUnitPrice = calculateVatExclusiveUnitPrice(item.unitPrice, order.vatPercentage || 0);
      const noteRow = settings.showItemNotes && item.note
        ? `<div style="margin-top:4px;font-size:11px;color:#64748b;">Note: ${escapeHtml(item.note)}</div>`
        : "";

      return `
        <tr>
          <td style="padding:8px 0;vertical-align:top;">
            <div>${escapeHtml(getItemLabel(item))}</div>
            <div style="margin-top:4px;font-size:11px;color:#64748b;">Gross ${escapeHtml(formatCurrency(item.unitPrice))} • Net ${escapeHtml(formatCurrency(netUnitPrice))}</div>
            ${noteRow}
          </td>
          <td style="padding:8px 0; text-align:center;vertical-align:top;">${item.quantity}</td>
          <td style="padding:8px 0; text-align:right;vertical-align:top;">${escapeHtml(formatCurrency(item.unitPrice))}</td>
        </tr>`;
    })
    .join("");
  const storeName = order.store?.nameEn || "Store";
  const storeLocation = order.store?.location || "";
  const storeLogo = order.store?.logoUrl || "";
  const vatLabel = `VAT (${Number(order.vatPercentage || 0).toFixed(2)}%)`;
  const receiptPaperWidth = options.paperWidthOverride || settings.paperWidth;
  const paperWidth = receiptPaperWidth === "58mm" ? "280px" : "360px";

  return `<!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(order.invoiceNumber)}</title>
        <meta charset="utf-8" />
      </head>
      <body style="font-family: Arial, sans-serif; margin: 24px; color: #0f172a; background:#f8fafc;">
        <div style="max-width:${paperWidth}; margin: 0 auto; padding:20px; ${themeStyles.container} font-size:${settings.fontSize}px; position:relative; overflow:hidden;">
          <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; opacity:${settings.watermark}; font-size:42px; font-weight:800; color:${settings.accentColor}; transform:rotate(-18deg);">${escapeHtml(storeName)}</div>
          <div style="position:relative; z-index:1;">
            ${settings.showLogo && storeLogo ? `<div style="text-align:center; margin-bottom: 12px;"><img src="${escapeHtml(storeLogo)}" alt="${escapeHtml(storeName)}" style="width:72px; height:72px; object-fit:cover; border-radius:18px;" /></div>` : ""}
            <div style="text-align:center; margin-bottom: 16px;">
              <div style="font-size: 20px; font-weight: 800; ${themeStyles.title}">${escapeHtml(storeName)}</div>
              ${settings.showSeller && storeLocation ? `<div style="margin-top:4px; font-size:12px; color:#475569;">${escapeHtml(storeLocation)}</div>` : ""}
              ${settings.showSeller && order.vatNumber ? `<div style="margin-top:4px; font-size:12px; color:#475569;">VAT No: ${escapeHtml(order.vatNumber)}</div>` : ""}
              ${settings.headerText ? `<div style="margin-top:8px; font-size:12px; color:#475569;">${escapeHtml(settings.headerText)}</div>` : ""}
            </div>
            <h1 style="font-size: 22px; margin: 0 0 8px;">${escapeHtml(t("orders.receiptTitle"))}</h1>
            <p style="margin: 0 0 6px; font-size: 13px;"><strong>${escapeHtml(t("orders.invoice"))}:</strong> ${escapeHtml(order.invoiceNumber)}</p>
            ${settings.showBuyer ? `<p style="margin: 0 0 6px; font-size: 13px;"><strong>${escapeHtml(t("orders.customer"))}:</strong> ${escapeHtml(order.customerName || t("orders.walkIn"))}</p>` : ""}
            ${settings.showBuyer ? `<p style="margin: 0 0 6px; font-size: 13px;"><strong>${escapeHtml(t("orders.customerPhone"))}:</strong> ${escapeHtml(order.customerPhone || t("orders.noCustomerPhone"))}</p>` : ""}
            ${settings.showOrderStatus ? `<p style="margin: 0 0 6px; font-size: 13px;"><strong>${escapeHtml(t("orders.status"))}:</strong> ${escapeHtml(order.status || "PENDING")}</p>` : ""}
            <p style="margin: 0 0 16px; font-size: 13px;"><strong>${escapeHtml(t("orders.createdAt"))}:</strong> ${escapeHtml(new Date(order.createdAt).toLocaleString())}</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr>
                  <th style="border-bottom: 1px solid #cbd5e1; padding: 8px 0; text-align: left;">${escapeHtml(t("common.name"))}</th>
                  <th style="border-bottom: 1px solid #cbd5e1; padding: 8px 0; text-align: center;">${escapeHtml(t("common.quantity"))}</th>
                  <th style="border-bottom: 1px solid #cbd5e1; padding: 8px 0; text-align: right;">${escapeHtml(t("common.price"))}</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="margin-top: 16px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 13px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Items Total</span><strong>${escapeHtml(formatCurrency((order.subtotalAmount || 0) + (order.vatAmount || 0)))}</strong></div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Less Included VAT</span><strong>-${escapeHtml(formatCurrency(order.vatAmount || 0))}</strong></div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>${escapeHtml(t("pos.subtotal", { defaultValue: "Subtotal" }))}</span><strong>${escapeHtml(formatCurrency(order.subtotalAmount || 0))}</strong></div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>${escapeHtml(vatLabel)}</span><strong>${escapeHtml(formatCurrency(order.vatAmount || 0))}</strong></div>
              <div style="display:flex; justify-content:space-between; font-weight: bold; font-size: 15px;"><span>${escapeHtml(t("orders.total"))}</span><span>${escapeHtml(formatCurrency(order.totalAmount))}</span></div>
            </div>
            ${settings.showQr ? `<div style="margin-top:16px;border:1px dashed #cbd5e1;border-radius:12px;padding:12px;text-align:center;font-size:11px;color:#475569;">QR: ${escapeHtml(order.invoiceNumber)}</div>` : ""}
            ${settings.showSign ? `<div style="margin-top:20px;padding-top:14px;border-top:1px dashed #cbd5e1;font-size:12px;color:#475569;">Authorized signature: ____________________</div>` : ""}
            ${settings.footerText ? `<div style="margin-top:16px;text-align:center;font-size:12px;color:#64748b;">${escapeHtml(settings.footerText)}</div>` : ""}
          </div>
        </div>
      </body>
    </html>`;
}
