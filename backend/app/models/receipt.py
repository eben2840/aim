import uuid
from ..extensions import db


class Receipt(db.Model):
    __tablename__ = "receipts"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False)
    supplier_id = db.Column(db.String(36), db.ForeignKey("suppliers.id"))
    location_id = db.Column(db.String(36), db.ForeignKey("locations.id"), nullable=False)
    status = db.Column(
        db.Enum("pending_confirmation", "confirmed", name="receipt_status"),
        default="pending_confirmation",
        nullable=False,
    )
    ocr_raw_data = db.Column(db.JSON)
    receipt_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    created_by = db.Column(db.String(36), db.ForeignKey("users.id"))

    location = db.relationship("Location", foreign_keys=[location_id])
    supplier = db.relationship("Supplier", foreign_keys=[supplier_id])
    lines = db.relationship("ReceiptLine", backref="receipt", lazy="joined", cascade="all, delete-orphan")


class ReceiptLine(db.Model):
    __tablename__ = "receipt_lines"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    receipt_id = db.Column(db.String(36), db.ForeignKey("receipts.id"), nullable=False)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"))
    product_name = db.Column(db.String(255), nullable=False)
    sku = db.Column(db.String(100))
    quantity = db.Column(db.Numeric(12, 3), nullable=False)
    unit_cost = db.Column(db.Numeric(12, 2), default=0)
    total = db.Column(db.Numeric(14, 2), default=0)
    matched = db.Column(db.Boolean, default=False)
