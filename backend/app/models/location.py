import uuid
from ..extensions import db


class Location(db.Model):
    __tablename__ = "locations"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    address = db.Column(db.Text)
    type = db.Column(
        db.Enum("warehouse", "store", "other", name="location_type"),
        default="warehouse",
        nullable=False,
    )
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    stock_levels = db.relationship("StockLevel", backref="location", lazy="dynamic")
