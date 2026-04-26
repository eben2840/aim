from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ....extensions import db
from ....models import User, UserRole

bp = Blueprint("users", __name__)


def _require_admin(identity):
    """Returns 403 response if caller is not business_admin or super_admin."""
    if identity.get("role") not in ("business_admin", "super_admin"):
        return jsonify({"message": "Admin access required"}), 403
    return None


def _user_dict(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "isActive": user.is_active,
        "allowedCategories": user.get_allowed_categories(),
        "createdAt": user.created_at.isoformat() if user.created_at else None,
    }


@bp.get("/users")
@jwt_required()
def list_users():
    identity = get_jwt()
    users = User.query.filter_by(tenant_id=identity["tenantId"]).order_by(User.created_at).all()
    return jsonify([_user_dict(u) for u in users])


@bp.post("/users")
@jwt_required()
def create_user():
    identity = get_jwt()
    err = _require_admin(identity)
    if err:
        return err

    data = request.get_json()
    email = data.get("email", "").strip().lower()
    name = data.get("name", "").strip()
    password = data.get("password", "")
    role = data.get("role", "store_manager")

    if not email or not name or not password:
        return jsonify({"message": "name, email, and password are required"}), 400

    # Validate role — business_admin can't create super_admin
    allowed_roles = [r.value for r in UserRole if r != UserRole.SUPER_ADMIN]
    if role not in allowed_roles:
        return jsonify({"message": f"Invalid role. Choose from: {', '.join(allowed_roles)}"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already in use"}), 409

    user = User(
        tenant_id=identity["tenantId"],
        email=email,
        name=name,
        role=role,
        is_active=True,
    )
    user.set_password(password)
    allowed = data.get("allowedCategories")
    user.set_allowed_categories(allowed if isinstance(allowed, list) else None)
    db.session.add(user)
    db.session.commit()

    return jsonify(_user_dict(user)), 201


@bp.put("/users/<user_id>")
@jwt_required()
def update_user(user_id):
    identity = get_jwt()
    err = _require_admin(identity)
    if err:
        return err

    user = User.query.filter_by(id=user_id, tenant_id=identity["tenantId"]).first_or_404()

    # Prevent editing yourself via this endpoint
    if user.id == identity["userId"]:
        return jsonify({"message": "Use the profile endpoint to update your own account"}), 400

    data = request.get_json()
    if "name" in data:
        user.name = data["name"].strip()
    if "role" in data:
        allowed_roles = [r.value for r in UserRole if r != UserRole.SUPER_ADMIN]
        if data["role"] not in allowed_roles:
            return jsonify({"message": "Invalid role"}), 400
        user.role = data["role"]
    if "isActive" in data:
        user.is_active = bool(data["isActive"])
    if "password" in data and data["password"]:
        user.set_password(data["password"])
    if "allowedCategories" in data:
        allowed = data["allowedCategories"]
        user.set_allowed_categories(allowed if isinstance(allowed, list) else None)

    db.session.commit()
    return jsonify(_user_dict(user))


@bp.delete("/users/<user_id>")
@jwt_required()
def delete_user(user_id):
    identity = get_jwt()
    err = _require_admin(identity)
    if err:
        return err

    if user_id == identity["userId"]:
        return jsonify({"message": "You cannot delete your own account"}), 400

    user = User.query.filter_by(id=user_id, tenant_id=identity["tenantId"]).first_or_404()
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"}), 200
