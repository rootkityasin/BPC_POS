"use client";

import { calculateVatInclusiveTotals } from "@/modules/pos/vat";
import { useActionState, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Plus, Printer, Receipt, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { saveDeviceSettings } from "./actions";

const INITIAL_ACTION_STATE = { status: "idle", message: "" };

function buildPrinterClientKey(printer, index) {
  return printer?.id || `printer-${index + 1}`;
}

function buildInitialState(settings) {
  const printers = (settings?.printers || []).map((printer, index) => ({
    id: printer.id,
    clientKey: buildPrinterClientKey(printer, index),
    name: printer.name || "",
    printerModel: printer.printerModel || "",
    printerConnection: printer.printerConnection || "USB",
    printerTarget: printer.printerTarget || "",
    printerStatus: printer.printerStatus || "DISCONNECTED"
  }));

  const defaultPrinterKey = settings?.defaultPrinterId
    ? printers.find((printer) => printer.id === settings.defaultPrinterId)?.clientKey || ""
    : printers[0]?.clientKey || "";

  return {
    timezone: settings?.timezone || "Asia/Dhaka",
    defaultPrinterKey,
    receiptTheme: settings?.receiptTheme || "modern",
    receiptFontSize: settings?.receiptFontSize || 14,
    receiptAccentColor: settings?.receiptAccentColor || "#ff242d",
    receiptPaperWidth: settings?.receiptPaperWidth || "80mm",
    receiptHeaderText: settings?.receiptHeaderText || "",
    receiptFooterText: settings?.receiptFooterText || "",
    receiptShowLogo: Boolean(settings?.receiptShowLogo),
    receiptShowSeller: Boolean(settings?.receiptShowSeller),
    receiptShowBuyer: Boolean(settings?.receiptShowBuyer),
    receiptShowOrderStatus: Boolean(settings?.receiptShowOrderStatus),
    receiptShowItemNotes: Boolean(settings?.receiptShowItemNotes),
    receiptShowQr: Boolean(settings?.receiptShowQr),
    receiptShowSign: Boolean(settings?.receiptShowSign),
    receiptWatermark: settings?.receiptWatermark ?? 0.1,
    printers
  };
}

function StatusToast({ state }) {
  if (state.status === "idle") return null;

  const isError = state.status === "error";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${isError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
      <div className="flex items-center gap-2 font-medium">
        {isError ? <CircleAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        <span>{state.message}</span>
      </div>
    </div>
  );
}

function ReceiptPreview({ storeName, settings }) {
  const sampleItems = [
    { name: "Chicken Fried Rice", quantity: 2, price: 280, note: "Extra spicy" },
    { name: "Soft Drink", quantity: 1, price: 80, note: "" }
  ];
  const grossAmount = sampleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const { subtotalAmount, vatAmount, totalAmount } = calculateVatInclusiveTotals(grossAmount, 5);
  const paperClass = settings.receiptPaperWidth === "58mm" ? "max-w-[290px]" : "max-w-[360px]";
  const themeClass = settings.receiptTheme === "classic"
    ? "border-[#e2d7c0] bg-[#fffdf7]"
    : settings.receiptTheme === "minimal"
      ? "border-slate-200 bg-white"
      : "border-rose-200 bg-gradient-to-b from-white to-rose-50";

  return (
    <div className={`mx-auto rounded-[30px] border p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${paperClass} ${themeClass}`} style={{ fontSize: `${settings.receiptFontSize}px` }}>
      <div className="relative overflow-hidden rounded-[22px] border border-dashed border-slate-200 bg-white px-5 py-6">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl font-black" style={{ color: settings.receiptAccentColor, opacity: settings.receiptWatermark }}>
          {storeName}
        </div>
        <div className="relative z-10">
          {settings.receiptShowLogo ? (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white">BPC</div>
          ) : null}
          <div className="text-center">
            <div className="text-xl font-black" style={{ color: settings.receiptAccentColor }}>{storeName}</div>
            {settings.receiptShowSeller ? <div className="mt-1 text-xs text-slate-500">House 12, Dhaka</div> : null}
            {settings.receiptHeaderText ? <div className="mt-2 text-xs text-slate-500">{settings.receiptHeaderText}</div> : null}
          </div>

          <div className="mt-5 space-y-1 text-sm text-slate-600">
            <div><span className="font-semibold text-slate-900">Invoice:</span> INV-20260411-0001</div>
            {settings.receiptShowBuyer ? <div><span className="font-semibold text-slate-900">Customer:</span> Walk-in customer</div> : null}
            {settings.receiptShowBuyer ? <div><span className="font-semibold text-slate-900">Phone:</span> 01700000000</div> : null}
            {settings.receiptShowOrderStatus ? <div><span className="font-semibold text-slate-900">Status:</span> PENDING</div> : null}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="grid grid-cols-[minmax(0,1fr)_50px_80px] gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <div>Item</div>
              <div className="text-center">Qty</div>
              <div className="text-right">Price</div>
            </div>
            <div className="mt-3 space-y-3">
              {sampleItems.map((item) => (
                <div key={item.name} className="grid grid-cols-[minmax(0,1fr)_50px_80px] gap-3 text-sm text-slate-700">
                  <div>
                    <div>{item.name}</div>
                    {settings.receiptShowItemNotes && item.note ? <div className="mt-1 text-xs text-slate-400">Note: {item.note}</div> : null}
                  </div>
                  <div className="text-center">{item.quantity}</div>
                  <div className="text-right">{(item.price * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-700">
            <div className="flex justify-between"><span>Items Total</span><span>{grossAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Less Included VAT</span><span>-{vatAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Subtotal</span><span>{subtotalAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>VAT (5.00%)</span><span>{vatAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-base font-black text-slate-900"><span>Total</span><span>{totalAmount.toFixed(2)}</span></div>
          </div>

          {settings.receiptShowQr ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-center text-xs text-slate-500">QR: INV-20260411-0001</div> : null}
          {settings.receiptShowSign ? <div className="mt-5 border-t border-dashed border-slate-300 pt-4 text-xs text-slate-500">Authorized signature: ____________________</div> : null}
          {settings.receiptFooterText ? <div className="mt-5 text-center text-xs text-slate-500">{settings.receiptFooterText}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function DeviceSettingsClient({ settings, canEdit, storeName }) {
  const [state, formAction, pending] = useActionState(saveDeviceSettings, INITIAL_ACTION_STATE);
  const [formState, setFormState] = useState(() => buildInitialState(settings));

  useEffect(() => {
    setFormState(buildInitialState(settings));
  }, [settings]);

  const printersJson = useMemo(() => JSON.stringify(formState.printers), [formState.printers]);

  function updatePrinter(clientKey, patch) {
    setFormState((current) => ({
      ...current,
      printers: current.printers.map((printer) => printer.clientKey === clientKey ? { ...printer, ...patch } : printer)
    }));
  }

  function addPrinter() {
    const nextKey = `new-${Date.now()}`;
    setFormState((current) => ({
      ...current,
      defaultPrinterKey: current.defaultPrinterKey || nextKey,
      printers: [
        ...current.printers,
        {
          id: "",
          clientKey: nextKey,
          name: "",
          printerModel: "",
          printerConnection: "USB",
          printerTarget: "",
          printerStatus: "DISCONNECTED"
        }
      ]
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Device Settings</h2>
        <p className="text-sm text-slate-500">Configure receipt branding, live invoice formatting, and store printer connections.</p>
      </div>

      <StatusToast state={state} />

      <form action={formAction} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-[#ff242d]" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Receipt Editor</h3>
                <p className="text-sm text-slate-500">Update layout, branding, and receipt visibility controls for this store.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Timezone</span>
                <select name="timezone" value={formState.timezone} disabled={!canEdit} onChange={(event) => setFormState((current) => ({ ...current, timezone: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <option value="Asia/Dhaka">Asia/Dhaka</option>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="UTC">UTC</option>
                </select>
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Receipt Theme</span>
                <select name="receiptTheme" value={formState.receiptTheme} disabled={!canEdit} onChange={(event) => setFormState((current) => ({ ...current, receiptTheme: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <option value="modern">Modern</option>
                  <option value="minimal">Minimal</option>
                  <option value="classic">Classic</option>
                </select>
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Font Size</span>
                <input name="receiptFontSize" type="number" min="10" max="18" value={formState.receiptFontSize} disabled={!canEdit} onChange={(event) => setFormState((current) => ({ ...current, receiptFontSize: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Accent Color</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <input name="receiptAccentColor" type="color" value={formState.receiptAccentColor} disabled={!canEdit} onChange={(event) => setFormState((current) => ({ ...current, receiptAccentColor: event.target.value }))} className="h-8 w-10 rounded border-0 bg-transparent p-0" />
                  <input value={formState.receiptAccentColor} disabled={!canEdit} onChange={(event) => setFormState((current) => ({ ...current, receiptAccentColor: event.target.value }))} className="w-full border-0 p-0 text-sm outline-none" />
                </div>
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Paper Width</span>
                <select name="receiptPaperWidth" value={formState.receiptPaperWidth} disabled={!canEdit} onChange={(event) => setFormState((current) => ({ ...current, receiptPaperWidth: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <option value="80mm">80mm</option>
                  <option value="58mm">58mm</option>
                </select>
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Watermark Opacity</span>
                <input name="receiptWatermark" type="number" min="0" max="1" step="0.05" value={formState.receiptWatermark} disabled={!canEdit} onChange={(event) => setFormState((current) => ({ ...current, receiptWatermark: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>

              <label className="block text-sm text-slate-700 md:col-span-2">
                <span className="mb-2 block font-medium">Header Text</span>
                <textarea name="receiptHeaderText" rows="2" value={formState.receiptHeaderText} disabled={!canEdit} onChange={(event) => setFormState((current) => ({ ...current, receiptHeaderText: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Welcome message, tax notice, or service line" />
              </label>

              <label className="block text-sm text-slate-700 md:col-span-2">
                <span className="mb-2 block font-medium">Footer Text</span>
                <textarea name="receiptFooterText" rows="2" value={formState.receiptFooterText} disabled={!canEdit} onChange={(event) => setFormState((current) => ({ ...current, receiptFooterText: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Thank you note, refund policy, or contact details" />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-700">
              {[
                ["receiptShowLogo", "Show Logo"],
                ["receiptShowSeller", "Show Seller Details"],
                ["receiptShowBuyer", "Show Buyer Details"],
                ["receiptShowOrderStatus", "Show Order Status"],
                ["receiptShowItemNotes", "Show Item Notes"],
                ["receiptShowQr", "Show QR"],
                ["receiptShowSign", "Show Signature Area"]
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                  <input
                    name={key}
                    type="checkbox"
                    checked={Boolean(formState[key])}
                    disabled={!canEdit}
                    onChange={(event) => setFormState((current) => ({ ...current, [key]: event.target.checked }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Printer className="h-5 w-5 text-[#ff242d]" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Printer Connections</h3>
                  <p className="text-sm text-slate-500">Register printer endpoints for this store and choose the default invoice printer.</p>
                </div>
              </div>
              {canEdit ? (
                <Button type="button" variant="outline" className="rounded-2xl" onClick={addPrinter}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Printer
                </Button>
              ) : null}
            </div>

            <input type="hidden" name="printers" value={printersJson} />
            <input type="hidden" name="defaultPrinterKey" value={formState.defaultPrinterKey} />

            <label className="block text-sm text-slate-700">
              <span className="mb-2 block font-medium">Default Printer</span>
              <select value={formState.defaultPrinterKey} disabled={!canEdit || formState.printers.length === 0} onChange={(event) => setFormState((current) => ({ ...current, defaultPrinterKey: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <option value="">No default printer</option>
                {formState.printers.map((printer) => (
                  <option key={printer.clientKey} value={printer.clientKey}>{printer.name || "Untitled printer"}</option>
                ))}
              </select>
            </label>

            <div className="space-y-4">
              {formState.printers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">No printer configured yet.</div>
              ) : formState.printers.map((printer) => (
                <div key={printer.clientKey} className="grid gap-4 rounded-3xl border border-slate-200 p-5 md:grid-cols-2">
                  <label className="block text-sm text-slate-700">
                    <span className="mb-2 block font-medium">Printer Name</span>
                    <input value={printer.name} disabled={!canEdit} onChange={(event) => updatePrinter(printer.clientKey, { name: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Front Desk Printer" />
                  </label>
                  <label className="block text-sm text-slate-700">
                    <span className="mb-2 block font-medium">Printer Model</span>
                    <input value={printer.printerModel} disabled={!canEdit} onChange={(event) => updatePrinter(printer.clientKey, { printerModel: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Epson TM-T82X" />
                  </label>
                  <label className="block text-sm text-slate-700">
                    <span className="mb-2 block font-medium">Connection Type</span>
                    <select value={printer.printerConnection} disabled={!canEdit} onChange={(event) => updatePrinter(printer.clientKey, { printerConnection: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <option value="USB">USB</option>
                      <option value="LAN">LAN</option>
                      <option value="Bluetooth">Bluetooth</option>
                      <option value="Cloud">Cloud</option>
                    </select>
                  </label>
                  <label className="block text-sm text-slate-700">
                    <span className="mb-2 block font-medium">Target / Queue</span>
                    <input value={printer.printerTarget} disabled={!canEdit} onChange={(event) => updatePrinter(printer.clientKey, { printerTarget: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="usb://receipt-printer or 192.168.1.50" />
                  </label>
                  <label className="block text-sm text-slate-700 md:col-span-2">
                    <span className="mb-2 block font-medium">Status</span>
                    <select value={printer.printerStatus} disabled={!canEdit} onChange={(event) => updatePrinter(printer.clientKey, { printerStatus: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <option value="CONNECTED">Connected</option>
                      <option value="DISCONNECTED">Disconnected</option>
                      <option value="MAINTENANCE">Maintenance</option>
                    </select>
                  </label>
                </div>
              ))}
            </div>
          </Card>

          {canEdit ? (
            <div className="flex justify-end">
              <Button type="submit" disabled={pending} className="rounded-2xl px-6 py-3">
                <Save className="mr-2 h-4 w-4" />
                {pending ? "Saving..." : "Save Device Settings"}
              </Button>
            </div>
          ) : null}
        </div>

        <Card className="p-6">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900">Live Receipt Preview</h3>
            <p className="text-sm text-slate-500">Preview updates instantly as you edit the receipt layout.</p>
          </div>
          <ReceiptPreview storeName={storeName} settings={formState} />
        </Card>
      </form>
    </div>
  );
}
