import uuid
from ..extensions import db


class Tenant(db.Model):
    __tablename__ = "tenants"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    plan = db.Column(
        db.Enum("free", "starter", "growth", "enterprise", name="tenant_plan"),
        default="free",
        nullable=False,
    )
    account_type = db.Column(db.String(20), default="business", nullable=False, server_default="business")
    category = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    users = db.relationship("User", backref="tenant", lazy="dynamic")
    locations = db.relationship("Location", backref="tenant", lazy="dynamic")
    products = db.relationship("Product", backref="tenant", lazy="dynamic")
    suppliers = db.relationship("Supplier", backref="tenant", lazy="dynamic")
    customers = db.relationship("Customer", backref="tenant", lazy="dynamic")
