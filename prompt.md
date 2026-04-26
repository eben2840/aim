You are a senior SaaS product architect and full‑stack engineer. Design a modern, production‑ready inventory‑management SaaS platform called “AbiTrack” that helps small and medium businesses (retail, e‑commerce, warehouse, and light‑manufacturing) track stock, orders, and suppliers in the cloud.
DONT WRITE ANY PAGE MORE THAN 100 PAGE OF CODE. NO IN THE MOMENT CODE, PRODUCTION SIMPLE CODE, NO OVER ENGERINERING!!! SIMPLE CLEAN CODE!

---

### 1. Product vision and positioning

- Build a cloud‑first inventory‑management SaaS that handles:
  - Real‑time stock tracking across multiple locations/warehouses.
  - Procurement, orders, and supplier management.
  - Integration with e‑commerce, POS, and accounting systems via REST API [web:5][web:21][web:24].
- Position it as:
  - Developer‑friendly (strong API, webhooks, docs).
  - Affordable with a free tier and usage‑based or tiered pricing.
  - Customizable so businesses can adapt it to their workflows without heavy dev work.

---

### 2. Core capabilities

Describe and design support for these core areas:

1. **Inventory & stock management**
   - Track SKUs, variants, categories, and units of measure.
   - Support:
     - Multi‑location / multi‑warehouse stock.
     - Stock transfers between locations.
     - Stock adjustments (write‑offs, damages, corrections).
     - Minimum stock levels and reorder alerts [web:21][web:24][web:26].
   - Optional: barcode/QR or RFID‑style scanning (conceptually, not device‑specific).

2. **Order & purchasing**
   - Purchase orders to suppliers with:
     - Expected delivery dates.
     - Receipts against POs (partial/full).
   - Sales order management (manual or synced from external systems).
   - Basic fulfillment and shipping status (e.g., “packed”, “shipped”, “delivered”) [web:21][web:24].

3. **Suppliers & customers**
   - Supplier directory: contact info, lead time, payment terms, performance metrics.
   - Customer directory (for B2B) with basic contact and order history.

4. **Forecasting & analytics**
   - Demand forecasting (simplified, e.g., based on moving‑average or configurable rules).
   - Stock‑level and sales dashboards.
   - Reports on:
     - Stock turnover.
     - Dead stock / low‑moving items.
     - Stock‑value and COGS (at a basic level) [web:21][web:24][web:26].

5. **Integration & API**
   - Design a RESTful API that exposes:
     - Products, stock, orders, suppliers, and customers.
     - Events/webhooks for inventory changes and order updates.
   - Assume future integrations with:
     - Popular e‑commerce platforms (Shopify, WooCommerce, etc.).
     - Accounting systems (e.g., Xero, QuickBooks conceptually).
   - Make the API “developer‑friendly” with clear docs, auth, and rate limits [web:5][web:24].

---

### 3. User experience (UX) requirements

- Multi‑role web app:
  - Super‑admin (tenant management if multi‑tenant).
  - Business admin (full config: products, locations, suppliers).
  - Store manager / warehouse user (stock, orders, transfers).
  - Read‑only user (owners, accountants).
- Core pages / flows:
  - Dashboard: stock overview, recent orders, low‑stock alerts.
  - Products list + create/edit form.
  - Stock view by location (with filters and search).
  - Create/edit purchase orders and sales orders.
  - Transfer stocks between locations.
  - Reports page with visual KPIs (charts and tables).
- Keep the UI simple, responsive, and mobile‑friendly.

---

### 4. Technical architecture (cloud‑native SaaS)

Define a high‑level stack and architecture, assuming:

- Backend: **Python** with REST API (you will design this in Flask with clean Blueprint‑style modules).
- Frontend: **TypeScript + React/JSX** (I already have the UI components; no backend logic yet).
- Database: relational DB (e.g., PostgreSQL) plus optional caching (Redis).
- Hosting: cloud‑native (AWS / GCP / Azure‑style) with:
  - API servers.
  - Queue/worker system for async tasks (e.g., report generation, OCR processing, data sync).
  - Storage for documents (PO PDFs, reports, etc.).

Architectural requirements:

- Multi‑tenant or single‑tenant (specify and justify).
- Tenant isolation (data, configuration).
- Authentication:
  - Email/password.
  - Optional OAuth2 / OIDC (Google, GitHub, or IdP).
- Role‑based access control (RBAC) for the UI and API.
- Audit logging for key actions (who changed stock, who created orders, etc.).

---

### 5. Data model (ER‑level)

Design a minimal but complete domain model including:

- Tenants / Organizations (if multi‑tenant).
- Users, Roles, Permissions.
- Products / SKUs (with name, SKU, category, unit, price bands).
- Locations / Warehouses.
- Inventory (stock levels per product per location).
- Stock movements (transfer, adjustment, receipt, sale).
- Suppliers and Customers.
- Purchase Orders and Sales Orders (with line items).
- Audit logs and system events.

Describe the main entities and key relationships (no need for full SQL yet, but be precise).

---

### 6. API spec (high‑level)

Sketch a REST‑style API contract including:

- Endpoints:
  - GET /products, POST /products, etc.
  - GET /stock, GET /stock/{locationId}, PUT /stock/adjust, PATCH /stock (for example).
  - POST /purchase-orders, GET /purchase-orders/{id}/receipts.
  - POST /sales-orders.
  - POST /webhooks (registering callbacks).
- Authentication:
  - OAuth2 / JWT or API keys.
- Response format:
  - JSON.
  - Pagination, filtering, and error codes.
- Example request/response pairs for:
  - Creating a product.
  - Receiving a purchase order (updating stock).
  - Querying current stock by location.

---

### 7. Non‑functional requirements

Include:

- Security:
  - HTTPS, secure auth, secrets management, rate limiting.
  - Principle of least privilege for roles.
- Scalability:
  - Support thousands of SKUs and locations per tenant.
  - Horizontal scaling of API and workers.
- Observability:
  - Logging, metrics, and health checks.
- Reliability:
  - Idempotent APIs for key operations (e.g., stock updates).
  - Background jobs for slow ops (reports, syncs).

---

### 8. Growth and monetization hints

Even if you don’t design billing, outline:

- Possible pricing tiers:
  - Free tier: limited SKUs, single location, basic reporting.
  - Paid tiers: more locations, advanced reporting, integrations.
- What features would be “premium” vs “core free”:
  - Advanced forecasting, multi‑warehouse, detailed analytics, custom integrations, SLA support.

---

### 9. New requirement: Receipt/invoice OCR → inventory + low‑stock alerts

Add the following capability on top of the above spec:

1. **Image‑based receipt/invoice upload**
   - Users can:
     - Take a photo or upload a PDF of a supplier receipt or invoice from the web UI.
     - See extracted line items before confirming.
   - The backend must:
     - Expose an API endpoint to upload the image/PDF.
     - Send it to a **receipt/invoice OCR service** (assume a third‑party API like Veryfi, Taggun, or a generic “receipt/invoice OCR API”).
     - Parse the structured JSON response (items, quantities, prices, dates, supplier).
   - For each line item:
     - Automatically:
       - Creates or matches a **Product/SKU** (by name, barcode, or SKU).
       - Creates a **Stock Receipt / Purchase Order Receipt** that:
         - Increases stock in the specified **Location/Warehouse**.
         - Records cost, quantity, and receipt date.
         - Links to a **Supplier**.
     - Returns a list of suggested line items to the frontend for user confirmation.

2. **Low‑stock / out‑of‑stock alerts**
   - Each product SKU has:
     - A configurable **minimum stock level** per location.
     - An optional **reorder quantity**.
   - Whenever stock is reduced (sale, adjustment, transfer‑out):
     - The backend checks if current stock < minimum.
     - If yes, triggers:
       - A **low‑stock alert event** stored in the DB.
       - Optionally emits an event (e.g., via queue or webhook) for async notifications.
   - Users can:
     - View active low‑stock alerts in the dashboard.
     - Optionally generate a suggested purchase order (bulk reorder) from the UI.
   - The frontend should poll or subscribe to:
     - A low‑stock alert API endpoint (e.g., GET /api/v1/alerts/low-stock).

---

### 10. Frontend integration (TypeScript + React/JSX)

- My existing frontend is:
  - React + TypeScript, using JSX components.
  - Router‑based (e.g., React Router).
  - No backend logic yet: no API calls, no state management beyond minimal UI state.
- You must:
  1. **Stick to the API spec above** and **extend it** to include:
     - POST /api/v1/receipts/upload
     - POST /api/v1/receipts/confirm
     - GET /api/v1/alerts/low-stock
  2. **Show how the frontend connects** to those endpoints, including:
     - Example HTTP calls using `fetch` or `axios`.
     - How to handle:
       - Upload of image/PDF for OCR.
       - Display of parsed line items.
       - Confirmation of receipt data → stock update.
       - Polling for low‑stock alerts.
     3. Example component‑level snippets:
        - A “Receipt Upload” page React component wired to `POST /api/v1/receipts/upload`.
        - A “Dashboard” page that fetches and displays low‑stock alerts.
        - A “Products” page that lists SKUs and minimum stock levels.
   4. Keep the frontend wiring **implementation‑ready but not exhaustive** (don’t rewrite the entire app).

---

### 11. Backend architecture (Python, Flask, Blueprint‑style)

Design a backend in **Python** (Flask) using a **clean Blueprint‑style, modular structure**:

1. **Project structure**
   - Use a modular layout like:
     - app/
       - __init__.py (Flask app factory)
       - config.py
       - extensions.py (db, migrate, marshmallow, celery)
       - models/
         - user.py
         - tenant.py
         - product.py
         - location.py
         - stock.py
         - stock_movement.py
         - receipt.py
         - purchase_order.py
         - sales_order.py
         - supplier.py
         - customer.py
         - alert.py
       - services/
         - receipt_service.py
         - stock_service.py
         - alert_service.py
         - order_service.py
       - api/
         - blueprints/
           - v1/
             - __init__.py
             - auth.py
             - users.py
             - products.py
             - locations.py
             - stock.py
             - receipts.py
             - purchase_orders.py
             - sales_orders.py
             - alerts.py
         - __init__.py
       - workers/
         - tasks.py
   - All routes live under Blueprints (e.g., `api/v1/products`, `api/v1/receipts`).

2. **OCR integration layer**
   - A service module (e.g., `ocr_service.py`) that:
     - Accepts an uploaded image/PDF.
     - Calls a third‑party receipt/invoice OCR API (treat as black‑box; define interface and expected JSON).
     - Parses the response and returns a structured list of line items.
   - Expose:
     - POST /api/v1/receipts/upload
   - The flow:
     - Upload → call OCR API → return parsed line items to frontend.
     - Then user confirms → POST /api/v1/receipts/confirm to persist as stock receipt.

3. **Low‑stock alerting subsystem**
   - Part of the `stock_service`:
     - After any stock mutation (receipt, adjustment, transfer, etc.):
       - Check if current stock < minimum for that product/location.
       - If yes, create/record a `LowStockAlert`.
   - Expose:
     - GET /api/v1/alerts/low-stock.
     - Optionally POST /api/v1/alerts/resolve.

4. **Authentication & security**
   - JWT‑style auth or OAuth2/OIDC.
   - Protected routes (e.g., `@login_required`).
   - RBAC aligned with frontend roles.

5. **API contracts**
   - List key endpoints (GET /products, GET /stock, GET /alerts/low-stock, POST /receipts/upload, etc.).
   - For each, define:
     - Method.
     - Request body.
     - Response shape.
     - Example request/response.

---

### 12. Output format

Produce a **single, structured spec document** that includes:

1. **Product overview** (1–2 paragraphs) covering:
   - Vision, positioning, and OCR + low‑stock‑alert flows.
2. **User personas and key workflows**, including:
   - User uploads receipt → sees parsed items → confirms → stock updates + alerts.
3. **High‑level architecture**:
   - Cloud‑native stack, modules, data flow (text‑level diagram).
4. **Detailed domain model** (entities + relationships).
5. **Complete API spec**:
   - REST resources, methods, bodies, responses (including OCR + alert endpoints).
6. **Frontend–backend integration**:
   - How React components map to endpoints.
   - Example hooks/API functions for upload, alerts, stock, and orders.
7. **Brief implementation roadmap**:
   - Phase 1: Core inventory + receipt upload + simple alerts.
   - Phase 2: Orders, suppliers, analytics.
   - Phase 3: Advanced reporting, integrations, forecasting.

