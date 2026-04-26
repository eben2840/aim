import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { PlusIcon, EyeIcon } from "../../icons";
import { purchaseOrdersApi, suppliersApi, locationsApi, productsApi } from "../../api";
import type { PurchaseOrder, POStatus, Supplier, Location, Product } from "../../types";

const STATUS_COLORS: Record<POStatus, "light" | "warning" | "info" | "success" | "error"> = {
  draft: "light",
  sent: "info",
  partial: "warning",
  received: "success",
  cancelled: "error",
};

interface NewPOLine { productId: string; quantity: string; unitCost: string; }

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);

  const [poForm, setPoForm] = useState({
    supplierId: "",
    locationId: "",
    expectedDeliveryDate: "",
  });
  const [lines, setLines] = useState<NewPOLine[]>([{ productId: "", quantity: "", unitCost: "" }]);

  const PAGE_SIZE = 10;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await purchaseOrdersApi.list({ page, status: statusFilter || undefined });
      setOrders(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const fetchRefs = useCallback(async () => {
    try {
      const [sups, locs, prods] = await Promise.all([
        suppliersApi.list(),
        locationsApi.list(),
        productsApi.list(),
      ]);
      setSuppliers(sups.data);
      setLocations(locs);
      setProducts(prods.data);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchRefs(); }, [fetchRefs]);

  const openCreate = () => {
    setPoForm({ supplierId: "", locationId: "", expectedDeliveryDate: "" });
    setLines([{ productId: "", quantity: "", unitCost: "" }]);
    setShowModal(true);
  };

  const addLine = () => setLines((l) => [...l, { productId: "", quantity: "", unitCost: "" }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof NewPOLine, value: string) => {
    setLines((l) => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));
  };

  const handleCreate = async () => {
    if (!poForm.supplierId || !poForm.locationId) return;
    const validLines = lines.filter((l) => l.productId && l.quantity);
    if (!validLines.length) return;

    setSaving(true);
    try {
      await purchaseOrdersApi.create({
        supplierId: poForm.supplierId,
        locationId: poForm.locationId,
        expectedDeliveryDate: poForm.expectedDeliveryDate || undefined,
        lines: validLines.map((l) => ({
          id: "",
          productId: l.productId,
          productName: products.find((p) => p.id === l.productId)?.name ?? "",
          sku: products.find((p) => p.id === l.productId)?.sku ?? "",
          quantity: parseInt(l.quantity, 10),
          unitCost: parseFloat(l.unitCost) || 0,
          receivedQuantity: 0,
        })),
        totalAmount: validLines.reduce((sum, l) => sum + (parseFloat(l.unitCost) || 0) * (parseInt(l.quantity, 10) || 0), 0),
      });
      setShowModal(false);
      fetchOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create PO");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <PageMeta title="Purchase Orders | AbiTrack" description="Manage supplier purchase orders" />
      <PageBreadCrumb pageTitle="Purchase Orders" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 px-6 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Purchase Orders
            {!loading && <span className="ml-2 text-sm font-normal text-gray-500">{total} total</span>}
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {(["draft","sent","partial","received","cancelled"] as POStatus[]).map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              <PlusIcon className="w-4 h-4" /> New PO
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
              <p className="text-sm text-error-600">{error}</p>
              <button onClick={fetchOrders} className="mt-3 text-sm text-brand-500 underline">Retry</button>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No purchase orders found.{" "}
              <button onClick={openCreate} className="text-brand-500 underline">Create one</button>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {["PO #", "Supplier", "Location", "Expected", "Total", "Status", "Created", ""].map((h) => (
                      <TableCell key={h} isHeader className="py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {orders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="py-3 text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{po.orderNumber}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-700 dark:text-gray-300">{po.supplierName}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{po.locationName ?? "—"}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                        {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                        ${po.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge size="sm" color={STATUS_COLORS[po.status]}>
                          {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-gray-400">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-3">
                        <button onClick={() => setShowDetail(po)} className="p-1 text-gray-400 hover:text-brand-500">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-sm text-gray-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700">Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create PO Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">New Purchase Order</h3>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Supplier *</label>
                <select value={poForm.supplierId} onChange={(e) => setPoForm((f) => ({ ...f, supplierId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select supplier…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Deliver to *</label>
                <select value={poForm.locationId} onChange={(e) => setPoForm((f) => ({ ...f, locationId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select location…</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Expected Delivery Date</label>
                <input type="date" value={poForm.expectedDeliveryDate}
                  onChange={(e) => setPoForm((f) => ({ ...f, expectedDeliveryDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Line Items</h4>
            <div className="space-y-3 mb-4">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <label className="mb-1 block text-xs text-gray-500">Product</label>
                    <select value={line.productId} onChange={(e) => updateLine(i, "productId", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none">
                      <option value="">Select…</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="mb-1 block text-xs text-gray-500">Quantity</label>
                    <input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)}
                      placeholder="0" className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none" />
                  </div>
                  <div className="col-span-3">
                    <label className="mb-1 block text-xs text-gray-500">Unit Cost ($)</label>
                    <input type="number" min="0" step="0.01" value={line.unitCost} onChange={(e) => updateLine(i, "unitCost", e.target.value)}
                      placeholder="0.00" className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(i)} className="text-error-400 hover:text-error-600 text-lg leading-none">×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addLine} className="mb-5 text-sm text-brand-500 hover:text-brand-600">+ Add line</button>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving || !poForm.supplierId || !poForm.locationId}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50">
                {saving ? "Creating…" : "Create PO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{showDetail.orderNumber}</h3>
                <p className="text-sm text-gray-500">{showDetail.supplierName}</p>
              </div>
              <Badge color={STATUS_COLORS[showDetail.status]}>{showDetail.status}</Badge>
            </div>
            <div className="space-y-2 mb-5">
              {showDetail.lines.map((l, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{l.productName}</p>
                    <p className="text-xs text-gray-400">{l.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{l.quantity} × ${l.unitCost.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Received: {l.receivedQuantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">Total: ${showDetail.totalAmount.toFixed(2)}</span>
              <button onClick={() => setShowDetail(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
