from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ....extensions import db
from ....models import LowStockAlert

bp = Blueprint("alerts", __name__)


def _tenant_id():
    return get_jwt()["tenantId"]


def _to_dict(a: LowStockAlert) -> dict:
    return {
        "id": a.id,
        "productId": a.product_id,
        "productName": a.product.name if a.product else "",
        "sku": a.product.sku if a.product else "",
        "locationId": a.location_id,
        "locationName": a.location.name if a.location else "",
        "currentQuantity": a.current_quantity,
        "minStockLevel": a.min_stock_level,
        "reorderQuantity": a.reorder_quantity,
        "status": a.status,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
        "product": {
            "id": a.product.id, "sku": a.product.sku, "name": a.product.name,
            "category": a.product.category, "unit": a.product.unit,
            "costPrice": float(a.product.cost_price or 0),
            "sellingPrice": float(a.product.selling_price or 0),
        } if a.product else None,
        "location": {
            "id": a.location.id, "name": a.location.name, "type": a.location.type,
        } if a.location else None,
    }


@bp.get("/alerts/low-stock")
@jwt_required()
def list_low_stock():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("pageSize", 15))
    location_id = request.args.get("locationId", "")

    now = datetime.utcnow()
    q = LowStockAlert.query.filter_by(tenant_id=_tenant_id()).filter(
        LowStockAlert.status == "active"
    )
    # Exclude snoozed alerts still within snooze window
    q = q.filter(
        (LowStockAlert.snoozed_until == None) | (LowStockAlert.snoozed_until <= now)  # noqa: E711
    )
    if location_id:
        q = q.filter_by(location_id=location_id)

    total = q.count()
    items = q.order_by(LowStockAlert.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        "data": [_to_dict(a) for a in items],
        "total": total,
        "page": page,
        "pageSize": per_page,
        "totalPages": (total + per_page - 1) // per_page,
    })


@bp.post("/alerts/<alert_id>/resolve")
@jwt_required()
def resolve_alert(alert_id):
    a = LowStockAlert.query.filter_by(id=alert_id, tenant_id=_tenant_id()).first_or_404()
    a.status = "resolved"
    db.session.commit()
    return jsonify(_to_dict(a))


@bp.post("/alerts/<alert_id>/snooze")
@jwt_required()
def snooze_alert(alert_id):
    a = LowStockAlert.query.filter_by(id=alert_id, tenant_id=_tenant_id()).first_or_404()
    hours = int(request.get_json().get("hours", 24))
    a.status = "snoozed"
    a.snoozed_until = datetime.utcnow() + timedelta(hours=hours)
    db.session.commit()
    return jsonify(_to_dict(a))
