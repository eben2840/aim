import uuid
import threading
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ....models import User
from .auth_helpers import make_jwt

bp = Blueprint("qr_auth", __name__)

_store: dict = {}
_lock = threading.Lock()
QR_TTL = 90


def _purge():
    now = datetime.utcnow()
    for k in [k for k, v in _store.items() if v["expires_at"] < now]:
        del _store[k]


@bp.post("/auth/qr-token")
@jwt_required()
def generate_qr_token():
    claims = get_jwt()
    token = str(uuid.uuid4())
    with _lock:
        _purge()
        _store[token] = {
            "user_id": claims["userId"],
            "expires_at": datetime.utcnow() + timedelta(seconds=QR_TTL),
        }
    return jsonify({"token": token, "expiresIn": QR_TTL})


@bp.post("/auth/qr-login")
def qr_login():
    token = (request.get_json() or {}).get("token", "")
    with _lock:
        entry = _store.get(token)
        if not entry or entry["expires_at"] < datetime.utcnow():
            _store.pop(token, None)
            return jsonify({"message": "QR code expired or invalid"}), 401
        del _store[token]
        user_id = entry["user_id"]

    user = User.query.filter_by(id=user_id, is_active=True).first()
    if not user:
        return jsonify({"message": "User not found"}), 401

    return jsonify({
        "token": make_jwt(user),
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value, "accountType": user.tenant.account_type},
    })
