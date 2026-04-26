import { useState, useEffect } from "react";
import { settingsApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import type { RestockPlatform } from "../../types";

const emptyForm = { name: "", urlTemplate: "" };

export default function RestockSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "business_admin" || user?.role === "super_admin";

  const [platforms, setPlatforms] = useState<RestockPlatform[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    settingsApi.get().then((r) => setPlatforms(r.restockPlatforms)).catch(() => {});
  }, []);

  const save = async (updated: RestockPlatform[]) => {
    setSaving(true); setError(""); setSuccess(false);
    try { const r = await settingsApi.update(updated); setPlatforms(r.restockPlatforms); setSuccess(true); }
    catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  const toggle = (id: string) =>
    setPlatforms((prev) => prev.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p));

  const remove = (id: string) => setPlatforms((prev) => prev.filter((p) => p.id !== id));

  const addPlatform = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.urlTemplate.trim()) return;
    setPlatforms([...platforms, { id: crypto.randomUUID(), name: form.name.trim(), urlTemplate: form.urlTemplate.trim(), enabled: true }]);
    setForm(emptyForm);
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Restock Stores</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Choose which stores appear in the low stock restock dropdown.
          {!isAdmin && " Only admins can make changes."}
        </p>
      </div>

      {error && <div className="mb-4 rounded-lg bg-error-50 dark:bg-error-500/10 px-4 py-3 text-sm text-error-600 dark:text-error-400">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-success-50 dark:bg-success-500/10 px-4 py-3 text-sm text-success-600 dark:text-success-400">Saved successfully.</div>}

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
        {platforms.map((p) => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 bg-white dark:bg-gray-900">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{p.name}</p>
              <p className="text-xs text-gray-400 truncate">{p.urlTemplate}</p>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => toggle(p.id)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.enabled ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-700"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${p.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                {!p.builtin && (
                  <button onClick={() => remove(p.id)} className="text-xs text-error-500 hover:text-error-700">Remove</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <>
          <form onSubmit={addPlatform} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 mb-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-white/80 mb-3">Add Custom Store</p>
            <div className="flex gap-3 mb-3">
              <input type="text" placeholder="Store name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:text-white/90" />
            </div>
            <div className="flex gap-3">
              <input type="text" placeholder="URL template — use {query} for the search term" value={form.urlTemplate}
                onChange={(e) => setForm({ ...form, urlTemplate: e.target.value })}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:text-white/90" />
              <button type="submit" className="rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Add</button>
            </div>
          </form>
          <button onClick={() => save(platforms)} disabled={saving}
            className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </>
      )}
    </div>
  );
}
