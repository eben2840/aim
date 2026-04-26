# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (React/TypeScript)
```bash
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build to ./dist
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Backend (Flask/Python)
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt

python run.py      # Dev server at http://localhost:5001

# Database migrations
flask db migrate -m "description"
flask db upgrade
```

### External services required
- **PostgreSQL** — `DATABASE_URL` in `backend/.env`
- **Redis** — `REDIS_URL` in `backend/.env` (used by Celery)
- **Anthropic API** — `ANTHROPIC_API_KEY` in `backend/.env`
- **Veryfi OCR API** — `OCR_API_KEY`, `OCR_CLIENT_ID` in `backend/.env`

Frontend env: `VITE_API_BASE_URL=http://localhost:5001/api/v1` (in root `.env`)

## Architecture

### Full-Stack Structure
- **Frontend**: React 18 + TypeScript + Vite, served at base path `/abitrack/`
- **Backend**: Flask 3 REST API at `/api/v1/`, runs on port 5001
- **Database**: PostgreSQL with SQLAlchemy ORM + Alembic migrations
- **Async tasks**: Celery + Redis (receipt processing, notifications)

### Multi-Tenancy
Every model carries a `tenant_id` (FK to `Tenant`). All queries must be scoped to the authenticated user's tenant. The JWT token carries `user_id`; look up the user to get `tenant_id`.

### Authentication & Authorization
JWT Bearer tokens (Flask-JWT-Extended). Four roles in order of privilege: `super_admin` → `business_admin` → `store_manager` → `read_only`. Role enforcement is done in the blueprint route handlers.

### Backend Layout
```
backend/app/
├── __init__.py          # Flask app factory (create_app)
├── config.py            # Config classes (Development/Production)
├── extensions.py        # db, jwt, ma (Marshmallow) singletons
├── api/blueprints/v1/   # One file per resource domain
├── models/              # SQLAlchemy models (one per file)
├── services/            # Business logic (stock, OCR, receipts)
└── workers/tasks.py     # Celery task stubs (not yet fully wired)
```

All blueprints are registered in `app/api/__init__.py`. Blueprint files follow the pattern: define routes, call service functions or query models directly, serialize with Marshmallow schemas (defined inline or in the same file).

Each blueprint extracts `tenant_id` and `user_id` from the JWT via local helpers:
```python
def _tenant_id(): return get_jwt()["tenantId"]
def _user_id():   return get_jwt()["userId"]
```

All model PKs are `String(36)` UUID strings generated at insert time.

### Frontend Layout
```
src/
├── api/
│   ├── client.ts        # Fetch wrapper — injects Bearer token, handles 401
│   └── index.ts         # All typed API call functions
├── context/             # AuthContext (user state + localStorage), ThemeContext, SidebarContext
├── types/index.ts       # Shared TypeScript types for all API entities
├── pages/               # One directory per feature/domain
└── components/common/   # Shared UI components
```

API calls go through `src/api/index.ts` which uses the client in `client.ts`. Do not call `fetch` directly in components — add functions to `api/index.ts` and call those.

### AI Chat (`backend/app/api/blueprints/v1/ai.py`)
Uses Anthropic `claude-sonnet-4-6` with tool use. The endpoint builds a live database context (stock metrics, suppliers, customers, locations) and passes it as a system prompt. Tools let Claude perform write actions (create products, adjust stock, create orders, etc.) via an agentic loop. To add a new AI capability, define a new tool schema and handle its `tool_use` response in the loop.

### Receipt Flow (two-step)
1. `POST /receipts/upload` — sends file to Veryfi OCR, persists a `Receipt` in `pending_confirmation` state, returns suggested line items.
2. `POST /receipts/confirm` — user approves line items; calls `stock_service.add_stock()` per line, transitions receipt to `confirmed`.

### Stock Movements
Every inventory change must create a `StockMovement` record alongside updating `StockLevel`. Valid `type` values: `receipt`, `sale`, `transfer_in`, `transfer_out`, `adjustment`. Do not modify `StockLevel` without a corresponding movement. `reference_id` links the movement back to the originating PO/SO/Receipt.

## Code Style Notes
- Keep page components under ~100 lines — split into smaller components if needed.
- Marshmallow schemas are defined alongside their blueprints, not in a separate schemas directory.
- No tests exist in this codebase yet.
