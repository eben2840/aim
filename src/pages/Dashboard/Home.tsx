import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { dashboardApi, alertsApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import type { DashboardMetrics, StockMovement, LowStockAlert } from "../../types";

function MetricCard({ label, value, icon, color, to }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; to: string;
}) {
  return (
    <Link to={to} className="block rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-5 hover:shadow-md transition-shadow">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="mt-5">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <h4 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">{value}</h4>
      </div>
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const isPersonal = user?.accountType === "personal";
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoadingMetrics(true);
    setLoadingMovements(true);
    setLoadingAlerts(true);

    dashboardApi.metrics()
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoadingMetrics(false));

    dashboardApi.recentMovements()
      .then(setMovements)
      .catch(() => {})
      .finally(() => setLoadingMovements(false));

    alertsApi.lowStock({ page: 1 })
      .then((res) => setAlerts(res.data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoadingAlerts(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const movementBadge = (type: StockMovement["type"]) => {
    const map: Record<string, { label: string; color: "success" | "error" | "info" | "warning" }> = {
      receipt: { label: "Receipt", color: "success" },
      sale: { label: "Sale", color: "error" },
      transfer_in: { label: "Transfer In", color: "info" },
      transfer_out: { label: "Transfer Out", color: "warning" },
      adjustment: { label: "Adjustment", color: "light" as never },
    };
    const m = map[type] ?? { label: type, color: "light" as never };
    return <Badge size="sm" color={m.color}>{m.label}</Badge>;
  };

  return (
    <>
      <PageMeta
        title="Dashboard | AbiTrack"
        description="Inventory management overview — stock, orders, alerts"
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 mb-6">
        {loadingMetrics ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-5 animate-pulse h-32" />
          ))
        ) : metrics ? (
          <>
            <MetricCard label="Total SKUs" value={metrics.totalProducts} to="products"
              color="bg-brand-50 dark:bg-brand-500/10"
              icon={<svg className="w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>} />
            <MetricCard label="Stock Value" value={`$${metrics.totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} to="stock"
              color="bg-success-50 dark:bg-success-500/10"
              icon={<svg className="w-6 h-6 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>} />
            <MetricCard label="Low Stock" value={metrics.lowStockAlerts} to="low-stock-alerts"
              color={metrics.lowStockAlerts > 0 ? "bg-warning-50 dark:bg-warning-500/10" : "bg-success-50 dark:bg-success-500/10"}
              icon={<svg className="w-6 h-6 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
            {!isPersonal && <MetricCard label="Pending POs" value={metrics.pendingPurchaseOrders} to="purchase-orders"
              color="bg-blue-50 dark:bg-blue-500/10"
              icon={<svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />}
            {!isPersonal && <MetricCard label="Pending SOs" value={metrics.pendingSalesOrders} to="sales-orders"
              color="bg-purple-50 dark:bg-purple-500/10"
              icon={<svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>} />}
            <MetricCard label="Locations" value={metrics.totalLocations} to="locations"
              color="bg-indigo-50 dark:bg-indigo-500/10"
              icon={<svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Recent Stock Movements */}
        <div className="col-span-12 xl:col-span-7">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Stock Movements</h3>
              <Link to="stock" className="text-sm text-brand-500 hover:text-brand-600">View all</Link>
            </div>
            <div className="px-4 pb-4">
              {loadingMovements ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                </div>
              ) : movements.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No stock movements yet.</div>
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                      <TableRow>
                        {["Product", "Type", "Qty", "Location", "Date"].map((h) => (
                          <TableCell key={h} isHeader className="py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-start">{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {movements.slice(0, 8).map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="py-3 text-sm text-gray-700 dark:text-white/90">{m.productName}</TableCell>
                          <TableCell className="py-3">{movementBadge(m.type)}</TableCell>
                          <TableCell className="py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{m.quantity}</TableCell>
                          <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400">{m.locationName ?? "—"}</TableCell>
                          <TableCell className="py-3 text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Alerts panel */}
        <div className="col-span-12 xl:col-span-5">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Low Stock Alerts</h3>
              <Link to="low-stock-alerts" className="text-sm text-brand-500 hover:text-brand-600">View all</Link>
            </div>
            <div className="px-4 pb-4">
              {loadingAlerts ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10 mx-auto mb-2">
                    <svg className="w-6 h-6 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">All stock levels healthy</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">{a.productName}</p>
                        <p className="text-xs text-gray-400">{a.locationName} · min {a.minStockLevel}</p>
                      </div>
                      <div className="text-right">
                        <Badge size="sm" color={a.currentQuantity === 0 ? "error" : "warning"}>
                          {a.currentQuantity === 0 ? "Out of Stock" : `${a.currentQuantity} left`}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
