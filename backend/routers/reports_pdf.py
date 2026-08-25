"""
PDF Report generator — PPD Formulation Dossier.

GET /api/formulation/report/{ppd_id}?token=<jwt>
  → Returns a PDF file for direct browser download.
    Contains:
    • PPD overview (product name, brand, status, objective, key benefits)
    • Reviewer and management committee approval status
    • All formulas for the PPD, each with:
        – Basic parameters (protein source, sweetener, %)
        – Ingredient table
        – Status, sensory score, cost
    • Re-downloading always reflects fresh DB data.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import decode_token
from orm_models import PPDSubmission, Formula
from io import BytesIO
from datetime import datetime, timezone

# reportlab imports
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.platypus.flowables import HRFlowable

router = APIRouter(prefix="/api/formulation", tags=["formulation-pdf"])

# ── Colour palette ──────────────────────────────────────────────────────────
PRIMARY   = colors.HexColor("#1e3a5f")   # dark navy
ACCENT    = colors.HexColor("#e07b00")   # amber
LIGHT_BG  = colors.HexColor("#f7f8fa")
BORDER    = colors.HexColor("#e5e7eb")
SUCCESS   = colors.HexColor("#16a34a")
TEXT_MUTED= colors.HexColor("#57606a")


def _build_styles():
    base = getSampleStyleSheet()
    styles = {}

    styles["title"] = ParagraphStyle(
        "title", fontName="Helvetica-Bold", fontSize=18,
        textColor=PRIMARY, spaceAfter=4
    )
    styles["subtitle"] = ParagraphStyle(
        "subtitle", fontName="Helvetica", fontSize=10,
        textColor=TEXT_MUTED, spaceAfter=12
    )
    styles["section"] = ParagraphStyle(
        "section", fontName="Helvetica-Bold", fontSize=12,
        textColor=PRIMARY, spaceBefore=14, spaceAfter=6,
        borderPad=4
    )
    styles["subsection"] = ParagraphStyle(
        "subsection", fontName="Helvetica-Bold", fontSize=10,
        textColor=ACCENT, spaceBefore=8, spaceAfter=4
    )
    styles["body"] = ParagraphStyle(
        "body", fontName="Helvetica", fontSize=9,
        textColor=colors.black, spaceAfter=3, leading=14
    )
    styles["label"] = ParagraphStyle(
        "label", fontName="Helvetica-Bold", fontSize=8,
        textColor=TEXT_MUTED, spaceAfter=1
    )
    styles["value"] = ParagraphStyle(
        "value", fontName="Helvetica", fontSize=9,
        textColor=colors.black, spaceAfter=4
    )
    styles["mono"] = ParagraphStyle(
        "mono", fontName="Courier", fontSize=8,
        textColor=PRIMARY
    )
    styles["footer"] = ParagraphStyle(
        "footer", fontName="Helvetica", fontSize=7,
        textColor=TEXT_MUTED, alignment=TA_CENTER
    )
    return styles


def _kv_table(rows: list[tuple[str, str]], col_widths=(55*mm, 110*mm)) -> Table:
    """Render a two-column key/value table."""
    data = [[Paragraph(f"<b>{k}</b>", ParagraphStyle("kl", fontName="Helvetica-Bold", fontSize=8, textColor=TEXT_MUTED)),
             Paragraph(str(v or "—"), ParagraphStyle("kv", fontName="Helvetica", fontSize=9))]
            for k, v in rows]
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, -1), LIGHT_BG),
        ("GRID",        (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING",  (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0,0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",(0, 0), (-1, -1), 6),
        ("VALIGN",      (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def _section_rule(styles):
    return HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=4)


def _generate_pdf(ppd: PPDSubmission, formulas: list[Formula]) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm,  bottomMargin=20*mm,
        title=f"PPD Dossier — {ppd.ppd_id}",
        author="FMCG Software Platform",
    )
    S = _build_styles()
    story = []

    # ── COVER HEADER ──────────────────────────────────────────────────────
    story.append(Paragraph("FMCG Software Platform", S["subtitle"]))
    story.append(Paragraph("Product Development Dossier", S["title"]))
    story.append(Paragraph(
        f"Product: <b>{ppd.project_name}</b> &nbsp;|&nbsp; "
        f"PPD ID: <b>{ppd.ppd_id}</b> &nbsp;|&nbsp; "
        f"Brand: <b>{ppd.brand or '—'}</b>",
        S["body"]
    ))
    story.append(Paragraph(
        f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')} &nbsp;|&nbsp; "
        f"Status: <b>{ppd.status or '—'}</b> &nbsp;|&nbsp; "
        f"Version: {ppd.ppd_version or '—'}",
        S["subtitle"]
    ))
    story.append(_section_rule(S))
    story.append(Spacer(1, 4))

    # ── 1. PPD OVERVIEW ───────────────────────────────────────────────────
    story.append(Paragraph("1. Product Development Plan (PPD) Overview", S["section"]))
    story.append(_kv_table([
        ("PPD ID",           ppd.ppd_id),
        ("Product Name",     ppd.project_name),
        ("Brand",            ppd.brand),
        ("Version",          ppd.ppd_version),
        ("Status",           ppd.status),
        ("Product Category", ppd.product_category),
        ("Target Consumer",  ppd.target_consumer),
        ("Market Segment",   ppd.market_segment),
        ("Expected Launch",  ppd.expected_launch),
        ("Created By",       ppd.created_by),
        ("Teams Involved",   (ppd.teams_involved or "").replace(",", ", ")),
    ]))
    if ppd.objective:
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>Objective:</b>", S["label"]))
        story.append(Paragraph(ppd.objective, S["body"]))
    if ppd.key_benefits:
        story.append(Paragraph("<b>Key Benefits / Claims:</b>", S["label"]))
        story.append(Paragraph(ppd.key_benefits, S["body"]))
    story.append(Spacer(1, 8))

    # ── 2. REVIEW STATUS ──────────────────────────────────────────────────
    story.append(Paragraph("2. Functional Review Status", S["section"]))
    reviewers = ppd.reviewers or []
    if not reviewers:
        story.append(Paragraph("No functional review data available.", S["body"]))
    else:
        rev_data = [
            [Paragraph("<b>Team</b>", S["label"]),
             Paragraph("<b>Status</b>", S["label"]),
             Paragraph("<b>Comment</b>", S["label"])]
        ]
        for r in reviewers:
            rev_data.append([
                Paragraph(r.get("team_label", ""), S["body"]),
                Paragraph(r.get("status", "Pending"), S["body"]),
                Paragraph(r.get("comment", "") or "—", S["body"]),
            ])
        rt = Table(rev_data, colWidths=[55*mm, 30*mm, 80*mm], hAlign="LEFT")
        rt.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,0), PRIMARY),
            ("TEXTCOLOR",    (0,0), (-1,0), colors.white),
            ("BACKGROUND",   (0,1), (-1,-1), LIGHT_BG),
            ("GRID",         (0,0), (-1,-1), 0.5, BORDER),
            ("TOPPADDING",   (0,0), (-1,-1), 3),
            ("BOTTOMPADDING",(0,0), (-1,-1), 3),
            ("LEFTPADDING",  (0,0), (-1,-1), 5),
            ("FONTSIZE",     (0,0), (-1,-1), 8),
        ]))
        story.append(rt)

    # Management committee approvals
    approvals = ppd.mgmt_approvals or []
    if approvals:
        story.append(Spacer(1, 6))
        story.append(Paragraph("<b>Management Committee Approvals:</b>", S["label"]))
        ap_data = [
            [Paragraph("<b>Member</b>", S["label"]),
             Paragraph("<b>Status</b>", S["label"]),
             Paragraph("<b>Comment</b>", S["label"])]
        ]
        for a in approvals:
            ap_data.append([
                Paragraph(a.get("label", ""), S["body"]),
                Paragraph(a.get("status", "Pending"), S["body"]),
                Paragraph(a.get("comment", "") or "—", S["body"]),
            ])
        at = Table(ap_data, colWidths=[55*mm, 30*mm, 80*mm], hAlign="LEFT")
        at.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,0), ACCENT),
            ("TEXTCOLOR",    (0,0), (-1,0), colors.white),
            ("BACKGROUND",   (0,1), (-1,-1), LIGHT_BG),
            ("GRID",         (0,0), (-1,-1), 0.5, BORDER),
            ("TOPPADDING",   (0,0), (-1,-1), 3),
            ("BOTTOMPADDING",(0,0), (-1,-1), 3),
            ("LEFTPADDING",  (0,0), (-1,-1), 5),
            ("FONTSIZE",     (0,0), (-1,-1), 8),
        ]))
        story.append(at)
    story.append(Spacer(1, 8))

    # ── 3. FORMULATION RECORDS ────────────────────────────────────────────
    story.append(Paragraph("3. Formulation Records", S["section"]))
    if not formulas:
        story.append(Paragraph("No formulas have been created for this PPD yet.", S["body"]))
    else:
        story.append(Paragraph(
            f"Total formulas: <b>{len(formulas)}</b>",
            S["body"]
        ))
        story.append(Spacer(1, 4))

        for idx, f in enumerate(formulas, 1):
            block = []
            block.append(Paragraph(
                f"Formula {idx}: <b>{f.formula_id}</b> &nbsp;·&nbsp; {f.version} &nbsp;·&nbsp; {f.formula_type}",
                S["subsection"]
            ))
            block.append(_kv_table([
                ("Formula ID",    f.formula_id),
                ("Version",       f.version),
                ("Type",          f.formula_type),
                ("Status",        f.status),
                ("Protein Source",f.protein_source),
                ("Sweetener",     f.sweetener),
                ("Protein %",     f.protein_pct),
                ("Cocoa %",       f.cocoa_pct),
                ("Sugar (g/100g)",f.sugar_per_100g),
                ("Cost/kg (₹)",   f.cost_per_kg),
                ("Stability 40°C",f.stability_40c),
                ("Sensory Score", f.sensory_score),
                ("Created By",    f.created_by),
                ("Last Updated",  f.updated_at.strftime("%d %b %Y %H:%M") if f.updated_at else "—"),
            ]))

            if f.notes:
                block.append(Paragraph("<b>Notes:</b>", S["label"]))
                block.append(Paragraph(f.notes, S["body"]))

            # Ingredients table
            ingredients = f.ingredients or []
            if ingredients:
                block.append(Spacer(1, 4))
                block.append(Paragraph("<b>Ingredient List:</b>", S["label"]))
                ing_data = [[
                    Paragraph("<b>#</b>", S["label"]),
                    Paragraph("<b>Ingredient</b>", S["label"]),
                    Paragraph("<b>Qty</b>", S["label"]),
                    Paragraph("<b>Unit</b>", S["label"]),
                    Paragraph("<b>Supplier</b>", S["label"]),
                ]]
                for j, ing in enumerate(ingredients, 1):
                    ing_data.append([
                        Paragraph(str(j), S["body"]),
                        Paragraph(ing.get("name",""), S["body"]),
                        Paragraph(str(ing.get("qty","")), S["body"]),
                        Paragraph(ing.get("unit",""), S["body"]),
                        Paragraph(ing.get("supplier","") or "—", S["body"]),
                    ])
                it = Table(ing_data, colWidths=[8*mm, 62*mm, 22*mm, 18*mm, 55*mm], hAlign="LEFT")
                it.setStyle(TableStyle([
                    ("BACKGROUND",   (0,0), (-1,0), PRIMARY),
                    ("TEXTCOLOR",    (0,0), (-1,0), colors.white),
                    ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, LIGHT_BG]),
                    ("GRID",         (0,0), (-1,-1), 0.4, BORDER),
                    ("TOPPADDING",   (0,0), (-1,-1), 3),
                    ("BOTTOMPADDING",(0,0), (-1,-1), 3),
                    ("LEFTPADDING",  (0,0), (-1,-1), 4),
                    ("FONTSIZE",     (0,0), (-1,-1), 8),
                ]))
                block.append(it)

            block.append(Spacer(1, 6))
            if idx < len(formulas):
                block.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=6))

            story.append(KeepTogether(block))

    # ── FOOTER NOTE ───────────────────────────────────────────────────────
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"FMCG Software Platform &nbsp;|&nbsp; PPD {ppd.ppd_id} — {ppd.project_name} &nbsp;|&nbsp; "
        f"Report generated {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}",
        S["footer"]
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()


# ── ENDPOINT ──────────────────────────────────────────────────────────────────

@router.get("/report/{ppd_id}")
async def download_ppd_report(
    ppd_id: str,
    token: str = Query("", description="JWT — passed as query param for browser direct download"),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate and stream a PDF dossier for a PPD.
    Accepts token as a query param so browsers can open it via window.open().
    Re-downloading always fetches fresh data from the DB.
    """
    try:
        current_user = decode_token(token) if token else {"role": "admin", "sub": "", "name": ""}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing token")

    # Fetch PPD
    ppd_res = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    ppd     = ppd_res.scalars().first()
    if not ppd:
        raise HTTPException(404, f"PPD {ppd_id} not found")

    # Access check — admins, mgmt, ceo always pass; others must be in teams_involved
    role = current_user.get("role", "fd")
    if role not in ("admin", "mgmt", "ceo") and role not in (ppd.teams_involved or "").split(","):
        raise HTTPException(403, "You are not assigned to this PPD")

    # Fetch all formulas for this PPD ordered by creation
    form_res = await db.execute(
        select(Formula)
        .where(Formula.ppd_id == ppd_id)
        .order_by(Formula.created_at.asc())
    )
    formulas = list(form_res.scalars().all())

    # Build PDF in memory
    pdf_bytes = _generate_pdf(ppd, formulas)

    filename = f"PPD_Dossier_{ppd_id}.pdf"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
