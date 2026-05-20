# AbiTrack API Reference

This document lists every backend endpoint currently exposed to the frontend and the matching frontend API helpers in `src/api/index.ts`.

## Base URL

Frontend requests use `src/api/client.ts`.

```ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://abitrack-9aa35a0b4b27.herokuapp.com/api/v1";
```

Backend route prefix:

- API v1: `/api/v1`
- Health check: `/health`

All endpoint paths below are relative to `/api/v1` unless noted.

## Authentication

Protected endpoints require:

```http
Authorization: Bearer <jwt>
```

The frontend stores the token in `localStorage` under `abitrack_token`. If the API returns `401` or `422`, the client clears auth state and redirects to `/abitrack/signin`.

Public endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/qr-login`
- `GET /health`

## Common Response Shapes

Paginated endpoints return:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "pageSize": 10,
  "totalPages": 0
}
```

Errors usually return:

```json
{ "message": "Error message" }
```

## Frontend Helper Modules

All helpers are exported from `src/api/index.ts`.

| Helper | Purpose |
| --- | --- |
| `authApi` | Register, login, current user, QR token, QR login |
| `productsApi` | Product catalog and categories |
| `stockApi` | Stock levels, adjustments, transfers, deductions, movement history |
| `locationsApi` | Warehouses, stores, and other locations |
| `suppliersApi` | Supplier CRUD |
| `customersApi` | Customer CRUD |
| `purchaseOrdersApi` | Purchase order CRUD and receiving |
| `salesOrdersApi` | Sales order list/detail/create/status update |
| `receiptsApi` | Receipt upload, OCR review confirmation, receipt list |
| `alertsApi` | Low-stock alerts, resolve, snooze |
| `dashboardApi` | Dashboard metrics and recent movements |
| `calendarApi` | Calendar event CRUD |
| `settingsApi` | Restock platforms and category visibility/settings |
| `messagesApi` | Team direct messages and unread inbox |
| `usersApi` | Team member management |
| `aiApi` | AbiTrack AI chat endpoint |

## Endpoint Index

### System

| Method | Path | Auth | Frontend helper | Description |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | No | none | Backend health check. Returns `{ "status": "ok" }`. |

### Auth

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | No | `authApi.register` | `{ name, email, password, organizationName?, accountType?, category? }` | Creates tenant and first `business_admin`; returns `{ token, user }`. |
| `POST` | `/auth/login` | No | `authApi.login` | `{ email, password }` | Returns `{ token, user }`. |
| `GET` | `/auth/me` | Yes | `authApi.me` | none | Returns current authenticated user. |
| `POST` | `/auth/qr-token` | Yes | `authApi.generateQrToken` | none | Creates a 90-second QR login token. |
| `POST` | `/auth/qr-login` | No | `authApi.qrLogin` | `{ token }` | Exchanges a valid QR token for `{ token, user }`. |

### Products

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/products/categories` | Yes | `productsApi.categories` | none | Lists visible product categories for the tenant. |
| `GET` | `/products` | Yes | `productsApi.list` | `page?`, `pageSize?`, `search?`, `category?` | Paginated product list. |
| `GET` | `/products/:productId` | Yes | `productsApi.get` | none | Product detail. |
| `POST` | `/products` | Yes | `productsApi.create` | `{ sku, name, description?, category?, unit?, costPrice?, sellingPrice?, barcode? }` | Creates a product. Requires `name` and `sku`. |
| `PUT` | `/products/:productId` | Yes | `productsApi.update` | partial product fields | Updates a product. |
| `DELETE` | `/products/:productId` | Yes | `productsApi.delete` | none | Deletes a product. Returns `204`. |

### Stock

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/stock` | Yes | `stockApi.list` | `page?`, `pageSize?`, `locationId?`, `search?` | Paginated stock levels. |
| `GET` | `/stock/:locationId` | Yes | `stockApi.byLocation` | none | Stock levels for one location. |
| `PUT` | `/stock/adjust` | Yes | `stockApi.adjust` | `{ productId, locationId, quantity, note? }` | Sets stock to an exact quantity. |
| `POST` | `/stock/transfer` | Yes | `stockApi.transfer` | `{ productId, fromLocationId, toLocationId, quantity, note? }` | Transfers stock between locations. Returns `{ message }`. |
| `POST` | `/stock/deduct` | Yes | `stockApi.deduct` | `{ productId, locationId, quantity, note? }` | Deducts stock manually. |
| `GET` | `/stock/movements` | Yes | `stockApi.movements` | `page?`, `pageSize?`, `productId?`, `locationId?` | Paginated movement history. |

### Locations

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/locations` | Yes | `locationsApi.list` | none | Lists all tenant locations. |
| `GET` | `/locations/:locationId` | Yes | `locationsApi.get` | none | Location detail. |
| `POST` | `/locations` | Yes | `locationsApi.create` | `{ name, address?, type? }` | Creates a location. Requires `name`. |
| `PUT` | `/locations/:locationId` | Yes | `locationsApi.update` | partial location fields | Updates a location. |
| `DELETE` | `/locations/:locationId` | Yes | `locationsApi.delete` | none | Deletes a location. Returns `204`. |

### Suppliers

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/suppliers` | Yes | `suppliersApi.list` | `page?`, `pageSize?`, `search?` | Paginated supplier list. |
| `GET` | `/suppliers/:supplierId` | Yes | `suppliersApi.get` | none | Supplier detail. |
| `POST` | `/suppliers` | Yes | `suppliersApi.create` | `{ name, email?, phone?, address?, contactPerson?, leadTimeDays?, paymentTerms? }` | Creates a supplier. Requires `name`. |
| `PUT` | `/suppliers/:supplierId` | Yes | `suppliersApi.update` | partial supplier fields | Updates a supplier. |
| `DELETE` | `/suppliers/:supplierId` | Yes | `suppliersApi.delete` | none | Deletes a supplier. Returns `204`. |

### Customers

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/customers` | Yes | `customersApi.list` | `page?`, `pageSize?`, `search?`, `type?` | Paginated customer list. |
| `GET` | `/customers/:customerId` | Yes | `customersApi.get` | none | Customer detail. |
| `POST` | `/customers` | Yes | `customersApi.create` | `{ name, email?, phone?, address?, type? }` | Creates a customer. Requires `name`. |
| `PUT` | `/customers/:customerId` | Yes | `customersApi.update` | partial customer fields | Updates a customer. |
| `DELETE` | `/customers/:customerId` | Yes | `customersApi.delete` | none | Deletes a customer. Returns `204`. |

### Purchase Orders

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/purchase-orders` | Yes | `purchaseOrdersApi.list` | `page?`, `pageSize?`, `status?`, `supplierId?` | Paginated purchase order list. |
| `GET` | `/purchase-orders/:poId` | Yes | `purchaseOrdersApi.get` | none | Purchase order detail. |
| `POST` | `/purchase-orders` | Yes | `purchaseOrdersApi.create` | `{ supplierId, locationId, expectedDeliveryDate?, lines? }` | Creates a draft purchase order. |
| `PUT` | `/purchase-orders/:poId` | Yes | `purchaseOrdersApi.update` | `{ status?, expectedDeliveryDate? }` | Updates purchase order status/date. |
| `POST` | `/purchase-orders/:poId/receipts` | Yes | `purchaseOrdersApi.receive` | `{ lines: [{ lineId, receivedQuantity }] }` | Receives stock against a purchase order and updates stock levels. |

Purchase order line shape for creation:

```json
{ "productId": "id", "quantity": 1, "unitCost": 10 }
```

### Sales Orders

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/sales-orders` | Yes | `salesOrdersApi.list` | `page?`, `pageSize?`, `status?`, `customerId?` | Paginated sales order list. |
| `GET` | `/sales-orders/:soId` | Yes | `salesOrdersApi.get` | none | Sales order detail. |
| `POST` | `/sales-orders` | Yes | `salesOrdersApi.create` | `{ customerId?, locationId, lines? }` | Creates a sales order and deducts stock immediately. |
| `PATCH` | `/sales-orders/:soId` | Yes | `salesOrdersApi.updateStatus` | `{ status }` | Updates sales order status. Cancelling restores stock. |

Sales order line shape for creation:

```json
{ "productId": "id", "quantity": 1, "unitPrice": 15 }
```

### Receipts / OCR

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/receipts/upload` | Yes | `receiptsApi.upload` | `multipart/form-data`: `file`, `locationId`, optional `supplierId` | Uploads receipt image/PDF and returns extracted line items for review. |
| `POST` | `/receipts/confirm` | Yes | `receiptsApi.confirm` | `{ receiptId, lines, locationId, supplierId? }` | Confirms reviewed lines and updates stock. |
| `GET` | `/receipts` | Yes | `receiptsApi.list` | `page?`, `pageSize?` | Paginated receipt history. |

### Alerts

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/alerts/low-stock` | Yes | `alertsApi.lowStock` | `page?`, `pageSize?`, `locationId?` | Paginated active low-stock alerts, excluding currently snoozed alerts. |
| `POST` | `/alerts/:alertId/resolve` | Yes | `alertsApi.resolve` | `{}` | Marks a low-stock alert as resolved. |
| `POST` | `/alerts/:alertId/snooze` | Yes | `alertsApi.snooze` | `{ hours }` | Snoozes an alert for the provided number of hours. |

### Dashboard

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/dashboard/metrics` | Yes | `dashboardApi.metrics` | none | Returns total products, stock value, alert count, pending order counts, and location count. |
| `GET` | `/dashboard/recent-movements` | Yes | `dashboardApi.recentMovements` | none | Returns the 20 most recent stock movements. |

### Calendar Events

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/calendar-events` | Yes | `calendarApi.list` | none | Lists calendar events ordered by start date. |
| `POST` | `/calendar-events` | Yes | `calendarApi.create` | `{ title, startDate, endDate?, color? }` | Creates a calendar event. |
| `PUT` | `/calendar-events/:eventId` | Yes | `calendarApi.update` | partial event fields | Updates a calendar event. |
| `DELETE` | `/calendar-events/:eventId` | Yes | `calendarApi.delete` | none | Deletes a calendar event. |

### Settings

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/settings` | Yes | `settingsApi.get` | none | Gets tenant restock platform settings. |
| `PUT` | `/settings` | Admin | `settingsApi.update` | `{ restockPlatforms }` | Updates restock platform settings. |
| `GET` | `/settings/categories` | Yes | `settingsApi.getCategories` | none | Gets tenant category visibility settings. |
| `PUT` | `/settings/categories` | Admin | `settingsApi.updateCategories` | `{ categories, renameFrom?, renameTo? }` | Updates category visibility and optionally renames product categories. |

Admin means the JWT role must be `business_admin` or `super_admin`.

### Messages

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/messages` | Yes | `messagesApi.list` | query: `with=<userId>` | Returns the latest conversation with a team member. |
| `GET` | `/messages/inbox` | Yes | `messagesApi.inbox` | none | Returns unread received messages. |
| `POST` | `/messages/read` | Yes | `messagesApi.markRead` | `{ senderId? }` | Marks unread messages as read, optionally from one sender only. |
| `POST` | `/messages` | Yes | `messagesApi.send` | `{ recipientId, body }` | Sends a direct message. |

### Users / Team

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/users` | Yes | `usersApi.list` | none | Lists users in the current tenant. |
| `POST` | `/users` | Admin | `usersApi.create` | `{ name, email, password, role, allowedCategories }` | Creates a team member. |
| `PUT` | `/users/:userId` | Admin | `usersApi.update` | partial `{ name, role, isActive, password, allowedCategories }` | Updates a team member. Cannot update yourself through this endpoint. |
| `DELETE` | `/users/:userId` | Admin | `usersApi.delete` | none | Deletes a team member. Cannot delete yourself. |

### AI Assistant

| Method | Path | Auth | Frontend helper | Body / query | Description |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/ai/chat` | Yes | `aiApi.chat` | `{ message, history? }` | Sends a message to AbiTrack AI. The backend may execute inventory, order, calendar, alert, price, report, and team message tools. Requires `ANTHROPIC_API_KEY`. |

History shape:

```json
[
  { "role": "user", "content": "Show stock" },
  { "role": "assistant", "content": "..." }
]
```

## Frontend Usage Map

Current frontend screens/components that use the API:

| Frontend area | Helpers / endpoints |
| --- | --- |
| Auth context | `authApi.login`, `authApi.register` equivalents; currently uses raw `api.post` to `/auth/login` and `/auth/register`. |
| Mobile app QR card | `authApi.generateQrToken` |
| Dashboard home | `dashboardApi.metrics`, `dashboardApi.recentMovements`, `alertsApi.lowStock` |
| Reports | `dashboardApi.metrics` |
| Products | `productsApi.list`, `productsApi.categories`, `productsApi.create`, `productsApi.update`, `productsApi.delete` |
| Category dashboard/sidebar | `productsApi.list`, `productsApi.categories` |
| Stock view | `stockApi.list`, `stockApi.deduct`, `locationsApi.list` |
| Stock transfer | `stockApi.transfer`, `stockApi.movements`, `locationsApi.list`, `productsApi.list` |
| Locations | `locationsApi.list`, `locationsApi.create`, `locationsApi.update`, `locationsApi.delete` |
| Suppliers | `suppliersApi.list`, `suppliersApi.create`, `suppliersApi.update`, `suppliersApi.delete` |
| Customers | `customersApi.list`, `customersApi.create`, `customersApi.update`, `customersApi.delete` |
| Purchase orders | `purchaseOrdersApi.list`, `purchaseOrdersApi.create`, `suppliersApi.list`, `locationsApi.list`, `productsApi.list` |
| Sales orders | `salesOrdersApi.list`, `salesOrdersApi.create`, `salesOrdersApi.updateStatus`, `customersApi.list`, `locationsApi.list`, `productsApi.list` |
| Receipt upload | `receiptsApi.upload`, `receiptsApi.confirm`, `locationsApi.list`, `suppliersApi.list` |
| Low-stock alerts | `alertsApi.lowStock`, `alertsApi.resolve`, `alertsApi.snooze`, `locationsApi.list`, `settingsApi.get` |
| Calendar | `calendarApi.list`, `calendarApi.create`, `calendarApi.update`, `calendarApi.delete` |
| Restock settings | `settingsApi.get`, `settingsApi.update` |
| User category settings | `settingsApi.getCategories`, `settingsApi.updateCategories`, `usersApi.list` |
| Team page | `usersApi.list`, `usersApi.create`, `usersApi.update`, `usersApi.delete`, `settingsApi.getCategories`, `messagesApi.list`, `messagesApi.send`, `messagesApi.markRead`, `aiApi.chat` equivalent; currently uses raw `api.post` for `/ai/chat`. |
| Notification dropdown | `alertsApi.lowStock`, `stockApi.movements`, `productsApi.list`, `messagesApi.inbox`, `messagesApi.markRead` |
| AbiTrack AI widget | `usersApi.list`, `messagesApi.send`, `aiApi.chat` equivalent; currently uses raw `api.post` for `/ai/chat`. |

## Integration Notes

- `src/api/index.ts` now exposes helpers for all backend `/api/v1` endpoints, including auth, QR login, and AI chat.
- `GET /customers/:customerId` and `GET /sales-orders/:soId` are implemented because frontend helpers already existed for those detail endpoints.
- `stockApi.transfer` returns `{ message: string }`, matching the backend response.
- `GET /health` is outside the `/api/v1` base URL and is not wrapped by the shared frontend API client.
