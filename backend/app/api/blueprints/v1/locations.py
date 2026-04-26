from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy import func
from ....extensions import db
from ....models import Location, StockLevel

bp = Blueprint("locations", __name__)


def _tenant_id():
    return get_jwt()["tenantId"]


def _location_to_dict(l: Location) -> dict:
    stock_count = db.session.query(func.count()).select_from(StockLevel).filter_by(location_id=l.id).scalar()
    return {
        "id": l.id,
        "name": l.name,
        "address": l.address,
        "type": l.type,
        "tenantId": l.tenant_id,
        "stockCount": stock_count,
    }


@bp.get("/locations")
@jwt_required()
def list_locations():
    locations = Location.query.filter_by(tenant_id=_tenant_id()).order_by(Location.name).all()
    return jsonify([_location_to_dict(l) for l in locations])


@bp.get("/locations/<location_id>")
@jwt_required()
def get_location(location_id):
    l = Location.query.filter_by(id=location_id, tenant_id=_tenant_id()).first_or_404()
    return jsonify(_location_to_dict(l))


@bp.post("/locations")
@jwt_required()
def create_location():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"message": "name is required"}), 400
    l = Location(
        tenant_id=_tenant_id(),
        name=data["name"],
        address=data.get("address"),
        type=data.get("type", "warehouse"),
    )
    db.session.add(l)
    db.session.commit()
    return jsonify(_location_to_dict(l)), 201


@bp.put("/locations/<location_id>")
@jwt_required()
def update_location(location_id):
    l = Location.query.filter_by(id=location_id, tenant_id=_tenant_id()).first_or_404()
    data = request.get_json()
    l.name = data.get("name", l.name)
    l.address = data.get("address", l.address)
    l.type = data.get("type", l.type)
    db.session.commit()
    return jsonify(_location_to_dict(l))


@bp.delete("/locations/<location_id>")
@jwt_required()
def delete_location(location_id):
    l = Location.query.filter_by(id=location_id, tenant_id=_tenant_id()).first_or_404()
    db.session.delete(l)
    db.session.commit()
    return "", 204
