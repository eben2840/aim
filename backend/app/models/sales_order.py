import uuid
from ..extensions import db


class SalesOrder(db.Model):
    __tablename__ = "sales_orders"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False)
    order_number = db.Column(db.String(50), nullable=False, unique=True)
    customer_id = db.Column(db.String(36), db.ForeignKey("customers.id"))
    location_id = db.Column(db.String(36), db.ForeignKey("locations.id"), nullable=False)
    status = db.Column(
        db.Enum("pending", "packed", "shipped", "delivered", "cancelled", name="so_status"),
        default="pending",
        nullable=False,
    )
    total_amount = db.Column(db.Numeric(14, 2), default=0)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    location = db.relationship("Location", foreign_keys=[location_id])
    lines = db.relationship("SalesOrderLine", backref="sales_order", lazy="joined", cascade="all, delete-orphan")


class SalesOrderLine(db.Model):
    __tablename__ = "sales_order_lines"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sales_order_id = db.Column(db.String(36), db.ForeignKey("sales_orders.id"), nullable=False)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(12, 2), default=0)
