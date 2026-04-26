import uuid
from ..extensions import db


class CalendarEvent(db.Model):
    __tablename__ = "calendar_events"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    start_date = db.Column(db.String(20), nullable=False)  # YYYY-MM-DD
    end_date = db.Column(db.String(20))
    color = db.Column(db.String(20), default="Primary")  # Primary, Success, Warning, Danger
    created_at = db.Column(db.DateTime, server_default=db.func.now())
