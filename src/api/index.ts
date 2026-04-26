// ─── AbiTrack API Functions ────────────────────────────────────────────────────
import api, { uploadFile } from "./client";
import type {
  Product,
  StockLevel,
  StockMovement,
  Supplier,
  Customer,
  PurchaseOrder,
  SalesOrder,
  Receipt,
  ReceiptLine,
  LowStockAlert,
  Location,
  DashboardMetrics,
  PaginatedResponse,
  TeamMember,
  Message,
  RestockPlatform,
} from "../types";

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsApi = {
  list: (params?: { page?: number; search?: string; category?: string; pageSize?: number }) =>
    api.get<PaginatedResponse<Product>>("/products", params),
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: Partial<Product>) => api.post<Product>("/products", data),
  update: (id: string, data: Partial<Product>) => api.put<Product>(`/products/${id}`, data),
  delete: (id: string) => api.delete<void>(`/products/${id}`),
  categories: () => api.get<string[]>("/products/categories"),
};

// ─── Stock ────────────────────────────────────────────────────────────────────
export const stockApi = {
  list: (params?: { locationId?: string; page?: number; search?: string }) =>
    api.get<PaginatedResponse<StockLevel>>("/stock", params),
  byLocation: (locationId: string) =>
    api.get<StockLevel[]>(`/stock/${locationId}`),
  adjust: (data: { productId: string; locationId: string; quantity: number; note?: string }) =>
    api.put<StockLevel>("/stock/adjust", data),
  transfer: (data: { productId: string; fromLocationId: string; toLocationId: string; quantity: number; note?: string }) =>
    api.post<StockMovement>("/stock/transfer", data),
  deduct: (data: { productId: string; locationId: string; quantity: number; note?: string }) =>
    api.post<StockLevel>("/stock/deduct", data),
  movements: (params?: { productId?: string; locationId?: string; page?: number }) =>
    api.get<PaginatedResponse<StockMovement>>("/stock/movements", params),
};

// ─── Locations ────────────────────────────────────────────────────────────────
export const locationsApi = {
  list: () => api.get<Location[]>("/locations"),
  get: (id: string) => api.get<Location>(`/locations/${id}`),
  create: (data: Partial<Location>) => api.post<Location>("/locations", data),
  update: (id: string, data: Partial<Location>) => api.put<Location>(`/locations/${id}`, data),
  delete: (id: string) => api.delete<void>(`/locations/${id}`),
};

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliersApi = {
  list: (params?: { page?: number; search?: string }) =>
    api.get<PaginatedResponse<Supplier>>("/suppliers", params),
  get: (id: string) => api.get<Supplier>(`/suppliers/${id}`),
  create: (data: Partial<Supplier>) => api.post<Supplier>("/suppliers", data),
  update: (id: string, data: Partial<Supplier>) => api.put<Supplier>(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete<void>(`/suppliers/${id}`),
};

// ─── Customers ────────────────────────────────────────────────────────────────
export const customersApi = {
  list: (params?: { page?: number; search?: string; type?: string }) =>
    api.get<PaginatedResponse<Customer>>("/customers", params),
  get: (id: string) => api.get<Customer>(`/customers/${id}`),
  create: (data: Partial<Customer>) => api.post<Customer>("/customers", data),
  update: (id: string, data: Partial<Customer>) => api.put<Customer>(`/customers/${id}`, data),
  delete: (id: string) => api.delete<void>(`/customers/${id}`),
};

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export const purchaseOrdersApi = {
  list: (params?: { page?: number; status?: string; supplierId?: string }) =>
    api.get<PaginatedResponse<PurchaseOrder>>("/purchase-orders", params),
  get: (id: string) => api.get<PurchaseOrder>(`/purchase-orders/${id}`),
  create: (data: Partial<PurchaseOrder>) => api.post<PurchaseOrder>("/purchase-orders", data),
  update: (id: string, data: Partial<PurchaseOrder>) => api.put<PurchaseOrder>(`/purchase-orders/${id}`, data),
  receive: (id: string, lines: { lineId: string; receivedQuantity: number }[]) =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/receipts`, { lines }),
};

// ─── Sales Orders ─────────────────────────────────────────────────────────────
export const salesOrdersApi = {
  list: (params?: { page?: number; status?: string; customerId?: string }) =>
    api.get<PaginatedResponse<SalesOrder>>("/sales-orders", params),
  get: (id: string) => api.get<SalesOrder>(`/sales-orders/${id}`),
  create: (data: Partial<SalesOrder>) => api.post<SalesOrder>("/sales-orders", data),
  updateStatus: (id: string, status: string) =>
    api.patch<SalesOrder>(`/sales-orders/${id}`, { status }),
};

// ─── Receipts / OCR ───────────────────────────────────────────────────────────
export const receiptsApi = {
  upload: (file: File, locationId: string) =>
    uploadFile<{ receiptId: string; lines: ReceiptLine[]; supplierName?: string; receiptDate?: string }>(
      "/receipts/upload",
      file,
      { locationId }
    ),
  confirm: (data: { receiptId: string; lines: ReceiptLine[]; locationId: string; supplierId?: string }) =>
    api.post<Receipt>("/receipts/confirm", data),
  list: (params?: { page?: number }) =>
    api.get<PaginatedResponse<Receipt>>("/receipts", params),
};

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const alertsApi = {
  lowStock: (params?: { locationId?: string; page?: number }) =>
    api.get<PaginatedResponse<LowStockAlert>>("/alerts/low-stock", params),
  resolve: (alertId: string) =>
    api.post<LowStockAlert>(`/alerts/${alertId}/resolve`, {}),
  snooze: (alertId: string, hours: number) =>
    api.post<LowStockAlert>(`/alerts/${alertId}/snooze`, { hours }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  metrics: () => api.get<DashboardMetrics>("/dashboard/metrics"),
  recentMovements: () => api.get<StockMovement[]>("/dashboard/recent-movements"),
};

// ─── Calendar Events ──────────────────────────────────────────────────────────
export const calendarApi = {
  list: () => api.get<{ id: string; title: string; startDate: string; endDate?: string; color: string }[]>("/calendar-events"),
  create: (data: { title: string; startDate: string; endDate?: string; color?: string }) =>
    api.post("/calendar-events", data),
  update: (id: string, data: Partial<{ title: string; startDate: string; endDate: string; color: string }>) =>
    api.put(`/calendar-events/${id}`, data),
  delete: (id: string) => api.delete(`/calendar-events/${id}`),
};

// ─── Auth (QR) ────────────────────────────────────────────────────────────────
export const authApi = {
  generateQrToken: () => api.post<{ token: string; expiresIn: number }>("/auth/qr-token"),
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get<{ restockPlatforms: RestockPlatform[] }>("/settings"),
  update: (restockPlatforms: RestockPlatform[]) => api.put<{ restockPlatforms: RestockPlatform[] }>("/settings", { restockPlatforms }),
  getCategories: () => api.get<{ name: string; hidden: boolean }[]>("/settings/categories"),
  updateCategories: (categories: { name: string; hidden: boolean }[], renameFrom?: string, renameTo?: string) =>
    api.put<{ name: string; hidden: boolean }[]>("/settings/categories", { categories, renameFrom, renameTo }),
};

// ─── Team Messages ────────────────────────────────────────────────────────────
export const messagesApi = {
  list: (withUserId: string) => api.get<Message[]>("/messages", { with: withUserId }),
  send: (recipientId: string, body: string) => api.post<Message>("/messages", { recipientId, body }),
  inbox: () => api.get<Message[]>("/messages/inbox"),
  markRead: (senderId?: string) => api.post<{ ok: boolean }>("/messages/read", senderId ? { senderId } : {}),
};

// ─── Team / Users ─────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get<TeamMember[]>("/users"),
  create: (data: { name: string; email: string; password: string; role: string; allowedCategories: string[] | null }) =>
    api.post<TeamMember>("/users", data),
  update: (id: string, data: Partial<{ name: string; role: string; isActive: boolean; password: string; allowedCategories: string[] | null }>) =>
    api.put<TeamMember>(`/users/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/users/${id}`),
};
