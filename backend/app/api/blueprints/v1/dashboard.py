from datetime import datetime
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy import func
from ....extensions import db
from ....models import (
    Product, StockLevel, LowStockAlert, PurchaseOrder, SalesOrder,
    Location, StockMovement,
)

bp = Blueprint("dashboard", __name__)


def _tenant_id():
    return get_jwt()["tenantId"]


@bp.get("/dashboard/metrics")
@jwt_required()
def metrics():
    tid = _tenant_id()
    now = datetime.utcnow()

    total_products = Product.query.filter_by(tenant_id=tid).count()

    # Total stock value = sum(quantity * cost_price) per stock level
    stock_value_result = (
        db.session.query(func.sum(StockLevel.quantity * Product.cost_price))
        .join(Product, StockLevel.product_id == Product.id)
        .filter(Product.tenant_id == tid)
        .scalar()
    )
    total_stock_value = float(stock_value_result or 0)

    low_stock_alerts = LowStockAlert.query.filter_by(tenant_id=tid, status="active").filter(
        (LowStockAlert.snoozed_until == None) | (LowStockAlert.snoozed_until <= now)  # noqa: E711
    ).count()

    pending_purchase_orders = PurchaseOrder.query.filter_by(tenant_id=tid).filter(
        PurchaseOrder.status.in_(["draft", "sent", "partial"])
    ).count()

    pending_sales_orders = SalesOrder.query.filter_by(tenant_id=tid).filter(
        SalesOrder.status.in_(["pending", "packed", "shipped"])
    ).count()

    total_locations = Location.query.filter_by(tenant_id=tid).count()

    return jsonify({
        "totalProducts": total_products,
        "totalStockValue": total_stock_value,
        "lowStockAlerts": low_stock_alerts,
        "pendingPurchaseOrders": pending_purchase_orders,
        "pendingSalesOrders": pending_sales_orders,
        "totalLocations": total_locations,
    })


@bp.get("/dashboard/recent-movements")
@jwt_required()
def recent_movements():
    tid = _tenant_id()
    movements = (
        StockMovement.query
        .filter_by(tenant_id=tid)
        .order_by(StockMovement.created_at.desc())
        .limit(20)
        .all()
    )
    return jsonify([
        {
            "id": m.id,
            "type": m.type,
            "productId": m.product_id,
            "productName": m.product.name if m.product else "",
            "locationName": (
                (m.to_location.name if m.to_location else None) or
                (m.from_location.name if m.from_location else None)
            ),
            "quantity": m.quantity,
            "createdAt": m.created_at.isoformat() if m.created_at else None,
            "createdBy": m.created_by or "",
        }
        for m in movements
    ])
