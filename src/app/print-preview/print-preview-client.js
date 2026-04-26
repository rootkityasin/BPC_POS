"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bluetooth, Printer, Search, Wifi } from "lucide-react";
import { readPrintPreviewPayload } from "@/modules/receipts/print-preview";

const PAPER_OPTIONS = ["58mm", "80mm"];

function buildPrinterResults(printers) {
  return (printers || []).map((printer) => ({
    id: printer.id || printer.code || printer.name,
    name: printer.name || "Unnamed printer",
    connection: printer.printerConnection || "Unknown",
    target: printer.printerTarget || "No target saved",
    status: printer.printerStatus || "DISCONNECTED",
    source: "saved"
  }));
}

export function PrintPreviewClient({ previewKey }) {
  const iframeRef = useRef(null);
  const [payload, setPayload] = useState(null);
  const [paperWidth, setPaperWidth] = useState("58mm");
  const [printerResults, setPrinterResults] = useState([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState("");
  const [scanMessage, setScanMessage] = useState("Saved printers are shown below. Browser Bluetooth scan is attempted when supported.");
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const nextPayload = readPrintPreviewPayload(previewKey);
    setPayload(nextPayload);
    setPrinterResults(buildPrinterResults(nextPayload?.printers));
    setSelectedPrinterId(nextPayload?.printers?.[0]?.id || nextPayload?.printers?.[0]?.code || nextPayload?.printers?.[0]?.name || "");
    if (nextPayload?.defaultPaperWidth && PAPER_OPTIONS.includes(nextPayload.defaultPaperWidth)) {
      setPaperWidth(nextPayload.defaultPaperWidth);
    }
  }, [previewKey]);

  const previewHtml = useMemo(() => {
    if (!payload?.previews) return "";
    return payload.previews[paperWidth] || payload.previews[payload.defaultPaperWidth] || payload.previews["58mm"] || payload.previews["80mm"] || "";
  }, [paperWidth, payload]);

  async function handleScanPrinters() {
    setIsScanning(true);
    const results = buildPrinterResults(payload?.printers);
    let message = "Loaded saved WiFi/LAN/Bluetooth printers from device settings.";

    try {
      if (typeof navigator !== "undefined" && navigator.bluetooth?.requestDevice) {
        const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [] });
        results.push({
          id: `bluetooth-${device.id}`,
          name: device.name || "Bluetooth printer",
          connection: "BLUETOOTH",
          target: device.id,
          status: "CONNECTED",
          source: "browser"
        });
        message = "Saved printers loaded. Bluetooth device scan succeeded. WiFi/LAN discovery in browser is limited to saved printer targets.";
      } else {
        message = "Saved printers loaded. Automatic WiFi/LAN discovery is not available in standard browsers, so saved targets are shown instead.";
      }
    } catch {
      message = "Saved printers loaded. Bluetooth scan was cancelled or unavailable. WiFi/LAN discovery is limited to saved printer targets.";
    } finally {
      setPrinterResults(results);
      setSelectedPrinterId((current) => current || results[0]?.id || "");
      setScanMessage(message);
      setIsScanning(false);
    }
  }

  function handlePrint() {
    iframeRef.current?.contentWindow?.focus();
    window.opener?.postMessage({ type: "bpc-print-confirmed", key: previewKey }, window.location.origin);
    iframeRef.current?.contentWindow?.print();
  }

  if (!payload) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8 text-slate-500">Print preview data was not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6 rounded-[28px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div>
            <div className="text-2xl font-black">{payload.title || "Print Preview"}</div>
            <div className="mt-2 text-sm text-slate-500">Preview, paper selection, and printer targeting before printing.</div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">Receipt Size</label>
            <select value={paperWidth} onChange={(event) => setPaperWidth(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400">
              {PAPER_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Printer Search</div>
                <div className="mt-1 text-xs text-slate-500">Search saved connections and supported browser Bluetooth devices.</div>
              </div>
              <button type="button" onClick={handleScanPrinters} disabled={isScanning} className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                <Search className="mr-2 h-4 w-4" />
                {isScanning ? "Searching..." : "Search"}
              </button>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">{scanMessage}</div>
            <div className="space-y-3">
              {printerResults.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">No printers available yet. Add printers in device settings or use browser Bluetooth scan.</div> : null}
              {printerResults.map((printer) => (
                <label key={printer.id} className={`block rounded-2xl border px-4 py-4 transition-colors ${selectedPrinterId === printer.id ? "border-[#2f6fc6] bg-blue-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start gap-3">
                    <input type="radio" name="selectedPrinter" checked={selectedPrinterId === printer.id} onChange={() => setSelectedPrinterId(printer.id)} className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        {printer.connection === "BLUETOOTH" ? <Bluetooth className="h-4 w-4 text-slate-400" /> : <Wifi className="h-4 w-4 text-slate-400" />}
                        <span>{printer.name}</span>
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{printer.connection} • {printer.status}</div>
                      <div className="mt-2 text-sm text-slate-500">{printer.target}</div>
                      <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{printer.source === "saved" ? "Saved printer" : "Browser scan"}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => window.close()} className="flex-1 rounded-2xl bg-slate-100 px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
            <button type="button" onClick={handlePrint} className="flex-1 rounded-2xl bg-[#2f6fc6] px-5 py-4 text-sm font-semibold text-white hover:bg-[#255ca8]">Print</button>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xl font-bold text-slate-900">Receipt Preview</div>
              <div className="mt-1 text-sm text-slate-500">Scaled to fit the screen while preserving the selected paper width.</div>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{paperWidth}</div>
          </div>
          <div className="flex min-h-[780px] items-start justify-center overflow-auto rounded-[24px] bg-slate-100 p-6">
            <div className={`origin-top scale-[0.92] xl:scale-100 ${paperWidth === "58mm" ? "w-[300px]" : "w-[380px]"}`}>
              <iframe ref={iframeRef} title="Receipt preview" srcDoc={previewHtml} className={`overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-xl ${paperWidth === "58mm" ? "h-[860px] w-[300px]" : "h-[900px] w-[380px]"}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
