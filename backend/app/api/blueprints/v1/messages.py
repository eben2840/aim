from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy import or_, and_
from ....extensions import db
from ....models import Message

bp = Blueprint("messages", __name__)


def _msg_dict(m):
    return {
        "id": m.id,
        "body": m.body,
        "senderId": m.sender_id,
        "senderName": m.sender.name if m.sender else "Unknown",
        "recipientId": m.recipient_id,
        "isRead": m.is_read,
        "createdAt": m.created_at.isoformat() if m.created_at else None,
    }


@bp.get("/messages")
@jwt_required()
def list_messages():
    identity = get_jwt()
    me = identity["userId"]
    other = request.args.get("with")
    if not other:
        return jsonify({"message": "with parameter required"}), 400
    msgs = (Message.query
            .filter(
                Message.tenant_id == identity["tenantId"],
                or_(
                    and_(Message.sender_id == me, Message.recipient_id == other),
                    and_(Message.sender_id == other, Message.recipient_id == me),
                )
            )
            .order_by(Message.created_at.desc())
            .limit(50)
            .all())
    return jsonify([_msg_dict(m) for m in reversed(msgs)])


@bp.get("/messages/inbox")
@jwt_required()
def inbox():
    identity = get_jwt()
    msgs = (Message.query
            .filter_by(tenant_id=identity["tenantId"], recipient_id=identity["userId"], is_read=False)
            .order_by(Message.created_at.desc())
            .limit(20)
            .all())
    return jsonify([_msg_dict(m) for m in reversed(msgs)])


@bp.post("/messages/read")
@jwt_required()
def mark_read():
    identity = get_jwt()
    sender_id = (request.get_json() or {}).get("senderId")
    q = Message.query.filter_by(tenant_id=identity["tenantId"], recipient_id=identity["userId"], is_read=False)
    if sender_id:
        q = q.filter_by(sender_id=sender_id)
    q.update({"is_read": True})
    db.session.commit()
    return jsonify({"ok": True})


@bp.post("/messages")
@jwt_required()
def send_message():
    identity = get_jwt()
    data = request.get_json() or {}
    body = data.get("body", "").strip()
    recipient_id = data.get("recipientId", "").strip()
    if not body or not recipient_id:
        return jsonify({"message": "body and recipientId required"}), 400
    msg = Message(
        tenant_id=identity["tenantId"],
        sender_id=identity["userId"],
        recipient_id=recipient_id,
        body=body,
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify(_msg_dict(msg)), 201
