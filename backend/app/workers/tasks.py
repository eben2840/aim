from __future__ import annotations
"""
Celery async tasks for long-running operations.
"""
from celery import Celery
from flask import current_app


def make_celery(app):
    celery = Celery(app.import_name)
    celery.conf.update(
        broker_url=app.config["CELERY_BROKER_URL"],
        result_backend=app.config["CELERY_RESULT_BACKEND"],
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
    )

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery


# Placeholder task definitions — add app context via make_celery() in run.py
def generate_stock_report(tenant_id: str, location_id: str | None = None):
    """Generate a stock-level CSV report asynchronously."""
    pass  # Implement: query StockLevel, write CSV to storage


def sync_external_orders(tenant_id: str, integration: str):
    """Pull new orders from an external platform (e.g. Shopify) and create SalesOrders."""
    pass  # Implement: call external API, map to SalesOrder model


def send_low_stock_email(alert_id: str):
    """Send an email notification for a low-stock alert."""
    pass  # Implement: fetch alert, render template, send via SMTP/SES
