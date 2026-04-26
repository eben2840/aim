import { useConfetti } from "../../hooks/useConfetti";
import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { PlusIcon, PencilIcon, TrashBinIcon } from "../../icons";
import { suppliersApi } from "../../api";
import type { Supplier } from "../../types";

interface SupplierForm {
  name: string; email: string; phone: string; address: string;
  contactPerson: string; leadTimeDays: string; paymentTerms: string;
}

const emptyForm: SupplierForm = {
  name: "", email: "", phone: "", address: "",
  contactPerson: "", leadTimeDays: "7", paymentTerms: "",
};

export default function Suppliers() {
  const { fire } = useConfetti();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const PAGE_SIZE = 10;

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await suppliersApi.list({ page, search: search || undefined });
      setSuppliers(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name, email: s.email ?? "", phone: s.phone ?? "",
      address: s.address ?? "", contactPerson: s.contactPerson ?? "",
      leadTimeDays: String(s.leadTimeDays), paymentTerms: s.paymentTerms ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name, email: form.email || undefined, phone: form.phone || undefined,
        address: form.address || undefined, contactPerson: form.contactPerson || undefined,
        leadTimeDays: parseInt(form.leadTimeDays, 10) || 7,
        paymentTerms: form.paymentTerms || undefined,
      };
      if (editing) await suppliersApi.update(editing.id, payload);
      else { await suppliersApi.create(payload); fire(); }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this supplier?")) return;
    setDeleteId(id);
    try {
      await suppliersApi.delete(id);
      fetchSuppliers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <PageMeta title="Suppliers | AbiTrack" description="Manage your supplier directory" />
      <PageBreadCrumb pageTitle="Suppliers" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 px-6 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Suppliers
            {!loading && <span className="ml-2 text-sm font-normal text-gray-500">{total} total</span>}
          </h2>
          <div className="flex items-center gap-3">
            <input type="text" placeholder="Search suppliers…" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              <PlusIcon className="w-4 h-4" /> Add Supplier
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
              <button onClick={fetchSuppliers} className="mt-3 text-sm text-brand-500 underline">Retry</button>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No suppliers yet. <button onClick={openCreate} className="text-brand-500 underline">Add one</button>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {["Name", "Contact Person", "Email", "Phone", "Lead Time", "Payment Terms", ""].map((h) => (
                      <TableCell key={h} isHeader className="py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="py-3 text-sm font-medium text-gray-800 dark:text-white/90">{s.name}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{s.contactPerson ?? "—"}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{s.email ?? "—"}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{s.phone ?? "—"}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{s.leadTimeDays} days</TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{s.paymentTerms ?? "—"}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(s)} className="p-1 text-gray-400 hover:text-brand-500">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(s.id)} disabled={deleteId === s.id}
                            className="p-1 text-gray-400 hover:text-error-500">
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-sm text-gray-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-gray-700">Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-gray-700">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
              {editing ? "Edit Supplier" : "New Supplier"}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["name", "Name *", "col-span-2"],
                ["contactPerson", "Contact Person", "col-span-1"],
                ["email", "Email", "col-span-1"],
                ["phone", "Phone", "col-span-1"],
                ["leadTimeDays", "Lead Time (days)", "col-span-1"],
                ["paymentTerms", "Payment Terms", "col-span-2"],
                ["address", "Address", "col-span-2"],
              ] as [keyof SupplierForm, string, string][]).map(([field, label, span]) => (
                <div key={field} className={span}>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
                  <input
                    type={field === "leadTimeDays" ? "number" : "text"}
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white disabled:opacity-50">
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
