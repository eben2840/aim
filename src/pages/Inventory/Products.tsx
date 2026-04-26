import { useState, useEffect, useCallback } from "react";
import { useConfetti } from "../../hooks/useConfetti";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { PlusIcon, PencilIcon, TrashBinIcon } from "../../icons";
import { productsApi } from "../../api";
import type { Product } from "../../types";

const UNITS = ["pcs", "kg", "g", "L", "mL", "box", "pack", "roll", "pair", "set"];

interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  barcode: string;
}

const emptyForm: ProductFormData = {
  sku: "",
  name: "",
  description: "",
  category: "",
  unit: UNITS[0],
  costPrice: "",
  sellingPrice: "",
  barcode: "",
};

export default function Products() {
  const { fire } = useConfetti();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const PAGE_SIZE = 10;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productsApi.list({ page, search: search || undefined });
      setProducts(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    productsApi.categories().then(setCategories).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, category: categories[0] ?? "" });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description ?? "",
      category: p.category,
      unit: p.unit,
      costPrice: String(p.costPrice),
      sellingPrice: String(p.sellingPrice),
      barcode: p.barcode ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sku) return;
    setSaving(true);
    try {
      const payload = {
        sku: form.sku,
        name: form.name,
        description: form.description || undefined,
        category: form.category,
        unit: form.unit,
        costPrice: parseFloat(form.costPrice) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        barcode: form.barcode || undefined,
      };
      if (editing) {
        await productsApi.update(editing.id, payload);
      } else {
        await productsApi.create(payload);
        fire();
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this product?")) return;
    setDeleteId(id);
    try {
      await productsApi.delete(id);
      fetchProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <PageMeta title="Products | AbiTrack" description="Manage your product catalogue and SKUs" />
      <PageBreadCrumb pageTitle="Products" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex flex-col gap-3 px-6 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Products
            {!loading && <span className="ml-2 text-sm font-normal text-gray-500">{total} total</span>}
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            />
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <PlusIcon className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
              <button onClick={fetchProducts} className="mt-3 text-sm text-brand-500 underline">
                Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500">
              <p className="text-sm">No products found.</p>
              <button onClick={openCreate} className="mt-2 text-sm text-brand-500 underline">
                Add your first product
              </button>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {["SKU", "Name", "Category", "Unit", "Cost", "Price", "Stock", ""].map((h) => (
                      <TableCell key={h} isHeader className="py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="py-3 text-xs font-mono text-gray-600 dark:text-gray-400">{p.sku}</TableCell>
                      <TableCell className="py-3 font-medium text-gray-800 dark:text-white/90 text-sm">{p.name}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{p.category}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{p.unit}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">${p.costPrice.toFixed(2)}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-800 dark:text-white/90 font-medium">${p.sellingPrice.toFixed(2)}</TableCell>
                      <TableCell className="py-3">
                        {p.totalStock !== undefined && (
                          <Badge size="sm" color={p.totalStock === 0 ? "error" : p.totalStock < 10 ? "warning" : "success"}>
                            {p.totalStock} {p.unit}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1 text-gray-400 hover:text-brand-500 dark:text-gray-500"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deleteId === p.id}
                            className="p-1 text-gray-400 hover:text-error-500 dark:text-gray-500"
                          >
                            <TrashBinIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-sm text-gray-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
              {editing ? "Edit Product" : "New Product"}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">SKU *</label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Barcode</label>
                <input
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {!form.category && <option value="">Select category</option>}
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Unit</label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Cost Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Selling Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.sku}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
