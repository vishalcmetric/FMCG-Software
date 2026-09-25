"""
Formulation Ingredients table helpers (Form Overview columns):
Sr. No. | Name of Ingredients | INS / CAS / INCI No. | Vendor / Supplier Name | Use / Function |
Cost Per Kg | Quantity in Percentage (%) | Quantity per Unit or BOM | Cost per Unit (in INR)
"""
from decimal import Decimal, InvalidOperation

TEXT_COLS = ("name", "ins_cas_inci", "vendor", "use_function")
NUM_COLS = ("cost_per_kg", "qty_pct", "qty_per_unit", "cost_per_unit")


def _num(v):
    if v is None or str(v).strip() == "":
        return None
    try:
        return Decimal(str(v).replace(",", "").strip())
    except InvalidOperation:
        return None


def clean_row(r: dict):
    """Normalise one ingredient row; rows without an ingredient name are skipped."""
    if not isinstance(r, dict) or not (r.get("name") or "").strip():
        return None
    out = {k: ((r.get(k) or "").strip() or None) for k in TEXT_COLS}
    out.update({k: _num(r.get(k)) for k in NUM_COLS})
    return out


def row_out(r: dict, sr_no: int) -> dict:
    """API / JSON shape (strings, as the existing UI and PDF expect)."""
    fmt = lambda v: "" if v is None else format(Decimal(v).normalize(), "f")
    return {"sr_no": str(sr_no), **{k: r.get(k) or "" for k in TEXT_COLS}, **{k: fmt(r.get(k)) for k in NUM_COLS}}
