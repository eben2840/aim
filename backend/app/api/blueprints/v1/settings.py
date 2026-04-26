import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ....extensions import db
from ....models import TenantSettings, DEFAULT_PLATFORMS, Tenant, Product

bp = Blueprint("settings", __name__)


def _get_or_create(tenant_id):
    s = TenantSettings.query.get(tenant_id)
    if not s:
        s = TenantSettings(tenant_id=tenant_id)
        db.session.add(s)
        db.session.commit()
    return s


@bp.get("/settings")
@jwt_required()
def get_settings():
    identity = get_jwt()
    s = _get_or_create(identity["tenantId"])
    return jsonify({"restockPlatforms": s.get_platforms()})


@bp.get("/settings/categories")
@jwt_required()
def get_categories():
    identity = get_jwt()
    s = _get_or_create(identity["tenantId"])
    cats = s.get_categories()
    if cats is None:
        tenant = Tenant.query.get(identity["tenantId"])
        raw = tenant.category if tenant and tenant.category else ""
        cats = [{"name": c.strip(), "hidden": False} for c in raw.split(",") if c.strip()]
    return jsonify(cats)


@bp.put("/settings/categories")
@jwt_required()
def update_categories():
    identity = get_jwt()
    if identity.get("role") not in ("business_admin", "super_admin"):
        return jsonify({"message": "Admin access required"}), 403
    data = request.get_json() or {}
    cats = data.get("categories", [])
    rename_from = data.get("renameFrom")
    rename_to = data.get("renameTo")
    if rename_from and rename_to and rename_from != rename_to:
        Product.query.filter_by(tenant_id=identity["tenantId"], category=rename_from).update({"category": rename_to})
    s = _get_or_create(identity["tenantId"])
    s.set_categories(cats)
    db.session.commit()
    return jsonify(cats)


@bp.put("/settings")
@jwt_required()
def update_settings():
    identity = get_jwt()
    if identity.get("role") not in ("business_admin", "super_admin"):
        return jsonify({"message": "Admin access required"}), 403

    platforms = (request.get_json() or {}).get("restockPlatforms")
    if not isinstance(platforms, list):
        return jsonify({"message": "restockPlatforms must be a list"}), 400

    for p in platforms:
        if not p.get("name") or not p.get("urlTemplate"):
            return jsonify({"message": "Each platform needs name and urlTemplate"}), 400
        if not p.get("id"):
            p["id"] = str(uuid.uuid4())

    s = _get_or_create(identity["tenantId"])
    s.set_platforms(platforms)
    db.session.commit()
    return jsonify({"restockPlatforms": s.get_platforms()})
