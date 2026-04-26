from __future__ import annotations
from datetime import datetime
from ..extensions import db
from ..models import StockLevel, StockMovement, LowStockAlert, Product, Location


def get_or_create_stock_level(product_id: str, location_id: str) -> StockLevel:
    """Get existing stock level or create a new one with 0 quantity."""
    stock = StockLevel.query.filter_by(
        product_id=product_id, location_id=location_id
    ).first()
    if not stock:
        stock = StockLevel(product_id=product_id, location_id=location_id, quantity=0)
        db.session.add(stock)
        db.session.flush()
    return stock


def add_stock(
    tenant_id: str,
    product_id: str,
    location_id: str,
    quantity: int,
    movement_type: str = "receipt",
    cost_per_unit: float = None,
    note: str = None,
    reference_id: str = None,
    created_by: str = None,
) -> StockLevel:
    """Increase stock and record movement."""
    stock = get_or_create_stock_level(product_id, location_id)
    stock.quantity += quantity

    movement = StockMovement(
        tenant_id=tenant_id,
        type=movement_type,
        product_id=product_id,
        to_location_id=location_id,
        quantity=quantity,
        cost_per_unit=cost_per_unit,
        note=note,
        reference_id=reference_id,
        created_by=created_by,
    )
    db.session.add(movement)

    _check_low_stock_alert(tenant_id, stock)
    return stock


def deduct_stock(
    tenant_id: str,
    product_id: str,
    location_id: str,
    quantity: int,
    movement_type: str = "sale",
    note: str = None,
    reference_id: str = None,
    created_by: str = None,
) -> StockLevel:
    """Decrease stock, record movement, and check low-stock alert."""
    stock = get_or_create_stock_level(product_id, location_id)
    if stock.quantity < quantity:
        raise ValueError(
            f"Insufficient stock: available {stock.quantity}, requested {quantity}"
        )
    stock.quantity -= quantity

    movement = StockMovement(
        tenant_id=tenant_id,
        type=movement_type,
        product_id=product_id,
        from_location_id=location_id,
        quantity=quantity,
        note=note,
        reference_id=reference_id,
        created_by=created_by,
    )
    db.session.add(movement)

    _check_low_stock_alert(tenant_id, stock)
    return stock


def transfer_stock(
    tenant_id: str,
    product_id: str,
    from_location_id: str,
    to_location_id: str,
    quantity: int,
    note: str = None,
    created_by: str = None,
) -> tuple[StockLevel, StockLevel]:
    """Move stock between locations."""
    from_stock = get_or_create_stock_level(product_id, from_location_id)
    if from_stock.quantity < quantity:
        raise ValueError(
            f"Insufficient stock: available {from_stock.quantity}, requested {quantity}"
        )

    from_stock.quantity -= quantity
    to_stock = get_or_create_stock_level(product_id, to_location_id)
    to_stock.quantity += quantity

    out_movement = StockMovement(
        tenant_id=tenant_id,
        type="transfer_out",
        product_id=product_id,
        from_location_id=from_location_id,
        quantity=quantity,
        note=note,
        created_by=created_by,
    )
    in_movement = StockMovement(
        tenant_id=tenant_id,
        type="transfer_in",
        product_id=product_id,
        to_location_id=to_location_id,
        quantity=quantity,
        note=note,
        created_by=created_by,
    )
    db.session.add_all([out_movement, in_movement])

    _check_low_stock_alert(tenant_id, from_stock)
    return from_stock, to_stock


def adjust_stock(
    tenant_id: str,
    product_id: str,
    location_id: str,
    new_quantity: int,
    note: str = None,
    created_by: str = None,
) -> StockLevel:
    """Set stock to an exact quantity (write-off / correction)."""
    stock = get_or_create_stock_level(product_id, location_id)
    delta = new_quantity - stock.quantity
    stock.quantity = new_quantity

    movement = StockMovement(
        tenant_id=tenant_id,
        type="adjustment",
        product_id=product_id,
        to_location_id=location_id if delta > 0 else None,
        from_location_id=location_id if delta < 0 else None,
        quantity=abs(delta),
        note=note,
        created_by=created_by,
    )
    db.session.add(movement)

    _check_low_stock_alert(tenant_id, stock)
    return stock


def _check_low_stock_alert(tenant_id: str, stock: StockLevel) -> None:
    """Create or update a low-stock alert if needed."""
    if stock.quantity < stock.min_stock_level:
        existing = LowStockAlert.query.filter_by(
            tenant_id=tenant_id,
            product_id=stock.product_id,
            location_id=stock.location_id,
            status="active",
        ).first()

        if not existing:
            alert = LowStockAlert(
                tenant_id=tenant_id,
                product_id=stock.product_id,
                location_id=stock.location_id,
                current_quantity=stock.quantity,
                min_stock_level=stock.min_stock_level,
                reorder_quantity=stock.reorder_quantity,
                status="active",
            )
            db.session.add(alert)
        else:
            existing.current_quantity = stock.quantity
            existing.updated_at = datetime.utcnow()
    else:
        # Resolve any active alert
        LowStockAlert.query.filter_by(
            tenant_id=tenant_id,
            product_id=stock.product_id,
            location_id=stock.location_id,
            status="active",
        ).update({"status": "resolved"})
