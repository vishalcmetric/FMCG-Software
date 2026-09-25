"""
Draft PPD field definitions (single source of truth for the backend).
Each field is its own ppd_submissions column (date -> ppd_date) holding the plain text the user typed.
Rich-text formatting (bold, lists, links) is kept separately in draft_rich_html (JSON) for the editor;
attachments -> draft_attachments (JSON).
"""
import re
from datetime import date as _date
from html import escape
from html.parser import HTMLParser

# (key, label) in form order — Basic Information, Project Team, then rich-text sections
DRAFT_FIELDS = [
    ("project_type", "Project Type"),
    ("date", "Date"),
    ("project_leader", "Project Leader"),
    ("marketing", "Marketing"),
    ("rd_product", "R&D-Product"),
    ("rd_packaging", "R&D-Packaging"),
    ("legal_regulatory", "Legal & Regulatory"),
    ("overall_goal", "Overall Project Goal"),
    ("consumer_target_group", "Consumer Target Group"),
    ("consumer_evidence", "Consumer Evidence"),
    ("flavour", "Flavour"),
    ("attributes", "Attributes"),
    ("business_logic", "Business Logic"),
    ("product_description", "Detailed Product Description & Functions"),
    ("performance_claims", "Essential Product Performance & Claims"),
    ("benchmark", "Benchmark to Match or Beat"),
    ("primary_pack_description", "Detailed Primary Pack Description"),
    ("patent_legal_requirements", "Patent/Legal/Registration Requirements"),
    ("legal_regulatory_considerations", "Legal & Regulatory Considerations"),
    ("target_objective", "Target Objective"),
    ("minimum_objective", "Minimum Objective"),
    ("assumptions", "Assumptions"),
    ("constraints", "Constraints"),
    ("risks", "Risks & Potential Problems"),
]
DRAFT_KEYS = [k for k, _ in DRAFT_FIELDS]
PLAIN_KEYS = set(DRAFT_KEYS[:7])          # text / date / dropdown values; the rest are rich-text HTML
RICH_KEYS = [k for k in DRAFT_KEYS if k not in PLAIN_KEYS]


class _TextExtractor(HTMLParser):
    """Rich-text editor HTML -> the plain text as the user sees it (line breaks, bullets, numbering)."""
    BLOCK = {"p", "div", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.lists = [], []

    def _nl(self):
        if self.out and not self.out[-1].endswith(NL):
            self.out.append(NL)

    def handle_starttag(self, tag, attrs):
        if tag == "br":
            self.out.append(NL)
        elif tag in ("ul", "ol"):
            self._nl()
            self.lists.append([tag, 0])
        elif tag == "li":
            self._nl()
            indent = "  " * max(len(self.lists) - 1, 0)
            if self.lists and self.lists[-1][0] == "ol":
                self.lists[-1][1] += 1
                self.out.append(f"{indent}{self.lists[-1][1]}. ")
            else:
                self.out.append(f"{indent}• ")
        elif tag in self.BLOCK:
            self._nl()

    def handle_endtag(self, tag):
        if tag in ("ul", "ol") and self.lists:
            self.lists.pop()
        if tag in self.BLOCK or tag == "li":
            self._nl()

    def handle_data(self, data):
        self.out.append(data.replace(chr(0xA0), " "))   # nbsp -> space


NL = chr(10)


def html_to_text(html) -> str:
    """Plain text stored in the DB column for a rich-text field."""
    if not html:
        return ""
    if "<" not in html and "&" not in html:
        return html.strip()
    p = _TextExtractor()
    p.feed(html)
    p.close()
    text = NL.join(line.rstrip() for line in "".join(p.out).split(NL))
    return re.sub(NL + "{3,}", NL * 2, text).strip()


def text_to_html(text) -> str:
    return escape(text).replace(NL, "<br>") if text else ""


def apply_draft(p, draft: dict) -> None:
    """Write API draft_form values into the PPD's individual columns."""
    for k in PLAIN_KEYS:
        if k not in draft:
            continue
        v = (draft.get(k) or "").strip() or None
        if k == "date" and v:
            try:
                v = _date.fromisoformat(v[:10])
            except ValueError:
                v = None
        setattr(p, k, v)
    # Rich fields: column = plain text as typed; formatted HTML kept for the editor
    rich = {}
    for k in RICH_KEYS:
        if k in draft:
            html = (draft.get(k) or "").strip()
            setattr(p, k, html_to_text(html) or None)
            if html:
                rich[k] = html
    p.draft_rich_html = rich
    # Non-NULL draft_attachments also marks the row as saved in the column format (disables fallbacks)
    p.draft_attachments = draft.get("attachments") or {}


def draft_with_legacy(p) -> dict:
    """API draft_form built from the individual columns. Falls back to the first-release JSON
    draft_form, then to legacy columns for PPDs created before the Draft PPD form (nothing is deleted)."""
    saved = p.draft_attachments is not None          # saved via Draft PPD columns: no fallback
    old = {} if saved else (p.draft_form or {})
    legacy = {} if saved else {
        "project_type":          p.product_category or "",
        "overall_goal":          text_to_html(p.objective),
        "consumer_target_group": text_to_html(p.target_consumer),
        "performance_claims":    text_to_html(p.key_benefits),
        "business_logic":        "<br>".join(filter(None, [
            f"Market segment: {escape(p.market_segment)}" if p.market_segment else "",
            f"Expected launch: {escape(p.expected_launch)}" if p.expected_launch else "",
        ])),
    }
    d = {}
    for k in DRAFT_KEYS:
        v = getattr(p, k, None)
        if isinstance(v, _date):
            v = v.isoformat()
        if v and k in RICH_KEYS:
            html = (p.draft_rich_html or {}).get(k)
            # Use saved formatting only while it still matches the column text (DB edits win)
            v = html if html and html_to_text(html) == v else (v if "<" in v else text_to_html(v))
        d[k] = v or old.get(k) or legacy.get(k, "")
    att = p.draft_attachments if saved else old.get("attachments")
    d["attachments"] = att if isinstance(att, dict) else {}
    return d
