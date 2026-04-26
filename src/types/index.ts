// ─── Domain Types for AbiTrack ────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "growth" | "enterprise";
}

export type UserRole = "super_admin" | "business_admin" | "store_manager" | "read_only";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  type: "warehouse" | "store" | "other";
  tenantId: string;
  stockCount?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  barcode?: string;
  tenantId: string;
  createdAt: string;
  totalStock?: number;
}

export interface StockLevel {
  id: string;
  productId: string;
  product: Product;
  locationId: string;
  location: Location;
  quantity: number;
  minStockLevel: number;
  reorderQuantity: number;
}

export type MovementType = "receipt" | "sale" | "transfer_in" | "transfer_out" | "adjustment";

export interface StockMovement {
  id: string;
  type: MovementType;
  productId: string;
  productName: string;
  fromLocationId?: string;
  toLocationId?: string;
  locationName?: string;
  quantity: number;
  costPerUnit?: number;
  note?: string;
  createdAt: string;
  createdBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  leadTimeDays: number;
  paymentTerms?: string;
  tenantId: string;
  totalOrders?: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  type: "retail" | "wholesale" | "b2b";
  tenantId: string;
  totalOrders?: number;
}

export interface PurchaseOrderLine {
  id: string;
  productId: string;
  product?: Product;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
}

export type POStatus = "draft" | "sent" | "partial" | "received" | "cancelled";

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  supplier?: Supplier;
  status: POStatus;
  expectedDeliveryDate?: string;
  lines: PurchaseOrderLine[];
  totalAmount: number;
  locationId: string;
  locationName?: string;
  createdAt: string;
  createdBy: string;
}

export interface SalesOrderLine {
  id: string;
  productId: string;
  product?: Product;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export type SOStatus = "pending" | "packed" | "shipped" | "delivered" | "cancelled";

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  customer?: Customer;
  status: SOStatus;
  lines: SalesOrderLine[];
  totalAmount: number;
  locationId: string;
  locationName?: string;
  createdAt: string;
}

export interface ReceiptLine {
  id?: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitCost: number;
  total: number;
  productId?: string;
  matched?: boolean;
}

export interface Receipt {
  id: string;
  supplierId?: string;
  supplierName?: string;
  locationId: string;
  status: "pending_confirmation" | "confirmed";
  ocrRawData?: unknown;
  lines: ReceiptLine[];
  receiptDate?: string;
  createdAt: string;
}

export interface LowStockAlert {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  product: Product;
  locationId: string;
  locationName: string;
  location: Location;
  currentQuantity: number;
  minStockLevel: number;
  reorderQuantity: number;
  status: "active" | "resolved" | "snoozed";
  createdAt: string;
}

export interface RestockPlatform {
  id: string;
  name: string;
  urlTemplate: string;
  enabled: boolean;
  builtin?: boolean;
}

export interface Message {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  isRead: boolean;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "business_admin" | "store_manager" | "read_only" | "child" | "parent" | "others";
  isActive: boolean;
  allowedCategories: string[] | null;
  createdAt: string;
}

export interface DashboardMetrics {
  totalProducts: number;
  totalStockValue: number;
  lowStockAlerts: number;
  pendingPurchaseOrders: number;
  pendingSalesOrders: number;
  totalLocations: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code: string;
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
