import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { alertsApi, locationsApi, settingsApi } from "../../api";
import type { LowStockAlert, Location, RestockPlatform } from "../../types";
import { AlertIcon } from "../../icons";

const platformUrl = (p: RestockPlatform, query: string) =>
  p.urlTemplate.replace("{query}", encodeURIComponent(query));

export default function LowStockAlerts() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [restockId, setRestockId] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<RestockPlatform[]>([]);

  const PAGE_SIZE = 15;

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await alertsApi.lowStock({
        locationId: locationFilter || undefined,
        page,
      });
      setAlerts(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [locationFilter, page]);

  useEffect(() => {
    locationsApi.list().then(setLocations).catch(() => {});
    settingsApi.get().then((r) => setPlatforms(r.restockPlatforms.filter((p) => p.enabled))).catch(() => {});
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // Poll every 30s for real-time updates
  useEffect(() => {
    const id = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  const handleResolve = async (alertId: string) => {
    setActionId(alertId);
    try {
      await alertsApi.resolve(alertId);
      fetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to resolve");
    } finally {
      setActionId(null);
    }
  };

  const handleSnooze = async (alertId: string) => {
    setActionId(alertId);
    try {
      await alertsApi.snooze(alertId, 24);
      fetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to snooze");
    } finally {
      setActionId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const shortageQty = (a: LowStockAlert) => a.minStockLevel - a.currentQuantity;

  return (
    <>
      <PageMeta title="Low Stock Alerts | AbiTrack" description="View and manage low stock alerts" />
      <PageBreadCrumb pageTitle="Low Stock Alerts" />

      {/* Summary bar */}
      {!loading && total > 0 && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-warning-200 bg-warning-50 dark:border-warning-500/20 dark:bg-warning-500/10 px-5 py-4">
          <AlertIcon className="w-6 h-6 text-warning-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-warning-700 dark:text-warning-400">
              {total} active low-stock alert{total !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-warning-600 dark:text-warning-500 mt-0.5">
              Alerts auto-refresh every 30 seconds. Resolve or snooze to dismiss.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 px-6 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Active Alerts
            {!loading && <span className="ml-2 text-sm font-normal text-gray-500">{total} total</span>}
          </h2>
          <div className="flex items-center gap-3">
            <select value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 focus:outline-none">
              <option value="">All Locations</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <button onClick={fetchAlerts}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
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
              <p className="text-sm text-error-600">{error}</p>
              <button onClick={fetchAlerts} className="mt-3 text-sm text-brand-500 underline">Retry</button>
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10 mx-auto mb-3">
                <svg className="w-7 h-7 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">All stock levels are healthy!</p>
              <p className="text-xs text-gray-400 mt-1">No active low-stock alerts.</p>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {["Product", "SKU", "Location", "On Hand", "Min Level", "Shortage", "Reorder Qty", "Since", "Actions"].map((h) => (
                      <TableCell key={h} isHeader className="py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {alerts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="py-3 text-sm font-medium text-gray-800 dark:text-white/90">{a.productName}</TableCell>
                      <TableCell className="py-3 text-xs font-mono text-gray-500 dark:text-gray-400">{a.sku}</TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{a.locationName}</TableCell>
                      <TableCell className="py-3">
                        <span className={`text-sm font-semibold ${a.currentQuantity === 0 ? "text-error-600 dark:text-error-400" : "text-warning-600 dark:text-warning-400"}`}>
                          {a.currentQuantity}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{a.minStockLevel}</TableCell>
                      <TableCell className="py-3">
                        <Badge size="sm" color={a.currentQuantity === 0 ? "error" : "warning"}>
                          -{shortageQty(a)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">
                        {a.reorderQuantity > 0 ? a.reorderQuantity : "—"}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-gray-400">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResolve(a.id)}
                            disabled={actionId === a.id}
                            className="rounded px-2 py-1 text-xs font-medium text-success-600 border border-success-200 hover:bg-success-50 dark:border-success-800 dark:text-success-400 disabled:opacity-40"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleSnooze(a.id)}
                            disabled={actionId === a.id}
                            className="rounded px-2 py-1 text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 disabled:opacity-40"
                          >
                            Snooze 24h
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setRestockId(restockId === a.id ? null : a.id)}
                              className="rounded px-2 py-1 text-xs font-medium text-brand-600 border border-brand-200 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-400"
                            >
                              Restock ▾
                            </button>
                            {restockId === a.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setRestockId(null)} />
                                <div className="absolute right-0 top-7 z-20 w-36 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
                                  {platforms.length === 0
                                    ? <p className="px-3 py-2 text-xs text-gray-400">No stores enabled</p>
                                    : platforms.map((p) => (
                                    <a
                                      key={p.id}
                                      href={platformUrl(p, a.productName)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => setRestockId(null)}
                                      className="flex items-center px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                                    >
                                      {p.name}
                                    </a>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
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
    </>
  );
}
