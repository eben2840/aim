from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ....extensions import db
from ....models import User, Tenant
from .auth_helpers import make_jwt
import uuid

bp = Blueprint("auth", __name__)


def _make_token(user):
    return make_jwt(user)


@bp.post("/auth/register")
def register():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    name = data.get("name", "").strip()
    org_name = data.get("organizationName", "My Organization").strip()
    account_type = data.get("accountType", "business")
    category = data.get("category", "")

    if not email or not password or not name:
        return jsonify({"message": "email, password, and name are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 409

    tenant = Tenant(name=org_name, slug=org_name.lower().replace(" ", "-") + "-" + str(uuid.uuid4())[:6],
                    account_type=account_type, category=category)
    db.session.add(tenant)
    db.session.flush()

    user = User(tenant_id=tenant.id, email=email, name=name, role="business_admin")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = _make_token(user)
    return jsonify({"token": token, "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value, "accountType": account_type}}), 201


@bp.post("/auth/login")
def login():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email, is_active=True).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid email or password"}), 401

    token = _make_token(user)
    return jsonify({"token": token, "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value, "accountType": user.tenant.account_type}}), 200


@bp.get("/auth/me")
@jwt_required()
def me():
    claims = get_jwt()
    user = User.query.get_or_404(claims["userId"])
    return jsonify({"id": user.id, "name": user.name, "email": user.email, "role": user.role.value, "tenantId": user.tenant_id})
