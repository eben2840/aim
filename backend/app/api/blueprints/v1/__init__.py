from flask import Blueprint

v1_bp = Blueprint("v1", __name__)

from . import auth, products, locations, stock, suppliers, customers  # noqa: E402
from . import purchase_orders, sales_orders, receipts, alerts, dashboard, users, ai, calendar_events, messages, settings, qr_auth  # noqa: E402

v1_bp.register_blueprint(auth.bp)
v1_bp.register_blueprint(products.bp)
v1_bp.register_blueprint(locations.bp)
v1_bp.register_blueprint(stock.bp)
v1_bp.register_blueprint(suppliers.bp)
v1_bp.register_blueprint(customers.bp)
v1_bp.register_blueprint(purchase_orders.bp)
v1_bp.register_blueprint(sales_orders.bp)
v1_bp.register_blueprint(receipts.bp)
v1_bp.register_blueprint(alerts.bp)
v1_bp.register_blueprint(dashboard.bp)
v1_bp.register_blueprint(users.bp)
v1_bp.register_blueprint(ai.bp)
v1_bp.register_blueprint(calendar_events.bp)
v1_bp.register_blueprint(messages.bp)
v1_bp.register_blueprint(settings.bp)
v1_bp.register_blueprint(qr_auth.bp)
