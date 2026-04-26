from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ....extensions import db
from ....models import StockLevel, StockMovement, Product, Location
from ....services import stock_service

bp = Blueprint("stock", __name__)


def _tenant_id():
    return get_jwt()["tenantId"]


def _user_id():
    return get_jwt()["userId"]


def _stock_level_to_dict(s: StockLevel) -> dict:
    return {
        "id": s.id,
        "productId": s.product_id,
        "locationId": s.location_id,
        "quantity": s.quantity,
        "minStockLevel": s.min_stock_level,
        "reorderQuantity": s.reorder_quantity,
        "product": {
            "id": s.product.id,
            "sku": s.product.sku,
            "name": s.product.name,
            "category": s.product.category,
            "unit": s.product.unit,
            "costPrice": float(s.product.cost_price or 0),
            "sellingPrice": float(s.product.selling_price or 0),
        } if s.product else None,
        "location": {
            "id": s.location.id,
            "name": s.location.name,
            "type": s.location.type,
        } if s.location else None,
    }


def _movement_to_dict(m: StockMovement) -> dict:
    return {
        "id": m.id,
        "type": m.type,
        "productId": m.product_id,
        "productName": m.product.name if m.product else "",
        "fromLocationId": m.from_location_id,
        "toLocationId": m.to_location_id,
        "locationName": (m.to_location.name if m.to_location else None) or (m.from_location.name if m.from_location else None),
        "quantity": m.quantity,
        "costPerUnit": float(m.cost_per_unit) if m.cost_per_unit else None,
        "note": m.note,
        "createdAt": m.created_at.isoformat() if m.created_at else None,
        "createdBy": m.created_by or "",
    }


@bp.get("/stock")
@jwt_required()
def list_stock():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("pageSize", 15))
    location_id = request.args.get("locationId")
    search = request.args.get("search", "")

    q = (
        db.session.query(StockLevel)
        .join(StockLevel.product)
        .join(StockLevel.location)
        .filter(Product.tenant_id == _tenant_id())
    )
    if location_id:
        q = q.filter(StockLevel.location_id == location_id)
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%"))

    total = q.count()
    levels = q.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        "data": [_stock_level_to_dict(s) for s in levels],
        "total": total,
        "page": page,
        "pageSize": per_page,
        "totalPages": (total + per_page - 1) // per_page,
    })


@bp.get("/stock/<location_id>")
@jwt_required()
def stock_by_location(location_id):
    Location.query.filter_by(id=location_id, tenant_id=_tenant_id()).first_or_404()
    levels = (
        db.session.query(StockLevel)
        .join(StockLevel.product)
        .filter(StockLevel.location_id == location_id)
        .all()
    )
    return jsonify([_stock_level_to_dict(s) for s in levels])


@bp.put("/stock/adjust")
@jwt_required()
def adjust_stock():
    data = request.get_json()
    product_id = data.get("productId")
    location_id = data.get("locationId")
    quantity = data.get("quantity")
    if product_id is None or location_id is None or quantity is None:
        return jsonify({"message": "productId, locationId, quantity required"}), 400

    try:
        stock = stock_service.adjust_stock(
            tenant_id=_tenant_id(),
            product_id=product_id,
            location_id=location_id,
            new_quantity=int(quantity),
            note=data.get("note"),
            created_by=_user_id(),
        )
        db.session.commit()
        return jsonify(_stock_level_to_dict(stock))
    except ValueError as e:
        return jsonify({"message": str(e)}), 400


@bp.post("/stock/transfer")
@jwt_required()
def transfer_stock():
    data = request.get_json()
    required = ["productId", "fromLocationId", "toLocationId", "quantity"]
    if any(data.get(k) is None for k in required):
        return jsonify({"message": f"Required: {required}"}), 400

    try:
        _, _ = stock_service.transfer_stock(
            tenant_id=_tenant_id(),
            product_id=data["productId"],
            from_location_id=data["fromLocationId"],
            to_location_id=data["toLocationId"],
            quantity=int(data["quantity"]),
            note=data.get("note"),
            created_by=_user_id(),
        )
        db.session.commit()
        return jsonify({"message": "Transfer successful"})
    except ValueError as e:
        return jsonify({"message": str(e)}), 400


@bp.post("/stock/deduct")
@jwt_required()
def deduct_stock():
    data = request.get_json()
    product_id = data.get("productId")
    location_id = data.get("locationId")
    quantity = data.get("quantity")
    if not product_id or not location_id or not quantity:
        return jsonify({"message": "productId, locationId, quantity required"}), 400
    try:
        stock = stock_service.deduct_stock(
            tenant_id=_tenant_id(),
            product_id=product_id,
            location_id=location_id,
            quantity=int(quantity),
            movement_type="adjustment",
            note=data.get("note") or "Manual deduction",
            created_by=_user_id(),
        )
        db.session.commit()
        return jsonify(_stock_level_to_dict(stock))
    except ValueError as e:
        return jsonify({"message": str(e)}), 400


@bp.get("/stock/movements")
@jwt_required()
def list_movements():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("pageSize", 20))
    product_id = request.args.get("productId")
    location_id = request.args.get("locationId")

    q = StockMovement.query.filter_by(tenant_id=_tenant_id())
    if product_id:
        q = q.filter_by(product_id=product_id)
    if location_id:
        q = q.filter(
            (StockMovement.from_location_id == location_id) |
            (StockMovement.to_location_id == location_id)
        )

    total = q.count()
    movements = q.order_by(StockMovement.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        "data": [_movement_to_dict(m) for m in movements],
        "total": total,
        "page": page,
        "pageSize": per_page,
        "totalPages": (total + per_page - 1) // per_page,
    })
