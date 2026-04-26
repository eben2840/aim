import uuid
from ..extensions import db


class Supplier(db.Model):
    __tablename__ = "suppliers"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    address = db.Column(db.Text)
    contact_person = db.Column(db.String(255))
    lead_time_days = db.Column(db.Integer, default=7)
    payment_terms = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    purchase_orders = db.relationship("PurchaseOrder", backref="supplier", lazy="dynamic")
