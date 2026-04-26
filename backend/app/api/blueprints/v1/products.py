from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy import func
from ....extensions import db
from ....models import Product, StockLevel, Tenant, TenantSettings

bp = Blueprint("products", __name__)


def _tenant_id():
    return get_jwt()["tenantId"]


def _product_to_dict(p: Product) -> dict:
    total_stock = db.session.query(func.coalesce(func.sum(StockLevel.quantity), 0)).filter_by(product_id=p.id).scalar()
    return {
        "id": p.id,
        "sku": p.sku,
        "name": p.name,
        "description": p.description,
        "category": p.category,
        "unit": p.unit,
        "costPrice": float(p.cost_price or 0),
        "sellingPrice": float(p.selling_price or 0),
        "barcode": p.barcode,
        "tenantId": p.tenant_id,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
        "totalStock": int(total_stock),
    }


@bp.get("/products/categories")
@jwt_required()
def list_categories():
    s = TenantSettings.query.get(_tenant_id())
    managed = s.get_categories() if s else None
    if managed is not None:
        return jsonify([c["name"] for c in managed if not c.get("hidden")])
    tenant = Tenant.query.get(_tenant_id())
    cats = set()
    if tenant and tenant.category:
        cats.update(c.strip() for c in tenant.category.split(",") if c.strip())
    rows = db.session.query(Product.category).filter(
        Product.tenant_id == _tenant_id(), Product.category.isnot(None)
    ).distinct().all()
    cats.update(c for (c,) in rows if c)
    return jsonify(sorted(cats))


@bp.get("/products")
@jwt_required()
def list_products():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("pageSize", 10))
    search = request.args.get("search", "")
    category = request.args.get("category", "")

    q = Product.query.filter_by(tenant_id=_tenant_id())
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%"))
    if category:
        q = q.filter_by(category=category)

    total = q.count()
    products = q.order_by(Product.name).offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        "data": [_product_to_dict(p) for p in products],
        "total": total,
        "page": page,
        "pageSize": per_page,
        "totalPages": (total + per_page - 1) // per_page,
    })


@bp.get("/products/<product_id>")
@jwt_required()
def get_product(product_id):
    p = Product.query.filter_by(id=product_id, tenant_id=_tenant_id()).first_or_404()
    return jsonify(_product_to_dict(p))


@bp.post("/products")
@jwt_required()
def create_product():
    data = request.get_json()
    if not data.get("name") or not data.get("sku"):
        return jsonify({"message": "name and sku are required"}), 400

    if Product.query.filter_by(tenant_id=_tenant_id(), sku=data["sku"]).first():
        return jsonify({"message": "SKU already exists"}), 409

    p = Product(
        tenant_id=_tenant_id(),
        sku=data["sku"],
        name=data["name"],
        description=data.get("description"),
        category=data.get("category", "Other"),
        unit=data.get("unit", "pcs"),
        cost_price=data.get("costPrice", 0),
        selling_price=data.get("sellingPrice", 0),
        barcode=data.get("barcode"),
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(_product_to_dict(p)), 201


@bp.put("/products/<product_id>")
@jwt_required()
def update_product(product_id):
    p = Product.query.filter_by(id=product_id, tenant_id=_tenant_id()).first_or_404()
    data = request.get_json()

    p.name = data.get("name", p.name)
    p.description = data.get("description", p.description)
    p.category = data.get("category", p.category)
    p.unit = data.get("unit", p.unit)
    p.cost_price = data.get("costPrice", p.cost_price)
    p.selling_price = data.get("sellingPrice", p.selling_price)
    p.barcode = data.get("barcode", p.barcode)
    if "sku" in data and data["sku"] != p.sku:
        if Product.query.filter_by(tenant_id=_tenant_id(), sku=data["sku"]).first():
            return jsonify({"message": "SKU already exists"}), 409
        p.sku = data["sku"]

    db.session.commit()
    return jsonify(_product_to_dict(p))


@bp.delete("/products/<product_id>")
@jwt_required()
def delete_product(product_id):
    p = Product.query.filter_by(id=product_id, tenant_id=_tenant_id()).first_or_404()
    db.session.delete(p)
    db.session.commit()
    return "", 204
