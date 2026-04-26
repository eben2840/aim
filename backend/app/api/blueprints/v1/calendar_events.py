from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ....extensions import db
from ....models import CalendarEvent

bp = Blueprint("calendar_events", __name__)


@bp.get("/calendar-events")
@jwt_required()
def list_events():
    tenant_id = get_jwt()["tenantId"]
    events = CalendarEvent.query.filter_by(tenant_id=tenant_id).order_by(CalendarEvent.start_date).all()
    return jsonify([_to_dict(e) for e in events])


@bp.post("/calendar-events")
@jwt_required()
def create_event():
    tenant_id = get_jwt()["tenantId"]
    data = request.get_json()
    event = CalendarEvent(
        tenant_id=tenant_id,
        title=data["title"],
        start_date=data["startDate"],
        end_date=data.get("endDate"),
        color=data.get("color", "Primary"),
    )
    db.session.add(event)
    db.session.commit()
    return jsonify(_to_dict(event)), 201


@bp.put("/calendar-events/<event_id>")
@jwt_required()
def update_event(event_id):
    tenant_id = get_jwt()["tenantId"]
    event = CalendarEvent.query.filter_by(id=event_id, tenant_id=tenant_id).first_or_404()
    data = request.get_json()
    if "title" in data: event.title = data["title"]
    if "startDate" in data: event.start_date = data["startDate"]
    if "endDate" in data: event.end_date = data["endDate"]
    if "color" in data: event.color = data["color"]
    db.session.commit()
    return jsonify(_to_dict(event))


@bp.delete("/calendar-events/<event_id>")
@jwt_required()
def delete_event(event_id):
    tenant_id = get_jwt()["tenantId"]
    event = CalendarEvent.query.filter_by(id=event_id, tenant_id=tenant_id).first_or_404()
    db.session.delete(event)
    db.session.commit()
    return jsonify({"message": "Deleted"})


def _to_dict(e: CalendarEvent) -> dict:
    return {
        "id": e.id,
        "title": e.title,
        "startDate": e.start_date,
        "endDate": e.end_date,
        "color": e.color,
    }
