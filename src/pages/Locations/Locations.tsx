import { useConfetti } from "../../hooks/useConfetti";
import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { PlusIcon, PencilIcon, TrashBinIcon } from "../../icons";
import { locationsApi } from "../../api";
import type { Location } from "../../types";

const TYPE_COLORS = {
  warehouse: "primary" as const,
  store: "success" as const,
  other: "light" as const,
};

interface LocationForm { name: string; address: string; type: Location["type"]; }
const emptyForm: LocationForm = { name: "", address: "", type: "warehouse" };

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const locs = await locationsApi.list();
      setLocations(locs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (l: Location) => {
    setEditing(l);
    setForm({ name: l.name, address: l.address ?? "", type: l.type });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = { name: form.name, address: form.address || undefined, type: form.type };
      if (editing) await locationsApi.update(editing.id, payload);
      else await locationsApi.create(payload);
      setShowModal(false);
      fetchLocations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this location? This will affect all stock associated with it.")) return;
    setDeleteId(id);
    try {
      await locationsApi.delete(id);
      fetchLocations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <>
      <PageMeta title="Locations | AbiTrack" description="Manage warehouses and store locations" />
      <PageBreadCrumb pageTitle="Locations" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 px-6 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Locations / Warehouses
            {!loading && <span className="ml-2 text-sm font-normal text-gray-500">{locations.length} total</span>}
          </h2>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            <PlusIcon className="w-4 h-4" /> Add Location
          </button>
        </div>

        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-sm text-error-600">{error}</p>
              <button onClick={fetchLocations} className="mt-3 text-sm text-brand-500 underline">Retry</button>
            </div>
          ) : locations.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No locations yet. <button onClick={openCreate} className="text-brand-500 underline">Add your first</button>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {["Name", "Type", "Address", "Stock Count", ""].map((h) => (
                      <TableCell key={h} isHeader className="py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {locations.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="py-3 text-sm font-medium text-gray-800 dark:text-white/90">{l.name}</TableCell>
                      <TableCell className="py-3">
                        <Badge size="sm" color={TYPE_COLORS[l.type]}>
                          {l.type.charAt(0).toUpperCase() + l.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{l.address ?? "—"}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{l.stockCount ?? "—"}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(l)} className="p-1 text-gray-400 hover:text-brand-500">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(l.id)} disabled={deleteId === l.id}
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
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
              {editing ? "Edit Location" : "New Location"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Location["type"] }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="warehouse">Warehouse</option>
                  <option value="store">Store</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Address</label>
                <textarea rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
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
