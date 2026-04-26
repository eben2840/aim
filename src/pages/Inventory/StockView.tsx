import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { stockApi, locationsApi } from "../../api";
import type { StockLevel, Location } from "../../types";

interface DeductTarget { stockId: string; productId: string; locationId: string; productName: string; available: number; }

export default function StockView() {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 15;

  const fetchLocations = useCallback(async () => {
    try {
      const locs = await locationsApi.list();
      setLocations(locs);
    } catch {
      // non-fatal
    }
  }, []);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await stockApi.list({
        locationId: selectedLocation || undefined,
        page,
        search: search || undefined,
      });
      setStockLevels(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock data");
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, page, search]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const stockStatus = (qty: number, min: number) => {
    if (qty === 0) return { label: "Out of Stock", color: "error" as const };
    if (qty <= min) return { label: "Low Stock", color: "warning" as const };
    return { label: "In Stock", color: "success" as const };
  };

  const [deductTarget, setDeductTarget] = useState<DeductTarget | null>(null);
  const [deductQty, setDeductQty] = useState("");
  const [deductNote, setDeductNote] = useState("");
  const [deducting, setDeducting] = useState(false);

  const handleDeduct = async () => {
    if (!deductTarget || !deductQty) return;
    setDeducting(true);
    try {
      await stockApi.deduct({ productId: deductTarget.productId, locationId: deductTarget.locationId, quantity: parseInt(deductQty, 10), note: deductNote || undefined });
      setDeductTarget(null);
      setDeductQty("");
      setDeductNote("");
      fetchStock();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deduct stock");
    } finally {
      setDeducting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <PageMeta title="Stock View | AbiTrack" description="Current stock levels by location" />
      <PageBreadCrumb pageTitle="Stock View" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex flex-col gap-3 px-6 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Stock Levels
            {!loading && <span className="ml-2 text-sm font-normal text-gray-500">{total} items</span>}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedLocation}
              onChange={(e) => { setSelectedLocation(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search SKU or name…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={fetchStock}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
              <button onClick={fetchStock} className="mt-3 text-sm text-brand-500 underline">Retry</button>
            </div>
          ) : stockLevels.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500">
              <p className="text-sm">No stock data found for the selected filters.</p>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {["SKU", "Product", "Category", "Location", "On Hand", "Min Level", "Reorder Qty", "Status", ""].map((h) => (
                      <TableCell key={h} isHeader className="py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {stockLevels.map((s) => {
                    const status = stockStatus(s.quantity, s.minStockLevel);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="py-3 text-xs font-mono text-gray-600 dark:text-gray-400">
                          {s.product.sku}
                        </TableCell>
                        <TableCell className="py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                          {s.product.name}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                          {s.product.category}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                          {s.location.name}
                        </TableCell>
                        <TableCell className="py-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                          {s.quantity} {s.product.unit}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                          {s.minStockLevel}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                          {s.reorderQuantity}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge size="sm" color={status.color}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <button
                            onClick={() => setDeductTarget({ stockId: s.id, productId: s.productId, locationId: s.locationId, productName: s.product.name, available: s.quantity })}
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            Deduct
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-sm text-gray-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700">
                  Prev
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {deductTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">Deduct Stock</h3>
            <p className="mb-4 text-sm text-gray-500">{deductTarget.productName} — {deductTarget.available} available</p>
            <input
              type="number"
              min={1}
              max={deductTarget.available}
              placeholder="Quantity to remove"
              value={deductQty}
              onChange={(e) => setDeductQty(e.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={deductNote}
              onChange={(e) => setDeductNote(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeductTarget(null); setDeductQty(""); setDeductNote(""); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400">
                Cancel
              </button>
              <button onClick={handleDeduct} disabled={deducting || !deductQty}
                className="rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white hover:bg-error-700 disabled:opacity-50">
                {deducting ? "Removing…" : "Confirm Deduct"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
