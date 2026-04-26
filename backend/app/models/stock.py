import uuid
from ..extensions import db


class StockLevel(db.Model):
    __tablename__ = "stock_levels"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    location_id = db.Column(db.String(36), db.ForeignKey("locations.id"), nullable=False)
    quantity = db.Column(db.Integer, default=0, nullable=False)
    min_stock_level = db.Column(db.Integer, default=5)
    reorder_quantity = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    __table_args__ = (
        db.UniqueConstraint("product_id", "location_id", name="uq_stock_product_location"),
    )
