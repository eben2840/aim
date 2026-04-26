import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ....extensions import db
from ....models import PurchaseOrder, PurchaseOrderLine, Product
from ....services import stock_service

bp = Blueprint("purchase_orders", __name__)


def _tenant_id():
    return get_jwt()["tenantId"]


def _user_id():
    return get_jwt()["userId"]


def _generate_order_number():
    return "PO-" + str(uuid.uuid4())[:8].upper()


def _to_dict(po: PurchaseOrder) -> dict:
    return {
        "id": po.id,
        "orderNumber": po.order_number,
        "supplierId": po.supplier_id,
        "supplierName": po.supplier.name if po.supplier else "",
        "locationId": po.location_id,
        "locationName": po.location.name if po.location else "",
        "status": po.status,
        "expectedDeliveryDate": po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
        "totalAmount": float(po.total_amount or 0),
        "createdAt": po.created_at.isoformat() if po.created_at else None,
        "createdBy": po.created_by or "",
        "lines": [
            {
                "id": l.id,
                "productId": l.product_id,
                "productName": l.product.name if l.product else "",
                "sku": l.product.sku if l.product else "",
                "quantity": l.quantity,
                "unitCost": float(l.unit_cost or 0),
                "receivedQuantity": l.received_quantity,
            }
            for l in po.lines
        ],
    }


@bp.get("/purchase-orders")
@jwt_required()
def list_pos():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("pageSize", 10))
    status = request.args.get("status", "")
    supplier_id = request.args.get("supplierId", "")

    q = PurchaseOrder.query.filter_by(tenant_id=_tenant_id())
    if status:
        q = q.filter_by(status=status)
    if supplier_id:
        q = q.filter_by(supplier_id=supplier_id)

    total = q.count()
    items = q.order_by(PurchaseOrder.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({"data": [_to_dict(po) for po in items], "total": total, "page": page, "pageSize": per_page, "totalPages": (total + per_page - 1) // per_page})


@bp.get("/purchase-orders/<po_id>")
@jwt_required()
def get_po(po_id):
    po = PurchaseOrder.query.filter_by(id=po_id, tenant_id=_tenant_id()).first_or_404()
    return jsonify(_to_dict(po))


@bp.post("/purchase-orders")
@jwt_required()
def create_po():
    data = request.get_json()
    if not data.get("supplierId") or not data.get("locationId"):
        return jsonify({"message": "supplierId and locationId required"}), 400

    po = PurchaseOrder(
        tenant_id=_tenant_id(),
        order_number=_generate_order_number(),
        supplier_id=data["supplierId"],
        location_id=data["locationId"],
        expected_delivery_date=data.get("expectedDeliveryDate"),
        status="draft",
        created_by=_user_id(),
    )
    db.session.add(po)
    db.session.flush()

    total = 0
    for line_data in data.get("lines", []):
        line = PurchaseOrderLine(
            purchase_order_id=po.id,
            product_id=line_data["productId"],
            quantity=line_data["quantity"],
            unit_cost=line_data.get("unitCost", 0),
            received_quantity=0,
        )
        total += line.quantity * float(line.unit_cost or 0)
        db.session.add(line)

    po.total_amount = total
    db.session.commit()
    return jsonify(_to_dict(po)), 201


@bp.put("/purchase-orders/<po_id>")
@jwt_required()
def update_po(po_id):
    po = PurchaseOrder.query.filter_by(id=po_id, tenant_id=_tenant_id()).first_or_404()
    data = request.get_json()
    po.status = data.get("status", po.status)
    po.expected_delivery_date = data.get("expectedDeliveryDate", po.expected_delivery_date)
    db.session.commit()
    return jsonify(_to_dict(po))


@bp.post("/purchase-orders/<po_id>/receipts")
@jwt_required()
def receive_po(po_id):
    """Receive (partially or fully) against a purchase order and update stock."""
    po = PurchaseOrder.query.filter_by(id=po_id, tenant_id=_tenant_id()).first_or_404()
    data = request.get_json()

    for receipt_line in data.get("lines", []):
        line = PurchaseOrderLine.query.filter_by(id=receipt_line["lineId"], purchase_order_id=po_id).first()
        if not line:
            continue
        qty = int(receipt_line.get("receivedQuantity", 0))
        if qty <= 0:
            continue

        line.received_quantity += qty
        stock_service.add_stock(
            tenant_id=_tenant_id(),
            product_id=line.product_id,
            location_id=po.location_id,
            quantity=qty,
            movement_type="receipt",
            cost_per_unit=float(line.unit_cost or 0),
            reference_id=po.id,
            created_by=_user_id(),
        )

    # Update PO status
    all_lines = po.lines
    if all(l.received_quantity >= l.quantity for l in all_lines):
        po.status = "received"
    elif any(l.received_quantity > 0 for l in all_lines):
        po.status = "partial"

    db.session.commit()
    return jsonify(_to_dict(po))
