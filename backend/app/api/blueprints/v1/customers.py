from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ....extensions import db
from ....models import Customer, SalesOrder

bp = Blueprint("customers", __name__)


def _tenant_id():
    return get_jwt()["tenantId"]


def _to_dict(c: Customer) -> dict:
    total_orders = SalesOrder.query.filter_by(customer_id=c.id).count()
    return {
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "address": c.address,
        "type": c.type,
        "tenantId": c.tenant_id,
        "totalOrders": total_orders,
    }


@bp.get("/customers")
@jwt_required()
def list_customers():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("pageSize", 10))
    search = request.args.get("search", "")
    ctype = request.args.get("type", "")

    q = Customer.query.filter_by(tenant_id=_tenant_id())
    if search:
        q = q.filter(Customer.name.ilike(f"%{search}%"))
    if ctype:
        q = q.filter_by(type=ctype)

    total = q.count()
    items = q.order_by(Customer.name).offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({"data": [_to_dict(c) for c in items], "total": total, "page": page, "pageSize": per_page, "totalPages": (total + per_page - 1) // per_page})


@bp.post("/customers")
@jwt_required()
def create_customer():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"message": "name is required"}), 400
    c = Customer(tenant_id=_tenant_id(), name=data["name"], email=data.get("email"),
                 phone=data.get("phone"), address=data.get("address"), type=data.get("type", "retail"))
    db.session.add(c)
    db.session.commit()
    return jsonify(_to_dict(c)), 201


@bp.put("/customers/<customer_id>")
@jwt_required()
def update_customer(customer_id):
    c = Customer.query.filter_by(id=customer_id, tenant_id=_tenant_id()).first_or_404()
    data = request.get_json()
    c.name = data.get("name", c.name)
    c.email = data.get("email", c.email)
    c.phone = data.get("phone", c.phone)
    c.address = data.get("address", c.address)
    c.type = data.get("type", c.type)
    db.session.commit()
    return jsonify(_to_dict(c))


@bp.delete("/customers/<customer_id>")
@jwt_required()
def delete_customer(customer_id):
    c = Customer.query.filter_by(id=customer_id, tenant_id=_tenant_id()).first_or_404()
    db.session.delete(c)
    db.session.commit()
    return "", 204
