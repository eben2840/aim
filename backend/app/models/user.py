import uuid
import enum
import json
from werkzeug.security import generate_password_hash, check_password_hash
from ..extensions import db


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    BUSINESS_ADMIN = "business_admin"
    STORE_MANAGER = "store_manager"
    READ_ONLY = "read_only"
    CHILD = "child"
    PARENT = "parent"
    OTHERS = "others"


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.Enum(UserRole, name="user_role"),
        default=UserRole.STORE_MANAGER,
        nullable=False,
    )
    is_active = db.Column(db.Boolean, default=True)
    allowed_categories = db.Column(db.Text, nullable=True)  # JSON list of names; null = all
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def get_allowed_categories(self):
        return json.loads(self.allowed_categories) if self.allowed_categories else None

    def set_allowed_categories(self, cats):
        self.allowed_categories = json.dumps(cats) if cats is not None else None

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password, method="pbkdf2:sha256")

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)
