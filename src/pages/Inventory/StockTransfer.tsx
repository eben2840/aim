import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { stockApi, locationsApi, productsApi } from "../../api";
import type { Location, Product, StockMovement } from "../../types";

export default function StockTransfer() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    productId: "",
    fromLocationId: "",
    toLocationId: "",
    quantity: "",
    note: "",
  });

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [locs, prods] = await Promise.all([
        locationsApi.list(),
        productsApi.list({ page: 1 }),
      ]);
      setLocations(locs);
      setProducts(prods.data);
      if (locs.length >= 1) setForm((f) => ({ ...f, fromLocationId: locs[0].id }));
      if (locs.length >= 2) setForm((f) => ({ ...f, toLocationId: locs[1].id }));
      if (prods.data.length >= 1) setForm((f) => ({ ...f, productId: prods.data[0].id }));
    } catch {
      // non-fatal
    } finally {
      setLoadingData(false);
    }
  }, []);

  const fetchMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const res = await stockApi.movements({ page: 1 });
      setMovements(res.data.filter((m) => m.type === "transfer_in" || m.type === "transfer_out"));
    } catch {
      // non-fatal
    } finally {
      setLoadingMovements(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchMovements();
  }, [fetchData, fetchMovements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.productId || !form.fromLocationId || !form.toLocationId || !form.quantity) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.fromLocationId === form.toLocationId) {
      setError("Source and destination locations must be different.");
      return;
    }
    const qty = parseInt(form.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError("Quantity must be a positive number.");
      return;
    }
    setSubmitting(true);
    try {
      await stockApi.transfer({
        productId: form.productId,
        fromLocationId: form.fromLocationId,
        toLocationId: form.toLocationId,
        quantity: qty,
        note: form.note || undefined,
      });
      setSuccess("Stock transferred successfully.");
      setForm((f) => ({ ...f, quantity: "", note: "" }));
      fetchMovements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  const movementBadge = (type: StockMovement["type"]) => {
    if (type === "transfer_in") return <Badge size="sm" color="success">Transfer In</Badge>;
    if (type === "transfer_out") return <Badge size="sm" color="warning">Transfer Out</Badge>;
    return <Badge size="sm" color="info">{type}</Badge>;
  };

  return (
    <>
      <PageMeta title="Stock Transfer | AbiTrack" description="Move stock between locations" />
      <PageBreadCrumb pageTitle="Stock Transfer" />

      <div className="grid grid-cols-12 gap-6">
        {/* Transfer Form */}
        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
            <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">New Transfer</h2>

            {loadingData ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Product *</label>
                  <select
                    value={form.productId}
                    onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">From Location *</label>
                  <select
                    value={form.fromLocationId}
                    onChange={(e) => setForm((f) => ({ ...f, fromLocationId: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select source…</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">To Location *</label>
                  <select
                    value={form.toLocationId}
                    onChange={(e) => setForm((f) => ({ ...f, toLocationId: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select destination…</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Note</label>
                  <textarea
                    rows={2}
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Optional reason or reference…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {error && <p className="text-xs text-error-600 dark:text-error-400">{error}</p>}
                {success && <p className="text-xs text-success-600 dark:text-success-400">{success}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {submitting ? "Transferring…" : "Transfer Stock"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Recent Transfers */}
        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Transfers</h2>
            </div>
            <div className="px-4 pb-4">
              {loadingMovements ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                </div>
              ) : movements.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">No transfer records yet.</div>
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                      <TableRow>
                        {["Product", "Type", "Qty", "Location", "Date", "By"].map((h) => (
                          <TableCell key={h} isHeader className="py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {movements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="py-3 text-sm text-gray-800 dark:text-white/90">{m.productName}</TableCell>
                          <TableCell className="py-3">{movementBadge(m.type)}</TableCell>
                          <TableCell className="py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{m.quantity}</TableCell>
                          <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{m.locationName ?? "—"}</TableCell>
                          <TableCell className="py-3 text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="py-3 text-xs text-gray-400">{m.createdBy}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
