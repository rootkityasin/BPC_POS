function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeCsvValue(value) {
  const normalized = String(value ?? "");
  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

export function buildCsvString(rows = []) {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

export function downloadCsv(filename, rows = []) {
  const csv = buildCsvString(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "export.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function openPrintWindow({ title, html }) {
  const popup = window.open("", "_blank", "width=1280,height=900,resizable=yes,scrollbars=yes");
  if (!popup) return null;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.document.title = title || "Report";

  const triggerPrint = () => {
    popup.focus();
    popup.print();
  };

  if (popup.document.readyState === "complete") {
    setTimeout(triggerPrint, 200);
  } else {
    popup.addEventListener("load", triggerPrint, { once: true });
  }

  return popup;
}

export function buildTableSectionHtml({ title, columns = [], rows = [] }) {
  const header = columns.length
    ? `<thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>`
    : "";

  const body = rows.length
    ? `<tbody>${rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`
    : `<tbody><tr><td colspan="${Math.max(1, columns.length)}" class="empty">No data available.</td></tr></tbody>`;

  return `
    <section class="report-section">
      <h2>${escapeHtml(title)}</h2>
      <table>
        ${header}
        ${body}
      </table>
    </section>
  `;
}

export function buildReportHtml({ title, subtitle, metaLines = [], sections = [] }) {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title || "Report")}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        header {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        header p {
          margin: 6px 0 0 0;
          color: #64748b;
          font-size: 14px;
        }
        .meta {
          margin-top: 12px;
          display: grid;
          gap: 4px;
          font-size: 12px;
          color: #475569;
        }
        .report-section {
          margin-bottom: 24px;
        }
        .report-section h2 {
          margin: 0 0 10px 0;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 8px 10px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background: #f8fafc;
          color: #475569;
          font-weight: 600;
        }
        td {
          color: #0f172a;
        }
        .empty {
          text-align: center;
          color: #94a3b8;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      <header>
        <h1>${escapeHtml(title || "Report")}</h1>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        ${metaLines.length ? `<div class="meta">${metaLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>` : ""}
      </header>
      ${sections.join("\n")}
    </body>
  </html>`;
}
