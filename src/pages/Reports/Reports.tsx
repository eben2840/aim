import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { dashboardApi } from "../../api";
import type { DashboardMetrics } from "../../types";

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ label, value, sub, icon, color }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-5 md:p-6">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="mt-5">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <h4 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">{value}</h4>
        {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function Reports() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.metrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  return (
    <>
      <PageMeta title="Reports | AbiTrack" description="Inventory analytics and KPI reports" />
      <PageBreadCrumb pageTitle="Reports & Analytics" />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-sm text-error-600">{error}</p>
          <button onClick={fetchMetrics} className="mt-3 text-sm text-brand-500 underline">Retry</button>
        </div>
      ) : metrics && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-8">
            <MetricCard
              label="Total SKUs"
              value={metrics.totalProducts.toLocaleString()}
              sub="Active products in catalogue"
              color="bg-brand-50 dark:bg-brand-500/10"
              icon={
                <svg className="w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
              }
            />
            <MetricCard
              label="Total Stock Value"
              value={`$${metrics.totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub="Based on cost price × on-hand quantity"
              color="bg-success-50 dark:bg-success-500/10"
              icon={
                <svg className="w-6 h-6 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              }
            />
            <MetricCard
              label="Low Stock Alerts"
              value={metrics.lowStockAlerts}
              sub="Products below minimum threshold"
              color={metrics.lowStockAlerts > 0 ? "bg-warning-50 dark:bg-warning-500/10" : "bg-success-50 dark:bg-success-500/10"}
              icon={
                <svg className="w-6 h-6 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <MetricCard
              label="Pending Purchase Orders"
              value={metrics.pendingPurchaseOrders}
              sub="Awaiting delivery from suppliers"
              color="bg-blue-50 dark:bg-blue-500/10"
              icon={
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
            <MetricCard
              label="Pending Sales Orders"
              value={metrics.pendingSalesOrders}
              sub="Orders awaiting fulfilment"
              color="bg-purple-50 dark:bg-purple-500/10"
              icon={
                <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              }
            />
            <MetricCard
              label="Total Locations"
              value={metrics.totalLocations}
              sub="Active warehouses & stores"
              color="bg-indigo-50 dark:bg-indigo-500/10"
              icon={
                <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>

          {/* Info panels */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Stock Health Summary</h3>
              <div className="space-y-3">
                {[
                  { label: "In-stock items", value: metrics.totalProducts - metrics.lowStockAlerts, color: "bg-success-500", pct: metrics.totalProducts > 0 ? ((metrics.totalProducts - metrics.lowStockAlerts) / metrics.totalProducts) * 100 : 0 },
                  { label: "Low-stock items", value: metrics.lowStockAlerts, color: "bg-warning-500", pct: metrics.totalProducts > 0 ? (metrics.lowStockAlerts / metrics.totalProducts) * 100 : 0 },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{row.label}</span>
                      <span className="font-medium text-gray-800 dark:text-white/90">{row.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className={`h-2 rounded-full ${row.color} transition-all duration-500`} style={{ width: `${Math.min(100, row.pct)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Order Pipeline</h3>
              <div className="space-y-3">
                {[
                  { label: "Pending Purchase Orders", value: metrics.pendingPurchaseOrders, color: "bg-blue-500" },
                  { label: "Pending Sales Orders", value: metrics.pendingSalesOrders, color: "bg-purple-500" },
                ].map((row) => {
                  const maxVal = Math.max(metrics.pendingPurchaseOrders, metrics.pendingSalesOrders, 1);
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{row.label}</span>
                        <span className="font-medium text-gray-800 dark:text-white/90">{row.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className={`h-2 rounded-full ${row.color} transition-all duration-500`}
                          style={{ width: `${(row.value / maxVal) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
