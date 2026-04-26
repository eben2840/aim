from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ....services import receipt_service
from ....models import Receipt

bp = Blueprint("receipts", __name__)


def _tenant_id():
    return get_jwt()["tenantId"]


def _user_id():
    return get_jwt()["userId"]


@bp.post("/receipts/upload")
@jwt_required()
def upload_receipt():
    """
    Accepts a multipart/form-data upload with:
      - file: the image or PDF
      - locationId: destination warehouse/store

    Returns extracted line items for frontend review.
    """
    if "file" not in request.files:
        return jsonify({"message": "No file uploaded"}), 400

    file = request.files["file"]
    location_id = request.form.get("locationId")
    supplier_id = request.form.get("supplierId")

    if not location_id:
        return jsonify({"message": "locationId is required"}), 400

    file_bytes = file.read()
    try:
        result = receipt_service.upload_and_extract(
            tenant_id=_tenant_id(),
            location_id=location_id,
            file_bytes=file_bytes,
            filename=file.filename,
            mime_type=file.mimetype,
            supplier_id=supplier_id or None,
            created_by=_user_id(),
        )
        return jsonify(result), 200
    except RuntimeError as e:
        return jsonify({"message": str(e)}), 502


@bp.post("/receipts/confirm")
@jwt_required()
def confirm_receipt():
    """
    Confirms reviewed line items → updates stock.
    Body:
      { receiptId, lines: [...], locationId, supplierId? }
    """
    data = request.get_json()
    receipt_id = data.get("receiptId")
    location_id = data.get("locationId")
    confirmed_lines = data.get("lines", [])

    if not receipt_id or not location_id:
        return jsonify({"message": "receiptId and locationId required"}), 400

    try:
        receipt = receipt_service.confirm_receipt(
            tenant_id=_tenant_id(),
            receipt_id=receipt_id,
            confirmed_lines=confirmed_lines,
            location_id=location_id,
            supplier_id=data.get("supplierId"),
            created_by=_user_id(),
        )
        return jsonify({"id": receipt.id, "status": receipt.status})
    except Exception as e:
        return jsonify({"message": str(e)}), 400


@bp.get("/receipts")
@jwt_required()
def list_receipts():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("pageSize", 10))

    q = Receipt.query.filter_by(tenant_id=_tenant_id())
    total = q.count()
    receipts = q.order_by(Receipt.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    def _to_dict(r: Receipt) -> dict:
        return {
            "id": r.id,
            "supplierId": r.supplier_id,
            "supplierName": r.supplier.name if r.supplier else None,
            "locationId": r.location_id,
            "status": r.status,
            "createdAt": r.created_at.isoformat() if r.created_at else None,
            "lines": [
                {
                    "id": l.id,
                    "productName": l.product_name,
                    "sku": l.sku,
                    "quantity": float(l.quantity),
                    "unitCost": float(l.unit_cost),
                    "total": float(l.total),
                    "matched": l.matched,
                }
                for l in r.lines
            ],
        }

    return jsonify({"data": [_to_dict(r) for r in receipts], "total": total, "page": page, "pageSize": per_page, "totalPages": (total + per_page - 1) // per_page})
