import uuid
from ..extensions import db


class LowStockAlert(db.Model):
    __tablename__ = "low_stock_alerts"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    location_id = db.Column(db.String(36), db.ForeignKey("locations.id"), nullable=False)
    current_quantity = db.Column(db.Integer, nullable=False)
    min_stock_level = db.Column(db.Integer, nullable=False)
    reorder_quantity = db.Column(db.Integer, default=0)
    status = db.Column(
        db.Enum("active", "resolved", "snoozed", name="alert_status"),
        default="active",
        nullable=False,
    )
    snoozed_until = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    product = db.relationship("Product", foreign_keys=[product_id])
    location = db.relationship("Location", foreign_keys=[location_id])
