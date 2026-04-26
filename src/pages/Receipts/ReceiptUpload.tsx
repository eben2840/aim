import { useState, useCallback, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { receiptsApi, locationsApi, suppliersApi } from "../../api";
import type { ReceiptLine, Location, Supplier } from "../../types";

type UploadState = "idle" | "uploading" | "review" | "confirming" | "done";

export default function ReceiptUpload() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locationId, setLocationId] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const [receiptId, setReceiptId] = useState("");
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  const [detectedSupplier, setDetectedSupplier] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([locationsApi.list(), suppliersApi.list()])
      .then(([locs, sups]) => {
        setLocations(locs);
        setSuppliers(sups.data);
        if (locs.length) setLocationId(locs[0].id);
      })
      .catch(() => {});
  }, []);

  const handleFile = useCallback((f: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(f.type)) {
      setError("Only JPEG, PNG, WebP, or PDF files are supported.");
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file || !locationId) return;
    setUploadState("uploading");
    setError(null);
    try {
      const result = await receiptsApi.upload(file, locationId);
      setReceiptId(result.receiptId);
      setLines(result.lines);
      setDetectedSupplier(result.supplierName ?? "");
      setUploadState("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadState("idle");
    }
  };

  const updateLine = (i: number, field: keyof ReceiptLine, value: string | number) => {
    setLines((prev) =>
      prev.map((line, idx) => {
        if (idx !== i) return line;
        const updated = { ...line, [field]: value };
        updated.total = (updated.quantity as number) * (updated.unitCost as number);
        return updated;
      })
    );
  };

  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const handleConfirm = async () => {
    setUploadState("confirming");
    setError(null);
    try {
      await receiptsApi.confirm({
        receiptId,
        lines,
        locationId,
        supplierId: supplierId || undefined,
      });
      setUploadState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
      setUploadState("review");
    }
  };

  const reset = () => {
    setFile(null); setLines([]); setReceiptId(""); setDetectedSupplier("");
    setError(null); setUploadState("idle");
  };

  const grandTotal = lines.reduce((sum, l) => sum + l.total, 0);

  if (uploadState === "done") {
    return (
      <>
        <PageMeta title="Receipt Upload | AbiTrack" description="Upload and OCR supplier receipts" />
        <PageBreadCrumb pageTitle="Receipt Upload" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10 mb-4">
            <svg className="w-8 h-8 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-2">Receipt Confirmed!</h2>
          <p className="text-sm text-gray-500 mb-6">Stock has been updated in your inventory.</p>
          <button onClick={reset} className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm text-white hover:bg-brand-600">
            Upload Another
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Receipt Upload | AbiTrack" description="Upload and OCR supplier receipts" />
      <PageBreadCrumb pageTitle="Receipt Upload" />

      <div className="grid grid-cols-12 gap-6">
        {/* Upload Panel */}
        {uploadState !== "review" && uploadState !== "confirming" && (
          <div className="col-span-12 lg:col-span-5">
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
              <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Upload Receipt / Invoice</h2>
              <p className="mb-5 text-sm text-gray-500">Supports JPEG, PNG, WebP, or PDF. Our OCR will extract line items automatically.</p>

              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("receipt-file-input")?.click()}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors
                  ${dragOver ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-gray-200 hover:border-brand-300 dark:border-gray-700"}
                `}
              >
                <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {file ? (
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-500">Drop file here or <span className="text-brand-500">browse</span></p>
                    <p className="text-xs text-gray-400 mt-1">Max 10 MB</p>
                  </>
                )}
              </div>
              <input id="receipt-file-input" type="file" accept="image/*,.pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              {/* Location & Supplier */}
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Receive Into Location *</label>
                  <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select location…</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Supplier (optional)</label>
                  <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Unknown / auto-detect</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {error && <p className="mt-3 text-xs text-error-600 dark:text-error-400">{error}</p>}

              <button
                onClick={handleUpload}
                disabled={!file || !locationId || uploadState === "uploading"}
                className="mt-5 w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {uploadState === "uploading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing with OCR…
                  </span>
                ) : "Upload & Extract"}
              </button>
            </div>
          </div>
        )}

        {/* Review Panel */}
        {(uploadState === "review" || uploadState === "confirming") && (
          <div className="col-span-12">
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Review Extracted Line Items</h2>
                  {detectedSupplier && (
                    <p className="text-sm text-gray-500 mt-0.5">Detected supplier: <span className="font-medium">{detectedSupplier}</span></p>
                  )}
                </div>
                <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  Cancel & restart
                </button>
              </div>

              <div className="px-4 pb-2 overflow-x-auto">
                <Table>
                  <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                    <TableRow>
                      {["Product Name", "SKU", "Quantity", "Unit Cost ($)", "Total", "Matched", ""].map((h) => (
                        <TableCell key={h} isHeader className="py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {lines.map((line, i) => (
                      <TableRow key={i}>
                        <TableCell className="py-2">
                          <input value={line.productName} onChange={(e) => updateLine(i, "productName", e.target.value)}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500" />
                        </TableCell>
                        <TableCell className="py-2">
                          <input value={line.sku ?? ""} onChange={(e) => updateLine(i, "sku", e.target.value)}
                            className="w-24 rounded border border-gray-200 px-2 py-1 text-xs font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none" />
                        </TableCell>
                        <TableCell className="py-2">
                          <input type="number" min="0" value={line.quantity}
                            onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 0)}
                            className="w-20 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none" />
                        </TableCell>
                        <TableCell className="py-2">
                          <input type="number" min="0" step="0.01" value={line.unitCost}
                            onChange={(e) => updateLine(i, "unitCost", parseFloat(e.target.value) || 0)}
                            className="w-24 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none" />
                        </TableCell>
                        <TableCell className="py-2 text-sm font-medium text-gray-800 dark:text-white/90">
                          ${line.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2">
                          {line.matched ? (
                            <span className="text-xs text-success-500">Matched</span>
                          ) : (
                            <span className="text-xs text-warning-500">New SKU</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <button onClick={() => removeLine(i)} className="text-gray-400 hover:text-error-500 text-lg leading-none">×</button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-6 py-4">
                <div className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Grand Total: <span className="text-brand-500">${grandTotal.toFixed(2)}</span>
                  <span className="ml-3 text-xs font-normal text-gray-400">{lines.length} items</span>
                </div>
                <div className="flex gap-3">
                  {error && <p className="text-xs text-error-600 self-center">{error}</p>}
                  <button onClick={reset}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
                    Cancel
                  </button>
                  <button onClick={handleConfirm} disabled={uploadState === "confirming" || lines.length === 0}
                    className="rounded-lg bg-success-500 px-4 py-2 text-sm text-white hover:bg-success-600 disabled:opacity-50">
                    {uploadState === "confirming" ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Confirming…
                      </span>
                    ) : "Confirm & Update Stock"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info card on idle */}
        {uploadState === "idle" && (
          <div className="col-span-12 lg:col-span-7">
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
              <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">How it works</h3>
              <ol className="space-y-4">
                {[
                  ["1", "Upload", "Take a photo or upload a PDF of a supplier invoice or receipt."],
                  ["2", "OCR Extraction", "Our AI extracts product names, quantities, unit costs, and supplier info automatically."],
                  ["3", "Review & Edit", "Review the extracted line items. Edit any incorrect values before confirming."],
                  ["4", "Confirm", "Confirm to automatically update stock levels and create a purchase receipt linked to the supplier."],
                ].map(([num, title, desc]) => (
                  <li key={num} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10 text-sm font-bold text-brand-500">
                      {num}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
