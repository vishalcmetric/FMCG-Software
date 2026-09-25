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
from database import get_db, IST
from auth import decode_token
from orm_models import PPDSubmission, Formula, PilotReport, PPDComment
from ppd_fields import DRAFT_FIELDS, PLAIN_KEYS, draft_with_legacy
import re
from io import BytesIO
from datetime import datetime

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


def _build_story(ppd: PPDSubmission, formulas: list[Formula], S: dict) -> list:
    """Build and return the reportlab story list without building the PDF."""
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
        f"Generated: {datetime.now(IST).strftime('%d %b %Y %H:%M IST')} &nbsp;|&nbsp; "
        f"Status: <b>{ppd.status or '—'}</b> &nbsp;|&nbsp; "
        f"Version: {ppd.ppd_version or '—'}",
        S["subtitle"]
    ))
    story.append(_section_rule(S))
    story.append(Spacer(1, 4))

    # ── 1. PPD OVERVIEW ───────────────────────────────────────────────────
    story.append(Paragraph("1. Product Development Plan (PPD) Overview", S["section"]))
    draft = draft_with_legacy(ppd)
    story.append(_kv_table([
        ("PPD ID",           ppd.ppd_id),
        ("Product Name",     ppd.project_name),
        ("Brand",            ppd.brand),
        ("Version",          ppd.ppd_version),
        ("Status",           ppd.status),
        ("Created By",       ppd.created_by),
        ("Teams Involved",   (ppd.teams_involved or "").replace(",", ", ")),
    ] + [(label, draft.get(k)) for k, label in DRAFT_FIELDS if k in PLAIN_KEYS]))
    for k, label in DRAFT_FIELDS:
        if k in PLAIN_KEYS or not draft.get(k):
            continue
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"<b>{label}:</b>", S["label"]))
        story.append(Paragraph(_rte_to_rl(draft[k]), S["body"]))
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
                Paragraph(a.get("team_label", a.get("label", "")), S["body"]),
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
                f"Formula {idx}: <b>{f.formula_id}</b> &nbsp;·&nbsp; {f.version}",
                S["subsection"]
            ))
            block.append(_kv_table([
                ("Formula ID",      f.formula_id),
                ("Version",         f.version),
                ("Status",          f.status),
                ("Trial No.",       f.trial_no),
                ("Batch No.",       f.batch_no),
                ("Batch Size (gm)", f.batch_size),
                ("Unit Qty. (gm)",  f.unit_qty),
                ("Mfg Date",        f.mfg_date),
                ("Trial Taken By",  f.trial_taken_by),
                ("Evaluated By",    f.evaluated_by),
                ("Created By",      f.created_by),
                ("Last Updated",    f.updated_at.strftime("%d %b %Y %H:%M") if f.updated_at else "—"),
            ]))

            if f.method_of_preparation:
                block.append(Paragraph("<b>Method of Preparation:</b>", S["label"]))
                block.append(Paragraph(f.method_of_preparation, S["body"]))

            if f.observation:
                block.append(Paragraph("<b>Observation / Reason of Modification:</b>", S["label"]))
                block.append(Paragraph(f.observation, S["body"]))

            if f.conclusion:
                block.append(Paragraph("<b>Conclusion:</b>", S["label"]))
                block.append(Paragraph(f.conclusion, S["body"]))

            # Ingredients table — new columns matching the formula form
            ingredients = f.ingredients or []
            if ingredients:
                block.append(Spacer(1, 4))
                block.append(Paragraph("<b>Product Parameters (Ingredients):</b>", S["label"]))
                ing_data = [[
                    Paragraph("<b>Sr.</b>", S["label"]),
                    Paragraph("<b>Ingredient Name</b>", S["label"]),
                    Paragraph("<b>INS/CAS/INCI</b>", S["label"]),
                    Paragraph("<b>Vendor</b>", S["label"]),
                    Paragraph("<b>Use/Function</b>", S["label"]),
                    Paragraph("<b>Cost/kg</b>", S["label"]),
                    Paragraph("<b>Qty %</b>", S["label"]),
                    Paragraph("<b>Qty/Unit</b>", S["label"]),
                    Paragraph("<b>Cost/Unit (₹)</b>", S["label"]),
                ]]
                for j, ing in enumerate(ingredients, 1):
                    ing_data.append([
                        Paragraph(str(j), S["body"]),
                        Paragraph(ing.get("name", "") or "—", S["body"]),
                        Paragraph(ing.get("ins_cas_inci", "") or "—", S["body"]),
                        Paragraph(ing.get("vendor", "") or "—", S["body"]),
                        Paragraph(ing.get("use_function", "") or "—", S["body"]),
                        Paragraph(str(ing.get("cost_per_kg", "") or "—"), S["body"]),
                        Paragraph(str(ing.get("qty_pct", "") or "—"), S["body"]),
                        Paragraph(str(ing.get("qty_per_unit", "") or "—"), S["body"]),
                        Paragraph(str(ing.get("cost_per_unit", "") or "—"), S["body"]),
                    ])
                it = Table(ing_data,
                    colWidths=[8*mm, 32*mm, 22*mm, 24*mm, 22*mm, 16*mm, 14*mm, 16*mm, 18*mm],
                    hAlign="LEFT")
                it.setStyle(TableStyle([
                    ("BACKGROUND",    (0,0), (-1,0), PRIMARY),
                    ("TEXTCOLOR",     (0,0), (-1,0), colors.white),
                    ("ROWBACKGROUNDS",(0,1), (-1,-1), [colors.white, LIGHT_BG]),
                    ("GRID",          (0,0), (-1,-1), 0.4, BORDER),
                    ("TOPPADDING",    (0,0), (-1,-1), 3),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 3),
                    ("LEFTPADDING",   (0,0), (-1,-1), 3),
                    ("FONTSIZE",      (0,0), (-1,-1), 7),
                    ("VALIGN",        (0,0), (-1,-1), "TOP"),
                ]))
                block.append(it)

            block.append(Spacer(1, 6))
            if idx < len(formulas):
                block.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=6))

            story.append(KeepTogether(block))

    return story


def _generate_pdf(ppd: PPDSubmission, formulas: list[Formula]) -> bytes:
    """Build complete PDF bytes with footer — wraps _build_story."""
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
    story = _build_story(ppd, formulas, S)

    # Footer
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"FMCG Software Platform &nbsp;|&nbsp; PPD {ppd.ppd_id} — {ppd.project_name} &nbsp;|&nbsp; "
        f"Report generated {datetime.now(IST).strftime('%d %b %Y %H:%M IST')}",
        S["footer"]
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()


# ── ATTACHMENTS APPENDIX ──────────────────────────────────────────────────────

def _append_attachments(
    story: list,
    S: dict,
    reports: list,
    comments_with_attachments: list,
    base_url: str,
):
    """
    Append an 'Appendix — Attached Documents' section to the story.
    reports  : list of PilotReport ORM objects
    comments_with_attachments : list of PPDComment ORM objects that have attachment_url
    base_url : API base URL used to build clickable file links
    """
    story.append(Spacer(1, 12))
    story.append(_section_rule(S))
    story.append(Paragraph("Appendix — Attached Documents", S["section"]))
    story.append(Paragraph(
        "The following files were selected by R&D Head and appended to this report.",
        S["body"]
    ))
    story.append(Spacer(1, 6))

    has_content = False

    # ── Pilot / Approved Reports ─────────────────────────────────────────────
    if reports:
        has_content = True
        story.append(Paragraph("A. Report Files", S["subsection"]))
        rpt_data = [[
            Paragraph("<b>Report ID</b>", S["label"]),
            Paragraph("<b>Type</b>",      S["label"]),
            Paragraph("<b>File Name</b>", S["label"]),
            Paragraph("<b>Uploaded By</b>", S["label"]),
            Paragraph("<b>Role</b>",      S["label"]),
            Paragraph("<b>Status</b>",    S["label"]),
            Paragraph("<b>Date</b>",      S["label"]),
            Paragraph("<b>Link</b>",      S["label"]),
        ]]
        for r in reports:
            date_str = r.created_at.strftime("%d %b %Y") if r.created_at else "—"
            file_url = f"{base_url}{r.file_url}" if r.file_url else ""
            link_cell = (
                Paragraph(f'<a href="{file_url}" color="blue"><u>View File</u></a>', S["body"])
                if file_url else Paragraph("—", S["body"])
            )
            rpt_data.append([
                Paragraph(r.report_id or "—",         S["body"]),
                Paragraph(r.report_type or "—",        S["body"]),
                Paragraph(r.file_name or "—",          S["body"]),
                Paragraph(r.created_by or "—",         S["body"]),
                Paragraph(r.created_by_role or "—",    S["body"]),
                Paragraph(r.status or "—",             S["body"]),
                Paragraph(date_str,                    S["body"]),
                link_cell,
            ])
        rt = Table(rpt_data,
            colWidths=[22*mm, 20*mm, 35*mm, 28*mm, 18*mm, 18*mm, 18*mm, 17*mm],
            hAlign="LEFT")
        rt.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,0), PRIMARY),
            ("TEXTCOLOR",     (0,0), (-1,0), colors.white),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [colors.white, LIGHT_BG]),
            ("GRID",          (0,0), (-1,-1), 0.4, BORDER),
            ("TOPPADDING",    (0,0), (-1,-1), 3),
            ("BOTTOMPADDING", (0,0), (-1,-1), 3),
            ("LEFTPADDING",   (0,0), (-1,-1), 4),
            ("FONTSIZE",      (0,0), (-1,-1), 7),
            ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ]))
        story.append(rt)
        story.append(Spacer(1, 8))

    # ── PPD Comment Attachments ──────────────────────────────────────────────
    if comments_with_attachments:
        has_content = True
        story.append(Paragraph("B. Comment Attachments", S["subsection"]))
        cmt_data = [[
            Paragraph("<b>Comment By</b>", S["label"]),
            Paragraph("<b>Role</b>",        S["label"]),
            Paragraph("<b>File Name</b>",   S["label"]),
            Paragraph("<b>Comment</b>",     S["label"]),
            Paragraph("<b>Date</b>",        S["label"]),
            Paragraph("<b>Link</b>",        S["label"]),
        ]]
        for c in comments_with_attachments:
            date_str = c.created_at.strftime("%d %b %Y") if c.created_at else "—"
            att_url = c.attachment_url or ""
            # Build full URL if it's a relative path
            if att_url and att_url.startswith("/"):
                att_url = f"{base_url}{att_url}"
            link_cell = (
                Paragraph(f'<a href="{att_url}" color="blue"><u>View File</u></a>', S["body"])
                if att_url else Paragraph("—", S["body"])
            )
            cmt_data.append([
                Paragraph(c.user_name or "—",    S["body"]),
                Paragraph(c.user_role or "—",    S["body"]),
                Paragraph(c.attachment_name or "—", S["body"]),
                Paragraph((c.comment or "—")[:120] + ("…" if len(c.comment or "") > 120 else ""), S["body"]),
                Paragraph(date_str,              S["body"]),
                link_cell,
            ])
        ct = Table(cmt_data,
            colWidths=[28*mm, 18*mm, 32*mm, 50*mm, 18*mm, 17*mm],
            hAlign="LEFT")
        ct.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,0), ACCENT),
            ("TEXTCOLOR",     (0,0), (-1,0), colors.white),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [colors.white, LIGHT_BG]),
            ("GRID",          (0,0), (-1,-1), 0.4, BORDER),
            ("TOPPADDING",    (0,0), (-1,-1), 3),
            ("BOTTOMPADDING", (0,0), (-1,-1), 3),
            ("LEFTPADDING",   (0,0), (-1,-1), 4),
            ("FONTSIZE",      (0,0), (-1,-1), 7),
            ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ]))
        story.append(ct)

    if not has_content:
        story.append(Paragraph("No attachments were selected.", S["body"]))


# ── ENDPOINT ──────────────────────────────────────────────────────────────────


def _rte_to_rl(html: str) -> str:
    """Convert rich-text editor HTML to ReportLab paragraph markup (b/i/u/br only)."""
    h = re.sub(r"(?i)<li[^>]*>", "&bull; ", html or "")
    h = re.sub(r"(?i)</(p|div|li|ul|ol)>|<br\s*/?>", "<br/>", h)
    h = re.sub(r"(?i)<strong\b[^>]*>", "<b>", h); h = re.sub(r"(?i)</strong>", "</b>", h)
    h = re.sub(r"(?i)<em\b[^>]*>", "<i>", h);     h = re.sub(r"(?i)</em>", "</i>", h)
    h = re.sub(r"(?i)<(b|i|u)\s[^>]*>", r"<\1>", h)
    h = re.sub(r"(?i)<(?!/?(b|i|u)>|br/>)[^>]*>", "", h)
    h = re.sub(r"(<br/>\s*)+$", "", h)
    return h or "—"

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


# ── E-LAB NOTEBOOK: all trials of a PPD in ONE PDF ────────────────────────────

ELAB_ROLES = {"admin", "mgmt", "ceo", "rd_head", "fd", "fd_member", "rd_team", "adl"}
ELAB_ING_COLS = [("sr_no", "Sr. No."), ("name", "Name of Ingredients"), ("ins_cas_inci", "INS / CAS / INCI No."),
                 ("vendor", "Vendor / Supplier Name"), ("use_function", "Use / Function"), ("cost_per_kg", "Cost Per Kg"),
                 ("qty_pct", "Quantity in Percentage (%)"), ("qty_per_unit", "Quantity per Unit or BOM"),
                 ("cost_per_unit", "Cost per Unit (in INR)")]


def _elab_story(ppd: PPDSubmission, trials: list[dict]) -> list:
    """One complete E-Lab Notebook sheet per trial, in trial order, each starting on a new page."""
    from xml.sax.saxutils import escape
    from reportlab.platypus import PageBreak
    W = 273 * mm                                    # usable width on A4 landscape with 12 mm margins
    cell = ParagraphStyle("elc", fontName="Helvetica", fontSize=8, leading=10)
    head = ParagraphStyle("elh", fontName="Helvetica-Bold", fontSize=8, leading=10)
    ttl = ParagraphStyle("elt", fontName="Helvetica-Bold", fontSize=13, leading=16, alignment=TA_CENTER)
    sub = ParagraphStyle("els", fontName="Helvetica", fontSize=8.5, leading=11, alignment=TA_CENTER, textColor=TEXT_MUTED)
    P = lambda v, s=cell: Paragraph(escape(str(v)) if v not in (None, "") else "—", s)
    grid = [("GRID", (0, 0), (-1, -1), 0.6, colors.black), ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]
    shade = colors.HexColor("#eef1f5")

    story = []
    if not trials:
        story.append(Paragraph(escape(f"{ppd.project_name} - Trials"), ttl))
        story.append(Paragraph(escape(f"{ppd.ppd_id} · {ppd.ppd_title or ''}"), sub))
        story.append(Spacer(1, 10))
        story.append(Paragraph("No formulas / trials have been recorded for this PPD yet.", cell))
        return story

    for n, t in enumerate(trials, 1):
        if n > 1:
            story.append(PageBreak())
        # Header: Product name - Trials
        hdr = Table([[Paragraph(escape(f"{t.get('project_name') or ppd.project_name} - Trials"), ttl)],
                     [Paragraph(escape(f"PPD: {ppd.ppd_id} · {ppd.ppd_title or ppd.project_name}   |   "
                                       f"Trial {n:02d} of {len(trials)}   |   Formula ID: {t['formula_id']}"), sub)]],
                    colWidths=[W])
        hdr.setStyle(TableStyle(grid + [("BACKGROUND", (0, 0), (-1, 0), shade)]))
        story.append(hdr)
        # Basic information
        basic = [("Trial No.", t.get("trial_no")), ("Batch No.", t.get("batch_no")), ("Batch Size (gm)", t.get("batch_size")),
                 ("Unit Qty. (gm)", t.get("unit_qty")), ("Mfg Date", t.get("mfg_date"))]
        bt = Table([[P(k, head) for k, _ in basic], [P(v) for _, v in basic]], colWidths=[W / 5] * 5)
        bt.setStyle(TableStyle(grid + [("BACKGROUND", (0, 0), (-1, 0), shade)]))
        story.append(bt)
        # Ingredients (header row repeats if the table runs onto the next page)
        rows = [[P(lbl, head) for _, lbl in ELAB_ING_COLS]]
        for i, ing in enumerate(t.get("ingredients") or [], 1):
            rows.append([P(i if k == "sr_no" else ing.get(k)) for k, _ in ELAB_ING_COLS])
        if len(rows) == 1:
            rows.append([P("")] + [Paragraph("No ingredients recorded", cell)] + [P("")] * 7)
        it = Table(rows, colWidths=[w * mm for w in (12, 50, 32, 38, 32, 22, 26, 30, 31)], repeatRows=1)
        it.setStyle(TableStyle(grid + [("BACKGROUND", (0, 0), (-1, 0), shade),
                                       ("ALIGN", (5, 1), (-1, -1), "RIGHT"), ("ALIGN", (0, 1), (0, -1), "CENTER")]))
        story.append(it)
        # Trial taken by / Evaluated by
        pt = Table([[P("Trial Taken By", head), P(t.get("trial_taken_by")), P("Evaluated By", head), P(t.get("evaluated_by"))]],
                   colWidths=[40 * mm, W / 2 - 40 * mm, 40 * mm, W / 2 - 40 * mm])
        pt.setStyle(TableStyle(grid + [("BACKGROUND", (0, 0), (0, 0), shade), ("BACKGROUND", (2, 0), (2, 0), shade)]))
        story.append(pt)
        # Method / Observation / Conclusion (formatted text kept)
        rich = t.get("rich_html") or {}

        def rich_para(k):
            try:
                return Paragraph(_rte_to_rl(rich.get(k) or ""), cell)
            except Exception:                        # malformed markup → plain text, never break the PDF
                return P(t.get(k))
        rt = Table([[P(lbl, head), rich_para(k)]
                    for k, lbl in (("method_of_preparation", "Method of Preparation"),
                                   ("observation", "Observation / Reason of Modification"),
                                   ("conclusion", "Conclusion"))],
                   colWidths=[55 * mm, W - 55 * mm])
        rt.setStyle(TableStyle(grid + [("BACKGROUND", (0, 0), (0, -1), shade)]))
        story.append(rt)
    return story


@router.get("/report/{ppd_id}/elab")
async def download_elab_notebook(
    ppd_id: str,
    token: str = Query("", description="JWT — passed as query param for browser direct download"),
    db: AsyncSession = Depends(get_db),
):
    """ONE PDF containing every formula/trial of the PPD, in creation order, in the E-Lab table layout."""
    from reportlab.lib.pagesizes import landscape
    from routers.formulation import _ppd_trials
    try:
        current_user = decode_token(token) if token else {"role": "admin", "sub": "", "name": ""}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    ppd = (await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))).scalars().first()
    if not ppd:
        raise HTTPException(404, f"PPD {ppd_id} not found")
    role = current_user.get("role", "")
    if role not in ELAB_ROLES and role not in (ppd.teams_involved or "").split(","):
        raise HTTPException(403, "You are not assigned to this PPD")

    trials = await _ppd_trials(db, ppd_id)
    generated = datetime.now(IST).strftime("%d %b %Y %H:%M IST")

    def _footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(TEXT_MUTED)
        canvas.drawString(12 * mm, 7 * mm, f"{ppd_id} — E-Lab Notebook  ·  {len(trials)} trial(s)  ·  generated {generated}")
        canvas.drawRightString(landscape(A4)[0] - 12 * mm, 7 * mm, f"Page {doc.page}")
        canvas.restoreState()

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=12 * mm, rightMargin=12 * mm,
                            topMargin=12 * mm, bottomMargin=14 * mm, title=f"{ppd_id} E-Lab Notebook")
    doc.build(_elab_story(ppd, trials), onFirstPage=_footer, onLaterPages=_footer)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{ppd_id}_E-Lab-Notebook.pdf"'})


@router.get("/report/{ppd_id}/with-attachments")
async def download_ppd_report_with_attachments(
    ppd_id:      str,
    token:       str = Query(""),
    report_ids:  str = Query("", description="Comma-separated PilotReport report_id values"),
    comment_ids: str = Query("", description="Comma-separated PPDComment id values"),
    base_url:    str = Query("https://fmcg-software.onrender.com", description="API base URL for file links"),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate PPD dossier PDF and append a selected-attachments appendix at the bottom.
    Caller passes report_ids and/or comment_ids as comma-separated lists.
    base_url is used to build absolute hyperlinks for each file.
    """
    try:
        current_user = decode_token(token) if token else {"role": "admin", "sub": "", "name": ""}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing token")

    # Fetch PPD
    ppd_res = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    ppd = ppd_res.scalars().first()
    if not ppd:
        raise HTTPException(404, f"PPD {ppd_id} not found")

    role = current_user.get("role", "fd")
    if role not in ("admin", "mgmt", "ceo", "rd_head") and role not in (ppd.teams_involved or "").split(","):
        raise HTTPException(403, "You are not assigned to this PPD")

    # Fetch formulas
    form_res = await db.execute(
        select(Formula).where(Formula.ppd_id == ppd_id).order_by(Formula.created_at.asc())
    )
    formulas = list(form_res.scalars().all())

    # Fetch selected pilot reports
    selected_reports = []
    if report_ids.strip():
        ids = [r.strip() for r in report_ids.split(",") if r.strip()]
        rpt_res = await db.execute(
            select(PilotReport).where(PilotReport.report_id.in_(ids))
        )
        selected_reports = list(rpt_res.scalars().all())

    # Fetch selected PPD comments (with attachments)
    selected_comments = []
    if comment_ids.strip():
        try:
            int_ids = [int(i.strip()) for i in comment_ids.split(",") if i.strip()]
        except ValueError:
            int_ids = []
        if int_ids:
            cmt_res = await db.execute(
                select(PPDComment).where(PPDComment.id.in_(int_ids))
            )
            selected_comments = list(cmt_res.scalars().all())

    # Build PDF with appendix using shared story builder
    S = _build_styles()
    story = _build_story(ppd, formulas, S)
    _append_attachments(story, S, selected_reports, selected_comments, base_url.rstrip("/"))
    # Footer
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"FMCG Software Platform &nbsp;|&nbsp; PPD {ppd.ppd_id} — {ppd.project_name} &nbsp;|&nbsp; "
        f"Report generated {datetime.now(IST).strftime('%d %b %Y %H:%M IST')} &nbsp;|&nbsp; "
        f"Generated by: {current_user.get('name','R&D Head')} ({role})",
        S["footer"]
    ))
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm,  bottomMargin=20*mm,
        title=f"PPD Dossier — {ppd_id} (with attachments)",
        author="FMCG Software Platform",
    )
    doc.build(story)
    buf.seek(0)
    pdf_out = buf.read()

    filename = f"ELab_Report_{ppd_id}_with_attachments.pdf"
    return StreamingResponse(
        iter([pdf_out]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
