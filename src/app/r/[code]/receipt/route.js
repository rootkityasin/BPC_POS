import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getPublicOrderByCode } from "@/modules/orders/public-order-service";
import { buildReceiptHtml } from "@/modules/receipts/receipt-renderer";

export const dynamic = "force-dynamic";

export async function GET(_, { params }) {
  const order = await getPublicOrderByCode(params?.code);
  if (!order) {
    return new NextResponse("Receipt not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const receiptUrl = `${env.appUrl.replace(/\/$/, "")}/r/${encodeURIComponent(order.receiptPublicCode)}`;
  const html = buildReceiptHtml(order, null, (item) => item.itemName || item.dish?.nameEn || item.stockItem?.name || "Item", {
    paperWidthOverride: order.store?.receiptPaperWidth,
    qrValueOverride: receiptUrl
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
