from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ....extensions import db
from ....models import Supplier, PurchaseOrder

bp = Blueprint("suppliers", __name__)


def _tenant_id():
    return get_jwt()["tenantId"]


def _to_dict(s: Supplier) -> dict:
    total_orders = PurchaseOrder.query.filter_by(supplier_id=s.id).count()
    return {
        "id": s.id,
        "name": s.name,
        "email": s.email,
        "phone": s.phone,
        "address": s.address,
        "contactPerson": s.contact_person,
        "leadTimeDays": s.lead_time_days,
        "paymentTerms": s.payment_terms,
        "tenantId": s.tenant_id,
        "totalOrders": total_orders,
    }


@bp.get("/suppliers")
@jwt_required()
def list_suppliers():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("pageSize", 10))
    search = request.args.get("search", "")

    q = Supplier.query.filter_by(tenant_id=_tenant_id())
    if search:
        q = q.filter(Supplier.name.ilike(f"%{search}%"))

    total = q.count()
    items = q.order_by(Supplier.name).offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({"data": [_to_dict(s) for s in items], "total": total, "page": page, "pageSize": per_page, "totalPages": (total + per_page - 1) // per_page})


@bp.get("/suppliers/<supplier_id>")
@jwt_required()
def get_supplier(supplier_id):
    s = Supplier.query.filter_by(id=supplier_id, tenant_id=_tenant_id()).first_or_404()
    return jsonify(_to_dict(s))


@bp.post("/suppliers")
@jwt_required()
def create_supplier():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"message": "name is required"}), 400
    s = Supplier(tenant_id=_tenant_id(), name=data["name"], email=data.get("email"),
                 phone=data.get("phone"), address=data.get("address"),
                 contact_person=data.get("contactPerson"), lead_time_days=data.get("leadTimeDays", 7),
                 payment_terms=data.get("paymentTerms"))
    db.session.add(s)
    db.session.commit()
    return jsonify(_to_dict(s)), 201


@bp.put("/suppliers/<supplier_id>")
@jwt_required()
def update_supplier(supplier_id):
    s = Supplier.query.filter_by(id=supplier_id, tenant_id=_tenant_id()).first_or_404()
    data = request.get_json()
    s.name = data.get("name", s.name)
    s.email = data.get("email", s.email)
    s.phone = data.get("phone", s.phone)
    s.address = data.get("address", s.address)
    s.contact_person = data.get("contactPerson", s.contact_person)
    s.lead_time_days = data.get("leadTimeDays", s.lead_time_days)
    s.payment_terms = data.get("paymentTerms", s.payment_terms)
    db.session.commit()
    return jsonify(_to_dict(s))


@bp.delete("/suppliers/<supplier_id>")
@jwt_required()
def delete_supplier(supplier_id):
    s = Supplier.query.filter_by(id=supplier_id, tenant_id=_tenant_id()).first_or_404()
    db.session.delete(s)
    db.session.commit()
    return "", 204
