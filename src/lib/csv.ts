/** Utilitaires d'export (CSV + impression PDF) pour l'espace admin. */

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return "";
  const cols = headers ?? Object.keys(rows[0]!);
  const lines = [cols.join(";")];
  for (const r of rows) lines.push(cols.map((c) => cell(r[c])).join(";"));
  // BOM pour Excel (accents FR)
  return "\uFEFF" + lines.join("\n");
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows);
  if (!csv) return false;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

/** Ouvre une fenêtre d'impression (« Enregistrer au format PDF »). */
export function printPdf(title: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return false;
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) =>
    String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;color:#0b1220}
h1{font-size:18px;margin:0 0 12px}table{border-collapse:collapse;width:100%;font-size:11px}
th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}th{background:#e2e8f0}</style></head>
<body><h1>${esc(title)}</h1><table><thead><tr>${cols
    .map((c) => `<th>${esc(c)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></body></html>`;
  const w = window.open("", "_blank", "width=1024,height=768");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  return true;
}
