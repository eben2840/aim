import uuid
from ..extensions import db


class PurchaseOrder(db.Model):
    __tablename__ = "purchase_orders"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False)
    order_number = db.Column(db.String(50), nullable=False, unique=True)
    supplier_id = db.Column(db.String(36), db.ForeignKey("suppliers.id"), nullable=False)
    location_id = db.Column(db.String(36), db.ForeignKey("locations.id"), nullable=False)
    status = db.Column(
        db.Enum("draft", "sent", "partial", "received", "cancelled", name="po_status"),
        default="draft",
        nullable=False,
    )
    expected_delivery_date = db.Column(db.Date)
    total_amount = db.Column(db.Numeric(14, 2), default=0)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    created_by = db.Column(db.String(36), db.ForeignKey("users.id"))

    location = db.relationship("Location", foreign_keys=[location_id])
    lines = db.relationship("PurchaseOrderLine", backref="purchase_order", lazy="joined", cascade="all, delete-orphan")


class PurchaseOrderLine(db.Model):
    __tablename__ = "purchase_order_lines"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    purchase_order_id = db.Column(db.String(36), db.ForeignKey("purchase_orders.id"), nullable=False)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_cost = db.Column(db.Numeric(12, 2), default=0)
    received_quantity = db.Column(db.Integer, default=0)
