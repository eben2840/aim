import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ....extensions import db
from ....models import SalesOrder, SalesOrderLine
from ....services import stock_service

bp = Blueprint("sales_orders", __name__)


def _tenant_id():
    return get_jwt()["tenantId"]


def _user_id():
    return get_jwt()["userId"]


def _generate_order_number():
    return "SO-" + str(uuid.uuid4())[:8].upper()


def _to_dict(so: SalesOrder) -> dict:
    return {
        "id": so.id,
        "orderNumber": so.order_number,
        "customerId": so.customer_id,
        "customerName": so.customer.name if so.customer else None,
        "locationId": so.location_id,
        "locationName": so.location.name if so.location else None,
        "status": so.status,
        "totalAmount": float(so.total_amount or 0),
        "createdAt": so.created_at.isoformat() if so.created_at else None,
        "lines": [
            {
                "id": l.id,
                "productId": l.product_id,
                "productName": l.product.name if l.product else "",
                "quantity": l.quantity,
                "unitPrice": float(l.unit_price or 0),
            }
            for l in so.lines
        ],
    }


@bp.get("/sales-orders")
@jwt_required()
def list_sos():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("pageSize", 10))
    status = request.args.get("status", "")
    customer_id = request.args.get("customerId", "")

    q = SalesOrder.query.filter_by(tenant_id=_tenant_id())
    if status:
        q = q.filter_by(status=status)
    if customer_id:
        q = q.filter_by(customer_id=customer_id)

    total = q.count()
    items = q.order_by(SalesOrder.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({"data": [_to_dict(so) for so in items], "total": total, "page": page, "pageSize": per_page, "totalPages": (total + per_page - 1) // per_page})


@bp.post("/sales-orders")
@jwt_required()
def create_so():
    data = request.get_json()
    if not data.get("locationId"):
        return jsonify({"message": "locationId required"}), 400

    so = SalesOrder(
        tenant_id=_tenant_id(),
        order_number=_generate_order_number(),
        customer_id=data.get("customerId"),
        location_id=data["locationId"],
        status="pending",
    )
    db.session.add(so)
    db.session.flush()

    total = 0
    for line_data in data.get("lines", []):
        qty = int(line_data.get("quantity", 0))
        unit_price = float(line_data.get("unitPrice", 0))

        # Deduct stock immediately on order creation
        try:
            stock_service.deduct_stock(
                tenant_id=_tenant_id(),
                product_id=line_data["productId"],
                location_id=data["locationId"],
                quantity=qty,
                movement_type="sale",
                reference_id=so.id,
                created_by=_user_id(),
            )
        except ValueError as e:
            db.session.rollback()
            return jsonify({"message": str(e)}), 400

        line = SalesOrderLine(
            sales_order_id=so.id,
            product_id=line_data["productId"],
            quantity=qty,
            unit_price=unit_price,
        )
        total += qty * unit_price
        db.session.add(line)

    so.total_amount = total
    db.session.commit()
    return jsonify(_to_dict(so)), 201


@bp.patch("/sales-orders/<so_id>")
@jwt_required()
def update_so_status(so_id):
    so = SalesOrder.query.filter_by(id=so_id, tenant_id=_tenant_id()).first_or_404()
    new_status = (request.get_json() or {}).get("status", so.status)

    if new_status == "cancelled" and so.status != "cancelled":
        for line in so.lines:
            stock_service.add_stock(
                tenant_id=_tenant_id(),
                product_id=line.product_id,
                location_id=so.location_id,
                quantity=line.quantity,
                movement_type="adjustment",
                note=f"Cancelled order {so.order_number}",
                reference_id=so.id,
                created_by=_user_id(),
            )

    so.status = new_status
    db.session.commit()
    return jsonify(_to_dict(so))
