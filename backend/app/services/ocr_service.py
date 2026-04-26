from __future__ import annotations
"""
OCR Service — uses Claude Vision to extract line items from receipt/invoice images.
No third-party OCR service needed. Requires ANTHROPIC_API_KEY in environment.
"""

import os
import base64
import json


class OCRLineItem:
    def __init__(self, product_name: str, sku: str | None, quantity: float, unit_cost: float):
        self.product_name = product_name
        self.sku = sku
        self.quantity = quantity
        self.unit_cost = unit_cost
        self.total = round(quantity * unit_cost, 2)


class OCRResult:
    def __init__(self, lines: list[OCRLineItem], supplier_name: str | None = None,
                 receipt_date: str | None = None, raw: dict | None = None):
        self.lines = lines
        self.supplier_name = supplier_name
        self.receipt_date = receipt_date
        self.raw = raw


def process_receipt(file_bytes: bytes, filename: str, mime_type: str) -> OCRResult:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set in your environment.")

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    # Claude supports image types: jpeg, png, gif, webp
    # For PDFs we'd need a different approach — treat as unsupported for now
    supported = {"image/jpeg": "image/jpeg", "image/jpg": "image/jpeg",
                 "image/png": "image/png", "image/gif": "image/gif", "image/webp": "image/webp"}

    if mime_type not in supported:
        raise RuntimeError(f"Unsupported file type '{mime_type}'. Please upload a JPG, PNG, GIF, or WEBP image.")

    encoded = base64.standard_b64encode(file_bytes).decode("utf-8")

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": supported[mime_type], "data": encoded},
                },
                {
                    "type": "text",
                    "text": """Extract all line items from this receipt or invoice.
Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "supplier_name": "string or null",
  "date": "YYYY-MM-DD or null",
  "line_items": [
    {
      "description": "product name",
      "sku": "SKU code or null",
      "quantity": 1,
      "unit_price": 0.00
    }
  ]
}"""
                }
            ],
        }],
    )

    raw_text = response.content[0].text.strip()

    # Strip markdown code blocks if Claude wraps it
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]

    data = json.loads(raw_text)

    lines = [
        OCRLineItem(
            product_name=item.get("description") or "Unknown Item",
            sku=item.get("sku"),
            quantity=float(item.get("quantity") or 1),
            unit_cost=float(item.get("unit_price") or 0),
        )
        for item in data.get("line_items", [])
    ]

    return OCRResult(
        lines=lines,
        supplier_name=data.get("supplier_name"),
        receipt_date=data.get("date"),
        raw=data,
    )
