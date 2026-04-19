import { formatCurrency } from "@/lib/utils";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatReceiptDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.toLocaleDateString("en-US", { day: "2-digit" });
  const year = date.toLocaleDateString("en-US", { year: "numeric" });
  const time = date.toLocaleTimeString("en-US", {
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

export function getReceiptSettingsFromStore(store) {
  return {
    theme: store?.receiptTheme || "modern",
    fontSize: Number(store?.receiptFontSize || 14),
    accentColor: store?.receiptAccentColor || "#2771cb",
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

export function buildReceiptHtml(order, t, getItemLabel, options = {}) {
  const settings = getReceiptSettingsFromStore(order.store);
  const rows = order.items
    .map((item) => {
      const name = escapeHtml(getItemLabel(item));
      const quantity = `x${escapeHtml(item.quantity)}`;
      const price = escapeHtml(formatCurrency(Number(item.unitPrice || 0) * Number(item.quantity || 0)));

      return `
        <tr>
          <td style="padding:3px 0 2px 0;vertical-align:top;">
            <div style="font-size:18px;line-height:1.15;color:#4b5563;">${name}</div>
            ${settings.showItemNotes && item.note ? `<div style="margin-top:3px;font-size:11px;color:#6b7280;">${escapeHtml(item.note)}</div>` : ""}
          </td>
          <td style="padding:3px 0 2px 0;vertical-align:top;text-align:center;width:56px;font-size:18px;line-height:1.15;color:#1f2937;">${quantity}</td>
          <td style="padding:3px 0 2px 0;vertical-align:top;text-align:right;width:92px;font-size:18px;line-height:1.15;color:#1f2937;">${price}</td>
        </tr>`;
    })
    .join("");
  const storeName = order.store?.nameEn || "Store";
  const storeLogo = order.store?.logoUrl || "";
  const receiptPaperWidth = options.paperWidthOverride || settings.paperWidth;
  const paperWidth = receiptPaperWidth === "58mm" ? "300px" : "380px";
  const ticketDate = formatReceiptDate(order.createdAt);
  const paymentType = String(order.paymentMethod || "cash").toUpperCase();
  const customerName = formatReceiptField(order.customerName);
  const customerPhone = formatReceiptField(order.customerPhone);
  const operatorName = order.createdBy || order.cashierName || order.operatorName || order.user?.name || "Ade";
  const invoiceNumber = String(order.invoiceNumber || "");
  const invoiceFontSize = receiptPaperWidth === "58mm" ? 18 : 20;

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
            background: #ffffff;
            color: #111111;
            font-family: "Courier New", Courier, monospace;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt {
            width: ${paperWidth};
            margin: 0 auto;
            padding: 18px 18px 20px;
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
            font-size: 13px;
            line-height: 1.4;
            color: #111111;
            letter-spacing: 0.01em;
          }
          .order-box {
            margin-top: 14px;
            border: 2px dashed #262626;
            border-radius: 14px;
            padding: 12px 10px 14px;
            text-align: center;
          }
          .order-label {
            display: inline-block;
            padding: 0 12px;
            background: #ffffff;
            position: relative;
            top: -24px;
            font-size: 18px;
            letter-spacing: 0.2em;
            color: #111111;
            text-transform: none;
            font-weight: 700;
          }
          .order-number {
            margin-top: -10px;
            font-size: ${invoiceFontSize}px;
            font-weight: 700;
            letter-spacing: 0.03em;
            color: #111111;
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
            font-size: 18px;
            line-height: 1.45;
          }
          .label {
            color: #7b7b7b;
          }
          .value {
            color: #111111;
            text-align: right;
            white-space: nowrap;
          }
          .sep {
            margin: 16px 0;
            border-top: 2px dotted #b8b8b8;
          }
          .items-head {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 18px;
            line-height: 1.35;
            color: #7b7b7b;
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
          .totals .line { font-size: 18px; }
          .totals .total {
            font-size: 19px;
            font-weight: 400;
          }
          .operator {
            margin-top: 20px;
            padding-top: 18px;
          }
          .footer-note {
            margin-top: 28px;
            text-align: center;
            font-size: 14px;
            line-height: 1.3;
            color: #111111;
            white-space: pre-line;
          }
          .receipt-bottom-logo {
            margin-top: 18px;
            text-align: center;
          }
          .payment-type {
            font-size: 18px;
            letter-spacing: 0.12em;
            color: #111111;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="center">
            ${storeLogo ? `<img class="logo" src="${escapeHtml(storeLogo)}" alt="${escapeHtml(storeName)}" />` : `<div style="height:82px;"></div>`}
            <div class="date">${escapeHtml(ticketDate)}</div>
          </div>

          <div class="order-box">
            <div class="order-label">Order ID</div>
            <div class="order-number">${escapeHtml(invoiceNumber)}</div>
          </div>

          <div class="section">
            <div class="line">
              <div class="label">Payment Type</div>
              <div class="value payment-type">${escapeHtml(paymentType)}</div>
            </div>
          </div>

          <div class="sep"></div>

          <div class="section">
            <div class="line">
              <div class="label">Customer Name</div>
              <div class="value">${escapeHtml(customerName)}</div>
            </div>
            <div class="line" style="margin-top: 6px;">
              <div class="label">Customer Number</div>
              <div class="value">${escapeHtml(customerPhone)}</div>
            </div>
          </div>

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

          <div class="footer-note">Thanks for fueling our passion. Drop by again, if your wallet isn't still sulking. You're always welcome here!</div>

          <div class="receipt-bottom-logo">
            ${storeLogo ? `<img class="logo" src="${escapeHtml(storeLogo)}" alt="${escapeHtml(storeName)}" />` : ""}
          </div>
        </div>
      </body>
    </html>`;
}
