import uuid
from ..extensions import db


class StockMovement(db.Model):
    __tablename__ = "stock_movements"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False)
    type = db.Column(
        db.Enum("receipt", "sale", "transfer_in", "transfer_out", "adjustment", name="movement_type"),
        nullable=False,
    )
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    from_location_id = db.Column(db.String(36), db.ForeignKey("locations.id"))
    to_location_id = db.Column(db.String(36), db.ForeignKey("locations.id"))
    quantity = db.Column(db.Integer, nullable=False)
    cost_per_unit = db.Column(db.Numeric(12, 2))
    note = db.Column(db.Text)
    reference_id = db.Column(db.String(36))  # links to PO/SO/Receipt id
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    created_by = db.Column(db.String(36), db.ForeignKey("users.id"))

    product = db.relationship("Product", foreign_keys=[product_id])
    from_location = db.relationship("Location", foreign_keys=[from_location_id])
    to_location = db.relationship("Location", foreign_keys=[to_location_id])
    creator = db.relationship("User", foreign_keys=[created_by])
