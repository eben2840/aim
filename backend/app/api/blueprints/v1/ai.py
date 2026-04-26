import os
import uuid
import time
from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy import func
from ....extensions import db
from ....models import (
    Product, StockLevel, StockMovement, LowStockAlert, PurchaseOrder, PurchaseOrderLine,
    SalesOrder, SalesOrderLine, Supplier, Customer, Location, CalendarEvent, User, Message
)

bp = Blueprint("ai", __name__)

# ── Tools ──────────────────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "create_supplier",
        "description": "Add a new supplier to the system",
        "input_schema": {"type": "object", "required": ["name"], "properties": {
            "name": {"type": "string"},
            "email": {"type": "string"},
            "phone": {"type": "string"},
            "contact_person": {"type": "string"},
        }},
    },
    {
        "name": "create_customer",
        "description": "Add a new customer to the system",
        "input_schema": {"type": "object", "required": ["name"], "properties": {
            "name": {"type": "string"},
            "email": {"type": "string"},
            "phone": {"type": "string"},
            "type": {"type": "string", "enum": ["retail", "wholesale", "b2b"]},
        }},
    },
    {
        "name": "create_product",
        "description": "Add a new product to inventory",
        "input_schema": {"type": "object", "required": ["name", "sku", "category", "unit"], "properties": {
            "name": {"type": "string"},
            "sku": {"type": "string"},
            "category": {"type": "string"},
            "unit": {"type": "string"},
            "cost_price": {"type": "number"},
            "selling_price": {"type": "number"},
        }},
    },
    {
        "name": "adjust_stock",
        "description": "Add or remove stock for a product at a location",
        "input_schema": {"type": "object", "required": ["product_name", "quantity"], "properties": {
            "product_name": {"type": "string"},
            "quantity": {"type": "integer", "description": "Positive to add, negative to remove"},
            "location_name": {"type": "string"},
            "note": {"type": "string"},
        }},
    },
    {
        "name": "create_purchase_order",
        "description": "Create a purchase order for a supplier",
        "input_schema": {"type": "object", "required": ["supplier_name"], "properties": {
            "supplier_name": {"type": "string"},
            "notes": {"type": "string"},
        }},
    },
    {
        "name": "create_sales_order",
        "description": "Create a sales order for a customer",
        "input_schema": {"type": "object", "required": ["location_name"], "properties": {
            "customer_name": {"type": "string"},
            "location_name": {"type": "string"},
            "notes": {"type": "string"},
        }},
    },
    {
        "name": "create_calendar_event",
        "description": "Create a meeting, reminder or calendar event",
        "input_schema": {"type": "object", "required": ["title", "start_date"], "properties": {
            "title": {"type": "string"},
            "start_date": {"type": "string", "description": "YYYY-MM-DD"},
            "end_date": {"type": "string", "description": "YYYY-MM-DD"},
            "color": {"type": "string", "enum": ["Primary", "Success", "Warning", "Danger"]},
        }},
    },
    {
        "name": "resolve_low_stock_alert",
        "description": "Resolve a low stock alert for a product",
        "input_schema": {"type": "object", "required": ["product_name"], "properties": {
            "product_name": {"type": "string"},
        }},
    },
    {
        "name": "update_product_price",
        "description": "Update the cost price or selling price of a product",
        "input_schema": {"type": "object", "required": ["product_name"], "properties": {
            "product_name": {"type": "string"},
            "cost_price": {"type": "number"},
            "selling_price": {"type": "number"},
        }},
    },
    {
        "name": "get_stock_report",
        "description": "Get detailed stock levels for all products or a specific product",
        "input_schema": {"type": "object", "properties": {
            "product_name": {"type": "string", "description": "Leave empty for all products"},
        }},
    },
    {
        "name": "send_message",
        "description": "Send a direct message to a team member by name",
        "input_schema": {"type": "object", "required": ["recipient_name", "body"], "properties": {
            "recipient_name": {"type": "string", "description": "Name of the team member to message"},
            "body": {"type": "string", "description": "The message content to send"},
        }},
    },
]

# ── Tool execution ─────────────────────────────────────────────────────────────

def _find(model, tenant_id: str, name: str):
    return model.query.filter(
        model.tenant_id == tenant_id,
        model.name.ilike(f"%{name}%")
    ).first()


def run_tool(name: str, inp: dict, tenant_id: str, sender_id: str = None) -> str:
    try:
        if name == "create_supplier":
            obj = Supplier(tenant_id=tenant_id, name=inp["name"],
                           email=inp.get("email"), phone=inp.get("phone"),
                           contact_person=inp.get("contact_person"))
            db.session.add(obj); db.session.commit()
            return f"✅ Supplier '{obj.name}' added"

        if name == "create_customer":
            obj = Customer(tenant_id=tenant_id, name=inp["name"],
                           email=inp.get("email"), phone=inp.get("phone"),
                           type=inp.get("type", "retail"))
            db.session.add(obj); db.session.commit()
            return f"✅ Customer '{obj.name}' added"

        if name == "create_product":
            obj = Product(tenant_id=tenant_id, name=inp["name"], sku=inp["sku"],
                          category=inp["category"], unit=inp["unit"],
                          cost_price=inp.get("cost_price", 0),
                          selling_price=inp.get("selling_price", 0))
            db.session.add(obj); db.session.commit()
            return f"✅ Product '{obj.name}' (SKU: {obj.sku}) added"

        if name == "adjust_stock":
            product = _find(Product, tenant_id, inp["product_name"])
            if not product:
                return f"❌ Product '{inp['product_name']}' not found"
            location = None
            if inp.get("location_name"):
                location = _find(Location, tenant_id, inp["location_name"])
            if not location:
                location = Location.query.filter_by(tenant_id=tenant_id).first()
            if not location:
                return "❌ No location found — create a location first"
            stock = StockLevel.query.filter_by(product_id=product.id, location_id=location.id).first()
            if not stock:
                stock = StockLevel(product_id=product.id, location_id=location.id, quantity=0)
                db.session.add(stock)
            qty = int(inp["quantity"])
            stock.quantity = max(0, stock.quantity + qty)
            movement = StockMovement(
                tenant_id=tenant_id,
                product_id=product.id,
                to_location_id=location.id if qty > 0 else None,
                from_location_id=location.id if qty < 0 else None,
                type="adjustment",
                quantity=abs(qty),
                note=inp.get("note", "AI adjustment"),
            )
            db.session.add(movement); db.session.commit()
            action = "added to" if qty > 0 else "removed from"
            return f"✅ {abs(qty)} units {action} '{product.name}' at {location.name} (new stock: {stock.quantity})"

        if name == "create_purchase_order":
            supplier = _find(Supplier, tenant_id, inp["supplier_name"])
            po = PurchaseOrder(
                tenant_id=tenant_id,
                supplier_id=supplier.id if supplier else None,
                status="draft", notes=inp.get("notes"),
            )
            db.session.add(po); db.session.commit()
            s = f"with '{supplier.name}'" if supplier else "(supplier not matched — update manually)"
            return f"✅ Purchase order created {s} — status: draft"

        if name == "create_sales_order":
            location = _find(Location, tenant_id, inp["location_name"])
            if not location:
                return f"❌ Location '{inp['location_name']}' not found"
            customer = _find(Customer, tenant_id, inp["customer_name"]) if inp.get("customer_name") else None
            num = f"SO-{uuid.uuid4().hex[:6].upper()}"
            so = SalesOrder(
                tenant_id=tenant_id, order_number=num,
                customer_id=customer.id if customer else None,
                location_id=location.id, status="pending",
            )
            db.session.add(so); db.session.commit()
            c = f"for '{customer.name}'" if customer else ""
            return f"✅ Sales order {num} created {c}"

        if name == "create_calendar_event":
            obj = CalendarEvent(tenant_id=tenant_id, title=inp["title"],
                                start_date=inp["start_date"],
                                end_date=inp.get("end_date"),
                                color=inp.get("color", "Primary"))
            db.session.add(obj); db.session.commit()
            return f"✅ '{obj.title}' added to calendar on {obj.start_date}"

        if name == "resolve_low_stock_alert":
            product = _find(Product, tenant_id, inp["product_name"])
            if not product:
                return f"❌ Product '{inp['product_name']}' not found"
            alert = LowStockAlert.query.filter_by(product_id=product.id, status="active").first()
            if not alert:
                return f"No active alert found for '{product.name}'"
            alert.status = "resolved"
            db.session.commit()
            return f"✅ Low stock alert for '{product.name}' resolved"

        if name == "update_product_price":
            product = _find(Product, tenant_id, inp["product_name"])
            if not product:
                return f"❌ Product '{inp['product_name']}' not found"
            if "cost_price" in inp: product.cost_price = inp["cost_price"]
            if "selling_price" in inp: product.selling_price = inp["selling_price"]
            db.session.commit()
            return f"✅ '{product.name}' updated — cost: ${product.cost_price}, selling: ${product.selling_price}"

        if name == "get_stock_report":
            filters = [Product.tenant_id == tenant_id]
            if inp.get("product_name"):
                filters.append(Product.name.ilike(f"%{inp['product_name']}%"))
            products = Product.query.filter(*filters).limit(20).all()
            lines = []
            for p in products:
                qty = db.session.query(func.coalesce(func.sum(StockLevel.quantity), 0)).filter_by(product_id=p.id).scalar()
                lines.append(f"• {p.name} (SKU: {p.sku}): {qty} {p.unit}")
            return "\n".join(lines) if lines else "No products found"

        if name == "send_message":
            recipient = User.query.filter(
                User.tenant_id == tenant_id,
                User.name.ilike(f"%{inp['recipient_name']}%")
            ).first()
            if not recipient:
                return f"❌ Team member '{inp['recipient_name']}' not found"
            msg = Message(tenant_id=tenant_id, sender_id=sender_id, recipient_id=recipient.id, body=inp["body"])
            db.session.add(msg)
            db.session.commit()
            return f"✅ Message sent to {recipient.name}"

        return f"Unknown tool: {name}"
    except Exception as e:
        db.session.rollback()
        return f"❌ Error: {str(e)}"


# ── DB context ─────────────────────────────────────────────────────────────────

def _db_context(tenant_id: str) -> str:
    total = Product.query.filter_by(tenant_id=tenant_id).count()
    value = db.session.query(func.sum(StockLevel.quantity * Product.cost_price)).join(Product).filter(Product.tenant_id == tenant_id).scalar() or 0
    alerts = LowStockAlert.query.filter_by(tenant_id=tenant_id, status="active").count()
    pending_po = PurchaseOrder.query.filter(PurchaseOrder.tenant_id == tenant_id, PurchaseOrder.status.in_(["draft", "sent", "partial"])).count()
    pending_so = SalesOrder.query.filter(SalesOrder.tenant_id == tenant_id, SalesOrder.status.in_(["pending", "packed"])).count()
    suppliers = [s.name for s in Supplier.query.filter_by(tenant_id=tenant_id).limit(15).all()]
    customers = [c.name for c in Customer.query.filter_by(tenant_id=tenant_id).limit(15).all()]
    locations = [l.name for l in Location.query.filter_by(tenant_id=tenant_id).all()]
    team = [u.name for u in User.query.filter_by(tenant_id=tenant_id, is_active=True).all()]

    return f"""Live business data:
- Products: {total} | Stock value: ${value:,.2f} | Low-stock alerts: {alerts}
- Pending purchase orders: {pending_po} | Pending sales orders: {pending_so}
- Suppliers: {', '.join(suppliers) or 'none'}
- Customers: {', '.join(customers) or 'none'}
- Locations: {', '.join(locations) or 'none'}
- Team members: {', '.join(team) or 'none'}"""


# ── Chat endpoint ──────────────────────────────────────────────────────────────

@bp.post("/ai/chat")
@jwt_required()
def chat():
    claims = get_jwt()
    tenant_id = claims["tenantId"]
    user_id = claims["userId"]
    data = request.get_json()
    message = (data.get("message") or "").strip()
    history = data.get("history", [])

    if not message:
        return jsonify({"message": "Message is required"}), 400

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return jsonify({"message": "ANTHROPIC_API_KEY not configured"}), 503

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    system = f"""You are AbiTrack, a smart Personal Assistant built into an inventory management platform.
You can answer questions AND take real actions directly in the system.

What you can do:
- Add suppliers, customers, products
- Adjust stock levels (add/remove inventory)
- Create purchase orders and sales orders
- Schedule meetings and calendar events
- Resolve low stock alerts
- Update product prices
- Report on current stock levels
- Send direct messages to team members (use send_message tool when user tags someone with @)

{_db_context(tenant_id)}
Today: {date.today().isoformat()}

When asked to do something, use tools. Do multiple actions in one go if needed.
Be concise and confirm what you did."""

    messages = [{"role": h["role"], "content": h["content"]} for h in history[-10:] if h.get("role") in ("user", "assistant")]
    messages.append({"role": "user", "content": message})

    while True:
        response = None
        for attempt in range(3):
            try:
                response = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=1024,
                    system=system,
                    tools=TOOLS,
                    messages=messages,
                )
                break
            except anthropic.APIStatusError as e:
                if e.status_code == 529 and attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                return jsonify({"message": "AI service error. Please try again."}), 503

        tool_uses = [b for b in response.content if b.type == "tool_use"]

        if not tool_uses:
            reply = "\n".join(b.text for b in response.content if b.type == "text") or "Done!"
            return jsonify({"reply": reply})

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": [
            {"type": "tool_result", "tool_use_id": t.id, "content": run_tool(t.name, t.input, tenant_id, user_id)}
            for t in tool_uses
        ]})
