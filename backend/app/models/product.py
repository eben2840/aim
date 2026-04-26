import uuid
from ..extensions import db


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False)
    sku = db.Column(db.String(100), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))
    unit = db.Column(db.String(50), default="pcs")
    cost_price = db.Column(db.Numeric(12, 2), default=0)
    selling_price = db.Column(db.Numeric(12, 2), default=0)
    barcode = db.Column(db.String(100), index=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    __table_args__ = (db.UniqueConstraint("tenant_id", "sku", name="uq_product_sku_tenant"),)

    stock_levels = db.relationship("StockLevel", backref="product", lazy="dynamic")
    purchase_order_lines = db.relationship("PurchaseOrderLine", backref="product", lazy="dynamic")
    sales_order_lines = db.relationship("SalesOrderLine", backref="product", lazy="dynamic")
