from __future__ import annotations
"""
Receipt Service — orchestrates OCR upload + stock confirmation flow.
"""

import uuid
from ..extensions import db
from ..models import Receipt, ReceiptLine, Product
from ..services import stock_service
from ..services.ocr_service import process_receipt, OCRResult


def upload_and_extract(
    tenant_id: str,
    location_id: str,
    file_bytes: bytes,
    filename: str,
    mime_type: str,
    supplier_id: str | None = None,
    created_by: str | None = None,
) -> dict:
    """
    1. Send file to OCR.
    2. Try to match each line item to an existing Product by SKU or name.
    3. Persist a Receipt in pending_confirmation state.
    4. Return the receipt ID and suggested line items for the frontend to review.
    """
    ocr_result: OCRResult = process_receipt(file_bytes, filename, mime_type)

    receipt = Receipt(
        tenant_id=tenant_id,
        location_id=location_id,
        supplier_id=supplier_id,
        status="pending_confirmation",
        ocr_raw_data=ocr_result.raw,
    )
    db.session.add(receipt)
    db.session.flush()

    lines_out = []
    for item in ocr_result.lines:
        # Try to match product
        product = _match_product(tenant_id, item.sku, item.product_name)
        rl = ReceiptLine(
            receipt_id=receipt.id,
            product_id=product.id if product else None,
            product_name=item.product_name,
            sku=item.sku or (product.sku if product else None),
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            total=item.total,
            matched=product is not None,
        )
        db.session.add(rl)
        lines_out.append({
            "id": rl.id,
            "productId": product.id if product else None,
            "productName": item.product_name,
            "sku": rl.sku,
            "quantity": float(item.quantity),
            "unitCost": float(item.unit_cost),
            "total": float(item.total),
            "matched": product is not None,
        })

    db.session.commit()

    return {
        "receiptId": receipt.id,
        "lines": lines_out,
        "supplierName": ocr_result.supplier_name,
        "receiptDate": str(ocr_result.receipt_date) if ocr_result.receipt_date else None,
    }


def confirm_receipt(
    tenant_id: str,
    receipt_id: str,
    confirmed_lines: list[dict],
    location_id: str,
    supplier_id: str | None = None,
    created_by: str | None = None,
) -> Receipt:
    """
    Confirm reviewed line items → update stock for each line.
    """
    receipt = Receipt.query.filter_by(id=receipt_id, tenant_id=tenant_id).first_or_404()

    for line_data in confirmed_lines:
        product_id = line_data.get("productId")
        if not product_id:
            # Auto-create product if no match
            product_id = _auto_create_product(
                tenant_id,
                line_data.get("productName", "Unknown"),
                line_data.get("sku"),
            )

        qty = int(float(line_data.get("quantity", 0)))
        cost = float(line_data.get("unitCost", 0))
        if qty > 0:
            stock_service.add_stock(
                tenant_id=tenant_id,
                product_id=product_id,
                location_id=location_id,
                quantity=qty,
                movement_type="receipt",
                cost_per_unit=cost,
                reference_id=receipt.id,
                created_by=created_by,
            )

    receipt.status = "confirmed"
    if supplier_id:
        receipt.supplier_id = supplier_id
    db.session.commit()
    return receipt


def _match_product(tenant_id: str, sku: str | None, name: str) -> Product | None:
    if sku:
        p = Product.query.filter_by(tenant_id=tenant_id, sku=sku).first()
        if p:
            return p
    return Product.query.filter(
        Product.tenant_id == tenant_id,
        Product.name.ilike(name),
    ).first()


def _auto_create_product(tenant_id: str, name: str, sku: str | None) -> str:
    product = Product(
        tenant_id=tenant_id,
        sku=sku or f"AUTO-{str(uuid.uuid4())[:8].upper()}",
        name=name,
        category="Uncategorised",
        unit="pcs",
    )
    db.session.add(product)
    db.session.flush()
    return product.id
