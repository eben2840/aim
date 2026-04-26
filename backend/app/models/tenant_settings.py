import json
import uuid
from ..extensions import db

DEFAULT_PLATFORMS = [
    {"id": "amazon",    "name": "Amazon",    "urlTemplate": "https://www.amazon.com/s?k={query}",                          "enabled": True, "builtin": True},
    {"id": "wayfair",   "name": "Wayfair",   "urlTemplate": "https://www.wayfair.com/keyword.php?keyword={query}",         "enabled": True, "builtin": True},
    {"id": "instacart", "name": "Instacart", "urlTemplate": "https://www.instacart.com/products/search?q={query}",         "enabled": True, "builtin": True},
    {"id": "doordash",  "name": "DoorDash",  "urlTemplate": "https://www.doordash.com/search/store/{query}/",              "enabled": True, "builtin": True},
    {"id": "ubereats",  "name": "Uber Eats", "urlTemplate": "https://www.ubereats.com/search?q={query}",                   "enabled": True, "builtin": True},
]


class TenantSettings(db.Model):
    __tablename__ = "tenant_settings"

    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), primary_key=True)
    restock_platforms = db.Column(db.Text, nullable=False, default=lambda: json.dumps(DEFAULT_PLATFORMS))
    categories = db.Column(db.Text, nullable=True)  # JSON: [{"name": str, "hidden": bool}]

    def get_platforms(self):
        return json.loads(self.restock_platforms)

    def set_platforms(self, platforms):
        self.restock_platforms = json.dumps(platforms)

    def get_categories(self):
        return json.loads(self.categories) if self.categories else None

    def set_categories(self, cats):
        self.categories = json.dumps(cats)
