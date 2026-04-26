import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { alertsApi, stockApi, productsApi, messagesApi } from "../../api";
import type { LowStockAlert, StockMovement, Product } from "../../types";

type Tab = "all" | "new" | "low" | "updates" | "messages";

interface NotificationItem {
  id: string;
  type: "low" | "new" | "update" | "msg";
  title: string;
  subtitle: string;
  time: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function TypeIcon({ type }: { type: NotificationItem["type"] }) {
  if (type === "low") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10 text-error-500 shrink-0">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </span>
    );
  }
  if (type === "new") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10 text-success-500 shrink-0">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </span>
    );
  }
  if (type === "msg") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 shrink-0">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.844L3 20l1.09-3.635C3.402 15.07 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 shrink-0">
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    </span>
  );
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    const poll = () => messagesApi.inbox().then((msgs) => setUnreadMsgCount(msgs.length)).catch(() => {});
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    Promise.allSettled([
      alertsApi.lowStock({ page: 1 }),
      stockApi.movements({ page: 1 }),
      productsApi.list({ page: 1 }),
      messagesApi.inbox(),
    ]).then(([alertsRes, movementsRes, productsRes, inboxRes]) => {
      const result: NotificationItem[] = [];

      // Low stock alerts
      if (alertsRes.status === "fulfilled") {
        const alerts: LowStockAlert[] = (alertsRes.value as any)?.data ?? (alertsRes.value as any)?.items ?? [];
        alerts.slice(0, 10).forEach((a: LowStockAlert) => {
          result.push({
            id: `alert-${a.id}`,
            type: "low",
            title: `Low stock: ${a.productName}`,
            subtitle: `Only ${a.currentQuantity} left${a.locationName ? ` at ${a.locationName}` : ""}`,
            time: a.createdAt ? timeAgo(a.createdAt) : "",
          });
        });
      }

      // Recent stock movements
      if (movementsRes.status === "fulfilled") {
        const movements: StockMovement[] = (movementsRes.value as any)?.data ?? (movementsRes.value as any)?.items ?? [];
        movements.slice(0, 10).forEach((m: StockMovement) => {
          const isAdd = m.type === "receipt" || m.type === "transfer_in";
          result.push({
            id: `mov-${m.id}`,
            type: isAdd ? "new" : "update",
            title: `${isAdd ? "Stock added" : "Stock updated"}: ${m.productName}`,
            subtitle: `${isAdd ? "+" : ""}${m.quantity} units${m.locationName ? ` at ${m.locationName}` : ""}${m.note ? ` — ${m.note}` : ""}`,
            time: m.createdAt ? timeAgo(m.createdAt) : "",
          });
        });
      }

      // Newly created products
      if (productsRes.status === "fulfilled") {
        const products: Product[] = (productsRes.value as any)?.data ?? (productsRes.value as any)?.items ?? [];
        products.slice(0, 5).forEach((p: Product) => {
          if (p.createdAt) {
            const age = Date.now() - new Date(p.createdAt).getTime();
            if (age < 48 * 3600 * 1000) {
              result.push({
                id: `prod-${p.id}`,
                type: "new",
                title: `New product: ${p.name}`,
                subtitle: `SKU: ${p.sku ?? "—"}${p.category ? ` · ${p.category}` : ""}`,
                time: timeAgo(p.createdAt),
              });
            }
          }
        });
      }

      // Inbox messages
      if (inboxRes.status === "fulfilled") {
        (inboxRes.value as any[]).forEach((m) => {
          result.push({
            id: `msg-${m.id}`,
            type: "msg",
            title: `Message from ${m.senderName}`,
            subtitle: m.body,
            time: m.createdAt ? timeAgo(m.createdAt) : "",
          });
        });
        setUnreadMsgCount((inboxRes.value as any[]).length);
      }

      result.sort((a, b) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return 0;
      });

      setItems(result);
      setLoading(false);
    });
  }, [isOpen]);

  const filtered = items.filter((n) => {
    if (tab === "all") return true;
    if (tab === "low") return n.type === "low";
    if (tab === "new") return n.type === "new";
    if (tab === "updates") return n.type === "update";
    if (tab === "messages") return n.type === "msg";
    return true;
  });

  const hasNew = items.length > 0 || unreadMsgCount > 0;

  const handleClose = () => {
    setIsOpen(false);
    if (unreadMsgCount > 0) {
      messagesApi.markRead().then(() => setUnreadMsgCount(0)).catch(() => {});
    }
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={() => isOpen ? handleClose() : setIsOpen(true)}
      >
        {hasNew && (
          <span className="absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 flex">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z" fill="currentColor" />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={handleClose}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notifications</h5>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {(["all", "messages", "new", "low", "updates"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors inline-flex items-center gap-1 ${
                tab === t
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {t === "low" ? "Low Stock" : t}
              {t === "messages" && unreadMsgCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-400 text-white text-[10px] font-bold">
                  {unreadMsgCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Items */}
        <ul className="flex flex-col overflow-y-auto custom-scrollbar flex-1 gap-0.5">
          {loading ? (
            <li className="flex items-center justify-center py-10 text-sm text-gray-400">
              Loading...
            </li>
          ) : filtered.length === 0 ? (
            <li className="flex flex-col items-center justify-center py-10 text-sm text-gray-400 gap-2">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              No notifications
            </li>
          ) : (
            filtered.map((item) => (
              <li key={item.id}>
                <div className="flex gap-3 rounded-lg border-b border-gray-100 px-3 py-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5 cursor-default">
                  <TypeIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90 leading-snug truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">
                      {item.subtitle}
                    </p>
                    {item.time && (
                      <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                    )}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>

        {/* Footer */}
        <Link
          to="/abitrack/low-stock-alerts"
          onClick={() => setIsOpen(false)}
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View All Alerts
        </Link>
      </Dropdown>
    </div>
  );
}
