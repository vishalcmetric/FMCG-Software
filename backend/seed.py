"""
Seed script — full demo data for every module.
Run:  python seed.py
"""
import asyncio
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from config import get_settings
from orm_models import (
    Base, Task, AuditLog, User, MasterConfig,
    PPDSubmission, PPDComment,
    Formula, FormulaComment,
    LabExperiment,
    PlantTrial,
    RegulatoryCheck,
    SensoryEvaluation,
    CostingRecord,
    ClaimRecord,
    ArtworkBrief,
)

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

NOW = datetime.now(timezone.utc).replace(tzinfo=None)
ALL = "admin,source,pm,fd,rd_head,marketing,regulatory,packaging,adl,pmsa,sa,mgmt,ceo,production"

# ─────────────────────────────────────────────────────────────
#  TASKS  (every role gets at least 1-2 tasks)
# ─────────────────────────────────────────────────────────────
TASKS = [
    dict(title="Review & approve PPD v2.1",          project_name="Complan Pro Chocolate Boost",    ppd_id="PPD-ZW-2026-001", assigned_role="source",     type="approval",    status="pending", priority="High",     due_date=NOW,                    due_label="Today"),
    dict(title="Approve Formulation F-04",            project_name="Sugar Free Green Stevia+",       ppd_id="PPD-ZW-2026-002", assigned_role="rd_head",    type="approval",    status="pending", priority="Medium",   due_date=NOW+timedelta(days=1),  due_label="Tomorrow"),
    dict(title="Submit Sensory Evaluation Report",    project_name="Everyuth Naturals Aloe Face Wash",ppd_id="PPD-ZW-2026-005",assigned_role="pmsa",       type="sensory",     status="pending", priority="Critical", due_date=NOW,                    due_label="Today"),
    dict(title="Complete Regulatory Assessment",      project_name="Glucon-D Immunity+ Orange",      ppd_id="PPD-ZW-2026-004", assigned_role="regulatory", type="regulatory",  status="pending", priority="Medium",   due_date=NOW+timedelta(days=2),  due_label="2 days"),
    dict(title="Update formula F-04 protein %",       project_name="Complan Pro Chocolate Boost",    ppd_id="PPD-ZW-2026-001", assigned_role="fd",         type="formulation", status="pending", priority="High",     due_date=NOW,                    due_label="Today"),
    dict(title="Lab trial report for F-02",           project_name="Sugar Free Green Stevia+",       ppd_id="PPD-ZW-2026-002", assigned_role="fd",         type="labbook",     status="pending", priority="Medium",   due_date=NOW+timedelta(days=1),  due_label="Tomorrow"),
    dict(title="Ingredient compliance check",         project_name="Complan NutriGro Strawberry",    ppd_id="PPD-ZW-2026-006", assigned_role="regulatory", type="regulatory",  status="pending", priority="High",     due_date=NOW,                    due_label="Today"),
    dict(title="Upload pilot batch report",           project_name="Nycil Cool Menthol XT",          ppd_id="PPD-ZW-2026-003", assigned_role="production", type="plant",       status="pending", priority="High",     due_date=NOW,                    due_label="Today"),
    dict(title="ADL protein & fat analysis F-04",     project_name="Complan Pro Chocolate Boost",    ppd_id="PPD-ZW-2026-001", assigned_role="adl",        type="labbook",     status="pending", priority="High",     due_date=NOW,                    due_label="Today"),
    dict(title="Sensory panel — Sugar Free batch 3",  project_name="Sugar Free Green Stevia+",       ppd_id="PPD-ZW-2026-002", assigned_role="pmsa",       type="sensory",     status="pending", priority="Medium",   due_date=NOW+timedelta(days=1),  due_label="Tomorrow"),
    dict(title="Claim substantiation — 34 nutrients", project_name="Complan Pro Chocolate Boost",    ppd_id="PPD-ZW-2026-001", assigned_role="sa",         type="claim",       status="pending", priority="High",     due_date=NOW,                    due_label="Today"),
    dict(title="Create artwork brief for label",      project_name="Everyuth Naturals Aloe Face Wash",ppd_id="PPD-ZW-2026-005",assigned_role="packaging",  type="artwork",     status="pending", priority="High",     due_date=NOW,                    due_label="Today"),
    dict(title="Packaging feasibility — Nycil XT",    project_name="Nycil Cool Menthol XT",          ppd_id="PPD-ZW-2026-003", assigned_role="packaging",  type="costing",     status="pending", priority="Medium",   due_date=NOW+timedelta(days=2),  due_label="2 days"),
    dict(title="Review artwork brief v2 (SF Stevia)", project_name="Sugar Free Green Stevia+",       ppd_id="PPD-ZW-2026-002", assigned_role="marketing",  type="artwork",     status="pending", priority="Medium",   due_date=NOW+timedelta(days=1),  due_label="Tomorrow"),
    dict(title="Submit PPD brief for NutriGro",       project_name="Complan NutriGro Strawberry",    ppd_id="PPD-ZW-2026-006", assigned_role="marketing",  type="approval",    status="pending", priority="Low",      due_date=NOW+timedelta(days=3),  due_label="3 days"),
    dict(title="Assign PM codes for NutriGro",        project_name="Complan NutriGro Strawberry",    ppd_id="PPD-ZW-2026-006", assigned_role="pm",         type="master",      status="pending", priority="Medium",   due_date=NOW+timedelta(days=2),  due_label="2 days"),
    dict(title="Schedule scale-up trial (GluconD)",   project_name="Glucon-D Immunity+ Orange",      ppd_id="PPD-ZW-2026-004", assigned_role="production", type="plant",       status="pending", priority="Medium",   due_date=NOW+timedelta(days=3),  due_label="3 days"),
    dict(title="CEO final approval — Everyuth Aloe",  project_name="Everyuth Naturals Aloe Face Wash",ppd_id="PPD-ZW-2026-005",assigned_role="ceo",        type="approval",    status="pending", priority="Critical", due_date=NOW,                    due_label="Today"),
    dict(title="Management committee Q2 pipeline review",project_name="Complan Pro Chocolate Boost", ppd_id="PPD-ZW-2026-001", assigned_role="mgmt",       type="approval",    status="pending", priority="High",     due_date=NOW+timedelta(days=1),  due_label="Tomorrow"),
]

# ─────────────────────────────────────────────────────────────
#  PPD SUBMISSIONS  (3 PPDs across different statuses)
# ─────────────────────────────────────────────────────────────
REVIEWERS_PARTIAL = [
    {"role":"marketing",  "team_label":"Marketing Team",   "head_name":"Neeraj Kapoor",  "status":"Reviewed",  "comment":"Positioning looks strong. Ensure chocolate flavor is distinct from Milo.",    "updated_at":(NOW-timedelta(hours=3)).isoformat()},
    {"role":"fd",         "team_label":"R&D / F&D Team",   "head_name":"Priya Sharma",   "status":"In Progress","comment":"",                                                                           "updated_at":""},
    {"role":"regulatory", "team_label":"Regulatory Team",  "head_name":"Amit Verma",     "status":"Pending",   "comment":"",                                                                           "updated_at":""},
    {"role":"packaging",  "team_label":"Packaging Team",   "head_name":"Rajesh Nair",    "status":"Pending",   "comment":"",                                                                           "updated_at":""},
    {"role":"sa",         "team_label":"SA Team",          "head_name":"Kavita SA",      "status":"Pending",   "comment":"",                                                                           "updated_at":""},
]
REVIEWERS_APPROVED = [
    {"role":"marketing",  "team_label":"Marketing Team",   "head_name":"Neeraj Kapoor",  "status":"Approved",  "comment":"Approved — launch Q3 2026.",                                                 "updated_at":(NOW-timedelta(days=2)).isoformat()},
    {"role":"fd",         "team_label":"R&D / F&D Team",   "head_name":"Priya Sharma",   "status":"Approved",  "comment":"Formula finalized, stability data attached.",                                "updated_at":(NOW-timedelta(days=3)).isoformat()},
    {"role":"regulatory", "team_label":"Regulatory Team",  "head_name":"Amit Verma",     "status":"Approved",  "comment":"All ingredients FSSAI-compliant.",                                           "updated_at":(NOW-timedelta(days=2)).isoformat()},
    {"role":"packaging",  "team_label":"Packaging Team",   "head_name":"Rajesh Nair",    "status":"Reviewed",  "comment":"Pack design v3 approved.",                                                   "updated_at":(NOW-timedelta(days=1)).isoformat()},
    {"role":"sa",         "team_label":"SA Team",          "head_name":"Kavita SA",      "status":"Approved",  "comment":"All claims substantiated.",                                                  "updated_at":(NOW-timedelta(days=1)).isoformat()},
]

PPD_DATA = [
    dict(ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",     brand="Complan",    product_category="Nutrition Powder",    target_consumer="Kids 5–15 yrs",     market_segment="Premium Health",  expected_launch="Q3 2026", objective="Create a premium chocolate-flavored nutrition powder with 34 essential nutrients to boost immunity and cognitive development.", key_benefits="• 34 essential nutrients\n• Clinically proven immune support\n• Whey protein + DHA",       status="Under Review",  ppd_version="v2.1", teams_involved=ALL, created_by="Rahul Mehta",  created_by_email="source@fmcgsoftware.com",  created_by_role="source",    reviewers=REVIEWERS_PARTIAL, created_at=NOW-timedelta(days=8),  updated_at=NOW-timedelta(hours=2)),
    dict(ppd_id="PPD-ZW-2026-002", project_name="Sugar Free Green Stevia+",         brand="Sugar Free", product_category="Sugar Substitute",    target_consumer="Diabetics 30+ yrs", market_segment="Health Conscious", expected_launch="Q2 2026", objective="Develop a premium stevia-based sugar substitute with zero glycemic index and natural green tea extract for antioxidant benefits.",  key_benefits="• Zero glycemic index\n• Natural stevia leaf\n• Green tea antioxidants",                  status="Approved",      ppd_version="v1.2", teams_involved=ALL, created_by="Priya Sharma", created_by_email="fd@fmcgsoftware.com",      created_by_role="fd",        reviewers=REVIEWERS_APPROVED, created_at=NOW-timedelta(days=15), updated_at=NOW-timedelta(days=2)),
    dict(ppd_id="PPD-ZW-2026-004", project_name="Glucon-D Immunity+ Orange",        brand="Glucon-D",   product_category="Energy Drink Powder", target_consumer="Adults 25–50 yrs", market_segment="Mass Market",      expected_launch="Q4 2026", objective="AVD of existing Glucon-D with added Vitamin C, Zinc, and Elderberry extract to enhance immune support claims.",                    key_benefits="• Vitamin C 500mg\n• Zinc 10mg\n• Elderberry extract\n• Instant energy",                  status="Rework",        ppd_version="v1.0", teams_involved=ALL, created_by="Sneha Patel",  created_by_email="regulatory@fmcgsoftware.com",created_by_role="regulatory",reviewers=REVIEWERS_PARTIAL, created_at=NOW-timedelta(days=5),  updated_at=NOW-timedelta(hours=6)),
]

PPD_COMMENTS = [
    dict(ppd_id="PPD-ZW-2026-001", user_name="Neeraj Kapoor", user_role="marketing", comment="Strong positioning. Need to confirm the '34 nutrients' claim is supported by ADL data before proceeding.", action_tag="comment",   created_at=NOW-timedelta(hours=5)),
    dict(ppd_id="PPD-ZW-2026-001", user_name="Admin User",    user_role="admin",     comment="PPD moved to Under Review. All departments please complete your review within 3 working days.",           action_tag="comment",   created_at=NOW-timedelta(hours=4)),
    dict(ppd_id="PPD-ZW-2026-001", user_name="Priya Sharma",  user_role="fd",        comment="F&D review in progress. Whey protein sourcing confirmed with Glanbia. Cocoa % being finalized.",         action_tag="comment",   created_at=NOW-timedelta(hours=2)),
    dict(ppd_id="PPD-ZW-2026-002", user_name="Amit Verma",    user_role="regulatory",comment="All ingredients are FSSAI Schedule-1 compliant. Stevia extract dose within permitted limits.",           action_tag="approve",   created_at=NOW-timedelta(days=2)),
    dict(ppd_id="PPD-ZW-2026-002", user_name="Admin User",    user_role="admin",     comment="PPD approved! Moving to Formulation stage.",                                                              action_tag="approve",   created_at=NOW-timedelta(days=1)),
    dict(ppd_id="PPD-ZW-2026-004", user_name="Amit Verma",    user_role="regulatory",comment="Elderberry extract import license pending. PPD needs to be revised with alternate extract or pending license details attached.", action_tag="rework", created_at=NOW-timedelta(hours=6)),
]

# ─────────────────────────────────────────────────────────────
#  FORMULAS  (5 formulas across projects & stages)
# ─────────────────────────────────────────────────────────────
FORMULAS = [
    dict(formula_id="F-ZW-2026-001-01", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",  version="v1.0", formula_type="Trial",  status="In Testing",   protein_source="Whey Protein Isolate 90%", sweetener="Sucrose + Stevia 0.02%", cocoa_pct="12%", protein_pct="24%", sugar_per_100g="10.5", cost_per_kg="385", stability_40c="60 days",   sensory_score="7.8/10", notes="First trial batch. Stevia aftertaste unacceptable — revise to sucralose in v2.",      ingredients=[{"name":"Whey Protein Isolate","qty":"24","unit":"%","supplier":"Glanbia"},{"name":"Cocoa Powder","qty":"12","unit":"%","supplier":"Cargill"},{"name":"Sucrose","qty":"42","unit":"%","supplier":"EID Parry"},{"name":"Vitamin Premix","qty":"3","unit":"%","supplier":"DSM"},{"name":"Natural Chocolate Flavor","qty":"1.5","unit":"%","supplier":"Givaudan"}], created_by="Priya Sharma",   created_by_role="fd",      created_at=NOW-timedelta(days=7),  updated_at=NOW-timedelta(hours=5)),
    dict(formula_id="F-ZW-2026-001-02", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",  version="v2.0", formula_type="Trial",  status="In Testing",   protein_source="Whey Protein Isolate 90%", sweetener="Sucrose + Sucralose",    cocoa_pct="14%", protein_pct="26%", sugar_per_100g="9.8",  cost_per_kg="402", stability_40c="75 days",   sensory_score="8.3/10", notes="Improved — sucralose replaces stevia; protein increased to 26%. Better taste profile.", ingredients=[{"name":"Whey Protein Isolate","qty":"26","unit":"%","supplier":"Glanbia"},{"name":"Cocoa Powder Alkalized","qty":"14","unit":"%","supplier":"Cargill"},{"name":"Sucrose","qty":"40","unit":"%","supplier":"EID Parry"},{"name":"Sucralose","qty":"0.015","unit":"%","supplier":"JK Sucralose"},{"name":"DHA Powder","qty":"0.5","unit":"%","supplier":"DSM"},{"name":"Vitamin Premix","qty":"3","unit":"%","supplier":"DSM"}], created_by="Priya Sharma",   created_by_role="fd",      created_at=NOW-timedelta(days=4),  updated_at=NOW-timedelta(hours=2)),
    dict(formula_id="F-ZW-2026-002-01", ppd_id="PPD-ZW-2026-002", project_name="Sugar Free Green Stevia+",     version="v1.0", formula_type="Pilot",  status="Recommended",  protein_source="N/A",                      sweetener="Stevia RA97 + Erythritol",cocoa_pct="N/A", protein_pct="N/A", sugar_per_100g="0",    cost_per_kg="245", stability_40c="90 days",   sensory_score="8.7/10", notes="Pilot formula final. Erythritol bulk + mouthfeel. Stevia RA97 clean sweetness.", ingredients=[{"name":"Stevia RA97","qty":"0.4","unit":"%","supplier":"PureCircle"},{"name":"Erythritol","qty":"98","unit":"%","supplier":"Cargill"},{"name":"Green Tea Extract","qty":"0.3","unit":"%","supplier":"Kemin"},{"name":"Anti-caking agent","qty":"0.3","unit":"%","supplier":"Evonik"}],                                                                                                                                                  created_by="Dr. Anjali Rao", created_by_role="rd_head", created_at=NOW-timedelta(days=12), updated_at=NOW-timedelta(days=2)),
    dict(formula_id="F-ZW-2026-003-01", ppd_id="PPD-ZW-2026-003", project_name="Nycil Cool Menthol XT",        version="v1.0", formula_type="Final",  status="Recommended",  protein_source="N/A",                      sweetener="N/A",                    cocoa_pct="N/A", protein_pct="N/A", sugar_per_100g="N/A",  cost_per_kg="180", stability_40c="24 months", sensory_score="9.1/10", notes="Final for scale-up. Menthol 2.5% strong cooling. Talc base smooth application.", ingredients=[{"name":"Talc (Micronized)","qty":"80","unit":"%","supplier":"Imerys"},{"name":"Zinc Oxide","qty":"5","unit":"%","supplier":"Rubamin"},{"name":"Menthol Crystals","qty":"2.5","unit":"%","supplier":"Bhagat Industries"},{"name":"Perfume (Menthol-Eucalyptus)","qty":"2","unit":"%","supplier":"Symrise"},{"name":"Anti-microbial agent","qty":"0.5","unit":"%","supplier":"Lonza"}],                                                                                                                created_by="Priya Sharma",   created_by_role="fd",      created_at=NOW-timedelta(days=20), updated_at=NOW-timedelta(days=5)),
    dict(formula_id="F-ZW-2026-004-01", ppd_id="PPD-ZW-2026-004", project_name="Glucon-D Immunity+ Orange",    version="v1.0", formula_type="Trial",  status="Draft",        protein_source="N/A",                      sweetener="Sucrose + Elderberry",   cocoa_pct="N/A", protein_pct="N/A", sugar_per_100g="18.5", cost_per_kg="290", stability_40c="Pending",    sensory_score="Pending",notes="Trial formula pending elderberry import clearance. Orange flavor finalized. Vitamin C & Zinc premix sourced from DSM.", ingredients=[{"name":"Sucrose","qty":"75","unit":"%","supplier":"EID Parry"},{"name":"Orange Flavor","qty":"1.5","unit":"%","supplier":"Givaudan"},{"name":"Vitamin C","qty":"0.5","unit":"%","supplier":"DSM"},{"name":"Zinc Sulfate","qty":"0.01","unit":"%","supplier":"Rubamin"},{"name":"Elderberry Extract","qty":"0.1","unit":"%","supplier":"Pending"}],                                                                                              created_by="Priya Sharma",   created_by_role="fd",      created_at=NOW-timedelta(days=3),  updated_at=NOW-timedelta(hours=8)),
    dict(formula_id="F-ZW-2026-005-01", ppd_id="PPD-ZW-2026-005", project_name="Everyuth Naturals Aloe Face Wash", version="v2.0", formula_type="Pilot", status="Recommended", protein_source="N/A",                    sweetener="N/A",                    cocoa_pct="N/A", protein_pct="N/A", sugar_per_100g="N/A",  cost_per_kg="125", stability_40c="12 months", sensory_score="9.0/10", notes="Aloe vera 5% + Neem extract. pH 5.5. Dermat tested. Ready for CEO approval & commercial launch.", ingredients=[{"name":"Water (DM)","qty":"65","unit":"%","supplier":"In-house"},{"name":"Sodium Laureth Sulfate","qty":"12","unit":"%","supplier":"Nouryon"},{"name":"Aloe Vera Extract","qty":"5","unit":"%","supplier":"Kemin"},{"name":"Neem Leaf Extract","qty":"1","unit":"%","supplier":"Sami Labs"},{"name":"Cocamidopropyl Betaine","qty":"4","unit":"%","supplier":"Nouryon"},{"name":"Fragrance","qty":"0.5","unit":"%","supplier":"Symrise"}], created_by="Dr. Anjali Rao", created_by_role="rd_head", created_at=NOW-timedelta(days=25), updated_at=NOW-timedelta(days=8)),
]

FORMULA_COMMENTS = [
    dict(formula_id="F-ZW-2026-001-01", user_name="Dr. Anjali Rao", user_role="rd_head",  comment="Good first trial. Stevia aftertaste unacceptable — consumers rated 3/10. Replace with sucralose in v2.", created_at=NOW-timedelta(days=6)),
    dict(formula_id="F-ZW-2026-001-01", user_name="Priya Sharma",   user_role="fd",       comment="Noted. Will reformulate v2 with sucralose 0.015% and increase protein to 26%.", created_at=NOW-timedelta(days=5)),
    dict(formula_id="F-ZW-2026-001-02", user_name="Meena PMSA",     user_role="pmsa",     comment="Sensory panel 24 adults scored 8.3/10. Mouthfeel excellent. Slight graininess at 60°C — recommend increasing emulsifier.", created_at=NOW-timedelta(hours=3)),
    dict(formula_id="F-ZW-2026-001-02", user_name="Dr. Anjali Rao", user_role="rd_head",  comment="Cost is above target. Request Rajesh Nair to explore alternate tin vendor to bring it under ₹380/kg.", created_at=NOW-timedelta(hours=1)),
    dict(formula_id="F-ZW-2026-002-01", user_name="Dr. Anjali Rao", user_role="rd_head",  comment="Formula recommended for plant trial. Stability at 40°C/75%RH — no caking at 90 days. Approved for pilot batch.", created_at=NOW-timedelta(days=3)),
    dict(formula_id="F-ZW-2026-003-01", user_name="Amit Verma",     user_role="regulatory",comment="Menthol % within cosmetic product guidelines. Zinc oxide approved for skin care use.", created_at=NOW-timedelta(days=6)),
    dict(formula_id="F-ZW-2026-004-01", user_name="Amit Verma",     user_role="regulatory",comment="Formula on hold pending elderberry import license from FSSAI. Suggest alternate — Amla extract as substitute.", created_at=NOW-timedelta(hours=4)),
    dict(formula_id="F-ZW-2026-005-01", user_name="Neeraj Kapoor",  user_role="marketing", comment="Artwork brief submitted for this formula. Need packaging feasibility sign-off from Rajesh.", created_at=NOW-timedelta(days=5)),
]

# ─────────────────────────────────────────────────────────────
#  LAB EXPERIMENTS  (7 experiments across projects)
# ─────────────────────────────────────────────────────────────
LAB_EXPS = [
    dict(exp_id="EXP-ZW-2026-001-01", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",  title="Whey Protein Solubility Trial",              batch_no="B-2026-001", temperature="25°C", duration="2 hrs",   observations="Whey protein isolate 90% dissolved completely within 30 seconds in water at 25°C. No visible aggregation. Solution transparent with slight yellowish tint. pH = 6.8.", result="Pass",        status="Closed",  created_by="Priya Sharma",   created_by_role="fd",  created_at=NOW-timedelta(days=9),  updated_at=NOW-timedelta(days=8)),
    dict(exp_id="EXP-ZW-2026-001-02", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",  title="Stability Test at 40°C/75%RH — F-04",        batch_no="B-2026-004", temperature="40°C", duration="75 days", observations="Checked at 15, 30, 45, 60, 75 days. No caking observed. Moisture stable at 3.2%. Color & flavor retained. Minor powder compaction at 75d — acceptable.", result="Pass",        status="Active",  created_by="Dr. Suresh ADL", created_by_role="adl", created_at=NOW-timedelta(days=6),  updated_at=NOW-timedelta(hours=4)),
    dict(exp_id="EXP-ZW-2026-001-03", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",  title="Microbiological Purity — Batch B-2026-004",   batch_no="B-2026-004", temperature="25°C", duration="48 hrs",  observations="APC <50 CFU/g. E. coli absent. Salmonella absent. Staph aureus absent. All results within BIS/FSSAI limits for powdered health foods.", result="Pass",        status="Closed",  created_by="Dr. Suresh ADL", created_by_role="adl", created_at=NOW-timedelta(days=5),  updated_at=NOW-timedelta(days=4)),
    dict(exp_id="EXP-ZW-2026-002-01", ppd_id="PPD-ZW-2026-002", project_name="Sugar Free Green Stevia+",     title="Erythritol Crystallisation at 5°C",           batch_no="B-2026-007", temperature="5°C",  duration="7 days",  observations="Stored at 5°C for 7 days. Slight crystallisation on surface — characteristic of erythritol at low temps. Dissolves immediately at room temp. Not a consumer concern.", result="Inconclusive",status="Active",  created_by="Priya Sharma",   created_by_role="fd",  created_at=NOW-timedelta(days=4),  updated_at=NOW-timedelta(hours=8)),
    dict(exp_id="EXP-ZW-2026-002-02", ppd_id="PPD-ZW-2026-002", project_name="Sugar Free Green Stevia+",     title="Glycemic Index Validation — CFTRI Protocol",  batch_no="B-2026-008", temperature="37°C", duration="2 hrs",   observations="In-vitro GI test conducted per CFTRI protocol. Glucose response curve flat — confirmed zero glycemic impact. External lab certification submitted.", result="Pass",        status="Closed",  created_by="Dr. Suresh ADL", created_by_role="adl", created_at=NOW-timedelta(days=10), updated_at=NOW-timedelta(days=9)),
    dict(exp_id="EXP-ZW-2026-003-01", ppd_id="PPD-ZW-2026-003", project_name="Nycil Cool Menthol XT",        title="Menthol Retention in Talc Base — 6 months",   batch_no="B-2026-010", temperature="30°C", duration="6 months",observations="",                                                                                                                                                result="In Progress", status="Active",  created_by="Priya Sharma",   created_by_role="fd",  created_at=NOW-timedelta(days=3),  updated_at=NOW-timedelta(hours=1)),
    dict(exp_id="EXP-ZW-2026-004-01", ppd_id="PPD-ZW-2026-004", project_name="Glucon-D Immunity+ Orange",    title="Vitamin C Stability under Accelerated Conditions",batch_no="B-2026-012",temperature="40°C", duration="90 days", observations="Vitamin C (ascorbic acid) degradation checked at 30 & 60 days. 15% loss at 30d, 28% at 60d — within acceptable range (<30% at 60d). Antioxidant packaging recommended.", result="Pass",        status="Active",  created_by="Dr. Suresh ADL", created_by_role="adl", created_at=NOW-timedelta(days=2),  updated_at=NOW-timedelta(hours=3)),
]

# ─────────────────────────────────────────────────────────────
#  PLANT TRIALS  (5 trials across projects)
# ─────────────────────────────────────────────────────────────
PLANT_TRIALS = [
    dict(trial_id="PT-ZW-2026-002-01", ppd_id="PPD-ZW-2026-002", project_name="Sugar Free Green Stevia+",     plant_location="Baddi Plant — Unit 1",     batch_size="300 KG",  stage="Stability",      status="Completed",   bom_code="BOM-002", mfc_code="MFC-014", product_code="P-SFS-001", sfg_code="SFG-102", notes="Stability run complete. No clumping. Sachet sealing efficiency 99.8%. Passed all physical tests.", scheduled_date="2026-01-05", completed_date="2026-01-06", created_by="Anil Kumar",  created_by_role="production", created_at=NOW-timedelta(days=20), updated_at=NOW-timedelta(days=18)),
    dict(trial_id="PT-ZW-2026-003-01", ppd_id="PPD-ZW-2026-003", project_name="Nycil Cool Menthol XT",        plant_location="Baddi Plant — Unit 2",     batch_size="500 KG",  stage="Pilot",          status="Completed",   bom_code="BOM-003", mfc_code="MFC-017", product_code="P-NYX-001", sfg_code="SFG-103", notes="Pilot batch successful. Powder flowability excellent. Fill weight consistent at ±0.3g. Moving to 1T commercial run.", scheduled_date="2026-01-15", completed_date="2026-01-16", created_by="Anil Kumar",  created_by_role="production", created_at=NOW-timedelta(days=14), updated_at=NOW-timedelta(days=12)),
    dict(trial_id="PT-ZW-2026-003-02", ppd_id="PPD-ZW-2026-003", project_name="Nycil Cool Menthol XT",        plant_location="Baddi Plant — Unit 2",     batch_size="1000 KG", stage="Commercial Run", status="In Progress", bom_code="BOM-003", mfc_code="MFC-018", product_code="P-NYX-001", sfg_code="SFG-103", notes="Commercial run in progress. Menthol aroma strong. Packaging line running at 98% efficiency.", scheduled_date="2026-02-10", completed_date="",           created_by="Anil Kumar",  created_by_role="production", created_at=NOW-timedelta(days=5),  updated_at=NOW-timedelta(hours=2)),
    dict(trial_id="PT-ZW-2026-004-01", ppd_id="PPD-ZW-2026-004", project_name="Glucon-D Immunity+ Orange",    plant_location="Ahmedabad Plant — Unit 1", batch_size="200 KG",  stage="Pilot",          status="Scheduled",   bom_code="BOM-004", mfc_code="MFC-022", product_code="P-GDI-001", sfg_code="SFG-103", notes="Hold on elderberry extract import license. Trial scheduled post regulatory clearance.", scheduled_date="2026-03-15", completed_date="",           created_by="Anil Kumar",  created_by_role="production", created_at=NOW-timedelta(days=2),  updated_at=NOW-timedelta(hours=6)),
    dict(trial_id="PT-ZW-2026-005-01", ppd_id="PPD-ZW-2026-005", project_name="Everyuth Naturals Aloe Face Wash",plant_location="Mumbai Plant — Unit 3",  batch_size="2000 KG", stage="Scale-up",       status="Completed",   bom_code="BOM-005", mfc_code="MFC-030", product_code="P-EAF-001", sfg_code="SFG-105", notes="Scale-up batch completed successfully. Viscosity stable at 3200 cP. pH 5.5 throughout batch. Approved for CEO sign-off.", scheduled_date="2026-01-20", completed_date="2026-01-22", created_by="Anil Kumar",  created_by_role="production", created_at=NOW-timedelta(days=10), updated_at=NOW-timedelta(days=8)),
]

# ─────────────────────────────────────────────────────────────
#  REGULATORY CHECKS  (6 checks)
# ─────────────────────────────────────────────────────────────
REG_CHECKS = [
    dict(reg_id="REG-ZW-2026-001-01", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",     check_type="Ingredient Compliance",  ingredient_or_claim="Whey Protein Isolate (imported)", assigned_to="Amit Verma", assigned_role="regulatory", due_date="2026-02-28", status="Approved",       notes="Imported under 'Edible Preparations' — Schedule 1 permitted. NOC from FSSAI obtained.",                                        created_by="Admin User", created_by_role="admin", created_at=NOW-timedelta(days=8),  updated_at=NOW-timedelta(days=5)),
    dict(reg_id="REG-ZW-2026-001-02", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",     check_type="Claim Substantiation",   ingredient_or_claim="34 essential nutrients claim",   assigned_to="Kavita SA",   assigned_role="sa",         due_date="2026-03-10", status="Under Review",   notes="ADL analysis pending for 5 micronutrients (Se, Cr, Mo, Mn, K). Awaiting lab report from Dr. Suresh.",                          created_by="Admin User", created_by_role="admin", created_at=NOW-timedelta(days=6),  updated_at=NOW-timedelta(hours=3)),
    dict(reg_id="REG-ZW-2026-001-03", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",     check_type="Label Compliance",       ingredient_or_claim="Front-of-pack nutrition claims",  assigned_to="Amit Verma", assigned_role="regulatory", due_date="2026-03-20", status="Pending",        notes="FSSAI 2020 labeling rules apply. Draft label received from Creativeland Asia. Review in progress.",                             created_by="Admin User", created_by_role="admin", created_at=NOW-timedelta(days=2),  updated_at=NOW-timedelta(hours=1)),
    dict(reg_id="REG-ZW-2026-002-01", ppd_id="PPD-ZW-2026-002", project_name="Sugar Free Green Stevia+",        check_type="Label Compliance",       ingredient_or_claim="'No Sugar Added' claim on label", assigned_to="Amit Verma", assigned_role="regulatory", due_date="2026-01-30", status="Approved",       notes="Stevia product qualifies for 'No Added Sugar' claim per FSSAI regs. Label draft approved.",                                    created_by="Admin User", created_by_role="admin", created_at=NOW-timedelta(days=12), updated_at=NOW-timedelta(days=8)),
    dict(reg_id="REG-ZW-2026-004-01", ppd_id="PPD-ZW-2026-004", project_name="Glucon-D Immunity+ Orange",       check_type="FSSAI Filing",           ingredient_or_claim="Elderberry Extract (novel ingredient)", assigned_to="Amit Verma", assigned_role="regulatory", due_date="2026-02-15", status="Rework Required",notes="Elderberry extract is a novel ingredient under FSSAI. Need product approval application or substitute. Objection filed 15-Jan.", created_by="Admin User", created_by_role="admin", created_at=NOW-timedelta(days=7),  updated_at=NOW-timedelta(hours=6)),
    dict(reg_id="REG-ZW-2026-005-01", ppd_id="PPD-ZW-2026-005", project_name="Everyuth Naturals Aloe Face Wash",check_type="Ingredient Compliance",  ingredient_or_claim="SLES (Sodium Laureth Sulfate) — cosmetic grade", assigned_to="Amit Verma", assigned_role="regulatory", due_date="2026-02-01", status="Approved", notes="SLES cosmetic grade — as per BIS IS 4955 and PCPCS Act 2002. Concentration within limits. Approved.", created_by="Admin User", created_by_role="admin", created_at=NOW-timedelta(days=15), updated_at=NOW-timedelta(days=10)),
]

# ─────────────────────────────────────────────────────────────
#  SENSORY EVALUATIONS  (5 evaluations)
# ─────────────────────────────────────────────────────────────
SENSORY_EVALS = [
    dict(eval_id="SE-ZW-2026-001-01", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",     formula_id="F-ZW-2026-001-01", panel_size=24, eval_date="2026-01-20", overall_score="78", aroma="82", taste="72", mouthfeel="80", aftertaste="68", adl_protein_pct="23.8%", adl_fat_pct="8.2%",  adl_moisture="3.1%", adl_ash="4.5%", adl_apc="<100 CFU/g",adl_ecoli="Absent", status="Fail",    notes="Aftertaste 68% — stevia bitterness unacceptable. F-04-v2 with sucralose recommended.", created_by="Meena PMSA", created_by_role="pmsa", created_at=NOW-timedelta(days=7),  updated_at=NOW-timedelta(days=6)),
    dict(eval_id="SE-ZW-2026-001-02", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",     formula_id="F-ZW-2026-001-02", panel_size=30, eval_date="2026-02-01", overall_score="83", aroma="86", taste="84", mouthfeel="85", aftertaste="79", adl_protein_pct="25.9%", adl_fat_pct="8.5%",  adl_moisture="3.0%", adl_ash="4.3%", adl_apc="<50 CFU/g", adl_ecoli="Absent", status="Pass",    notes="Excellent improvement. Sucralose gives clean taste. 83% panel preference. Minor aroma adjustment recommended.", created_by="Meena PMSA", created_by_role="pmsa", created_at=NOW-timedelta(days=2),  updated_at=NOW-timedelta(hours=4)),
    dict(eval_id="SE-ZW-2026-002-01", ppd_id="PPD-ZW-2026-002", project_name="Sugar Free Green Stevia+",        formula_id="F-ZW-2026-002-01", panel_size=20, eval_date="2026-01-25", overall_score="87", aroma="80", taste="89", mouthfeel="86", aftertaste="88", adl_protein_pct="N/A",   adl_fat_pct="N/A",  adl_moisture="0.8%", adl_ash="0.2%", adl_apc="<10 CFU/g", adl_ecoli="Absent", status="Pass",    notes="Outstanding scores. No bitterness. Panel rated clean sweet taste 9/10. Ready for consumer panel.", created_by="Meena PMSA", created_by_role="pmsa", created_at=NOW-timedelta(days=10), updated_at=NOW-timedelta(days=9)),
    dict(eval_id="SE-ZW-2026-003-01", ppd_id="PPD-ZW-2026-003", project_name="Nycil Cool Menthol XT",           formula_id="F-ZW-2026-003-01", panel_size=18, eval_date="2026-01-10", overall_score="91", aroma="95", taste="N/A",mouthfeel="92", aftertaste="N/A",adl_protein_pct="N/A",   adl_fat_pct="N/A",  adl_moisture="0.3%", adl_ash="3.2%", adl_apc="<10 CFU/g", adl_ecoli="Absent", status="Pass",    notes="Top scores. Cooling sensation rated 9.5/10. Dermat evaluation — no irritation in 18/18 subjects.", created_by="Meena PMSA", created_by_role="pmsa", created_at=NOW-timedelta(days=16), updated_at=NOW-timedelta(days=14)),
    dict(eval_id="SE-ZW-2026-005-01", ppd_id="PPD-ZW-2026-005", project_name="Everyuth Naturals Aloe Face Wash",formula_id="F-ZW-2026-005-01", panel_size=35, eval_date="2026-01-28", overall_score="90", aroma="88", taste="N/A",mouthfeel="92", aftertaste="N/A",adl_protein_pct="N/A",   adl_fat_pct="N/A",  adl_moisture="75.2%",adl_ash="1.1%", adl_apc="<20 CFU/g", adl_ecoli="Absent", status="Pass",    notes="35-member panel — 91% rated skin feel 'very good' or 'excellent'. Fragrance well accepted. pH 5.5 optimal.", created_by="Meena PMSA", created_by_role="pmsa", created_at=NOW-timedelta(days=4),  updated_at=NOW-timedelta(days=3)),
]

# ─────────────────────────────────────────────────────────────
#  COSTING RECORDS  (5 records)
# ─────────────────────────────────────────────────────────────
COSTING = [
    dict(cost_id="CST-ZW-2026-001-01", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",
         formula_id="F-ZW-2026-001-02",
         cost_breakdown=[{"component":"Whey Protein Isolate","pct":"26","cost_inr":"168"},{"component":"Cocoa Powder","pct":"14","cost_inr":"45"},{"component":"Sugar & Sweeteners","pct":"40","cost_inr":"52"},{"component":"Vitamin Premix","pct":"3","cost_inr":"38"},{"component":"Flavors & Others","pct":"5","cost_inr":"22"},{"component":"Packaging","pct":"12","cost_inr":"77"}],
         total_cost_per_kg="402", packaging_items=[{"item":"400g Tin (Printed)","cost_per_unit":"28","feasibility":"Feasible"},{"item":"200g Pouch","cost_per_unit":"12","feasibility":"Feasible"},{"item":"Shipper Box (12 units)","cost_per_unit":"45","feasibility":"Feasible"}],
         status="Under Review", notes="Cost ₹402/kg vs target ₹380/kg. Explore alternate tin vendor to cut ~5%.",
         created_by="Rajesh Nair", created_by_role="packaging", created_at=NOW-timedelta(days=4), updated_at=NOW-timedelta(hours=3)),
    dict(cost_id="CST-ZW-2026-002-01", ppd_id="PPD-ZW-2026-002", project_name="Sugar Free Green Stevia+",
         formula_id="F-ZW-2026-002-01",
         cost_breakdown=[{"component":"Erythritol","pct":"98","cost_inr":"196"},{"component":"Stevia RA97","pct":"0.4","cost_inr":"12"},{"component":"Green Tea Extract","pct":"0.3","cost_inr":"18"},{"component":"Packaging","pct":"1.3","cost_inr":"19"}],
         total_cost_per_kg="245", packaging_items=[{"item":"100-Sachet Box","cost_per_unit":"18","feasibility":"Feasible"},{"item":"500g Refill Pouch","cost_per_unit":"10","feasibility":"Under Review"}],
         status="Approved", notes="Well within target ₹260/kg. Approved for production.",
         created_by="Rajesh Nair", created_by_role="packaging", created_at=NOW-timedelta(days=10), updated_at=NOW-timedelta(days=7)),
    dict(cost_id="CST-ZW-2026-003-01", ppd_id="PPD-ZW-2026-003", project_name="Nycil Cool Menthol XT",
         formula_id="F-ZW-2026-003-01",
         cost_breakdown=[{"component":"Talc Micronized","pct":"80","cost_inr":"88"},{"component":"Zinc Oxide","pct":"5","cost_inr":"22"},{"component":"Menthol Crystals","pct":"2.5","cost_inr":"18"},{"component":"Fragrance","pct":"2","cost_inr":"16"},{"component":"Packaging","pct":"10.5","cost_inr":"36"}],
         total_cost_per_kg="180", packaging_items=[{"item":"150g Shaker Bottle (HDPE)","cost_per_unit":"8","feasibility":"Feasible"},{"item":"75g Travel Pack","cost_per_unit":"5","feasibility":"Feasible"},{"item":"Outer Carton","cost_per_unit":"3","feasibility":"Feasible"}],
         status="Approved", notes="Cost ₹180/kg vs target ₹190/kg — ₹10 under budget. Approved.",
         created_by="Rajesh Nair", created_by_role="packaging", created_at=NOW-timedelta(days=18), updated_at=NOW-timedelta(days=12)),
    dict(cost_id="CST-ZW-2026-004-01", ppd_id="PPD-ZW-2026-004", project_name="Glucon-D Immunity+ Orange",
         formula_id="F-ZW-2026-004-01",
         cost_breakdown=[{"component":"Sucrose","pct":"75","cost_inr":"97"},{"component":"Orange Flavor","pct":"1.5","cost_inr":"18"},{"component":"Vitamin C Premix","pct":"0.5","cost_inr":"22"},{"component":"Zinc Sulfate","pct":"0.01","cost_inr":"5"},{"component":"Elderberry Extract","pct":"0.1","cost_inr":"35"},{"component":"Packaging Laminate Pouch","pct":"23","cost_inr":"113"}],
         total_cost_per_kg="290", packaging_items=[{"item":"200g Laminate Pouch","cost_per_unit":"14","feasibility":"Feasible"},{"item":"500g Jar","cost_per_unit":"22","feasibility":"Under Review"},{"item":"Outer Shipper (24 pouches)","cost_per_unit":"38","feasibility":"Feasible"}],
         status="Draft", notes="Pending regulatory clearance for elderberry. Cost estimate ₹290/kg vs target ₹310/kg — within budget.",
         created_by="Rajesh Nair", created_by_role="packaging", created_at=NOW-timedelta(days=3), updated_at=NOW-timedelta(hours=5)),
    dict(cost_id="CST-ZW-2026-005-01", ppd_id="PPD-ZW-2026-005", project_name="Everyuth Naturals Aloe Face Wash",
         formula_id="F-ZW-2026-005-01",
         cost_breakdown=[{"component":"Active Ingredients (Aloe+Neem)","pct":"6","cost_inr":"28"},{"component":"Surfactants (SLES+Betaine)","pct":"16","cost_inr":"32"},{"component":"Water & Additives","pct":"65","cost_inr":"8"},{"component":"Preservatives & Fragrance","pct":"1.5","cost_inr":"12"},{"component":"Tube Packaging","pct":"11.5","cost_inr":"45"}],
         total_cost_per_kg="125", packaging_items=[{"item":"100ml Tube (White Laminate)","cost_per_unit":"6","feasibility":"Feasible"},{"item":"200ml Tube","cost_per_unit":"9","feasibility":"Feasible"},{"item":"500ml Pump Dispenser","cost_per_unit":"28","feasibility":"Under Review"}],
         status="Approved", notes="Cost ₹125/kg well below target ₹160/kg. High margin product. CEO approval pending launch.",
         created_by="Rajesh Nair", created_by_role="packaging", created_at=NOW-timedelta(days=8), updated_at=NOW-timedelta(days=6)),
]

# ─────────────────────────────────────────────────────────────
#  CLAIMS  (6 claim records)
# ─────────────────────────────────────────────────────────────
CLAIMS = [
    dict(claim_id="CLM-ZW-2026-001-01", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",  claim_text="Contains 34 essential vitamins and minerals to support growth",       evidence="ADL analysis report + USDA nutritional database comparison",      assigned_to="Kavita SA",   assigned_role="sa",          status="In Review", notes="ADL report received for 29/34 nutrients. 5 micronutrients pending confirmation.", created_by="Admin User", created_by_role="admin", created_at=NOW-timedelta(days=5),  updated_at=NOW-timedelta(hours=2)),
    dict(claim_id="CLM-ZW-2026-001-02", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",  claim_text="Clinically proven to improve memory and concentration in children", evidence="2 RCTs published in JPEN 2024 — Complan vs placebo, n=180",         assigned_to="Kavita SA",   assigned_role="sa",          status="Verified",  notes="Both RCTs meet ICMR guidelines. Claim wording vetted by regulatory. Approved for label.", created_by="Admin User", created_by_role="admin", created_at=NOW-timedelta(days=6),  updated_at=NOW-timedelta(days=3)),
    dict(claim_id="CLM-ZW-2026-001-03", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",  claim_text="Rich in DHA to support brain development",                          evidence="DHA content 50mg per serving — validated by ADL. EFSA permitted dose.", assigned_to="Kavita SA",  assigned_role="sa",          status="Pending",   notes="DHA claim approved by EFSA. Awaiting FSSAI India classification for health claim.", created_by="Admin User", created_by_role="admin", created_at=NOW-timedelta(days=3),  updated_at=NOW-timedelta(hours=6)),
    dict(claim_id="CLM-ZW-2026-002-01", ppd_id="PPD-ZW-2026-002", project_name="Sugar Free Green Stevia+",     claim_text="Zero glycemic index — safe for diabetics",                          evidence="GI testing by CFTRI Mysore — GI value: 0 (certified)",            assigned_to="Amit Verma",  assigned_role="regulatory",  status="Verified",  notes="GI=0 certified by CFTRI. FSSAI permits diabetic suitability claim. Label text approved.", created_by="Admin User", created_by_role="admin", created_at=NOW-timedelta(days=12), updated_at=NOW-timedelta(days=8)),
    dict(claim_id="CLM-ZW-2026-002-02", ppd_id="PPD-ZW-2026-002", project_name="Sugar Free Green Stevia+",     claim_text="Contains natural green tea antioxidants (EGCG)",                     evidence="HPLC analysis — EGCG 8mg per serving. EFSA & FSSAI permitted.",     assigned_to="Kavita SA",   assigned_role="sa",          status="Verified",  notes="EGCG claim substantiated. Kemin supplier certificate + lab certificate attached.", created_by="Admin User", created_by_role="admin", created_at=NOW-timedelta(days=11), updated_at=NOW-timedelta(days=7)),
    dict(claim_id="CLM-ZW-2026-005-01", ppd_id="PPD-ZW-2026-005", project_name="Everyuth Naturals Aloe Face Wash",claim_text="Dermatologically tested — suitable for sensitive skin",           evidence="48-hr patch test on 50 volunteers — zero irritation.",             assigned_to="Kavita SA",   assigned_role="sa",          status="Verified",  notes="Dermat test conducted by Dermscan India. Zero adverse reactions. Certificate attached. Approved for label.", created_by="Admin User", created_by_role="admin", created_at=NOW-timedelta(days=9), updated_at=NOW-timedelta(days=6)),
]

# ─────────────────────────────────────────────────────────────
#  ARTWORK BRIEFS  (5 briefs)
# ─────────────────────────────────────────────────────────────
ARTWORKS = [
    dict(artwork_id="ART-ZW-2026-001-01", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",     brand="Complan",    version="v1.0", artwork_type="Label",  sku="400g Tin",    brief_notes="Premium chocolate variant. Main visual: child playing sports. Deep chocolate brown + gold accents. Mandatory: FMCG Software logo, FSSAI mark, '34 nutrients' badge. Font: Complan brand font.",       design_link="https://drive.google.com/complan-choc-label-v1", comment="",                                                                assigned_to="Creativeland Asia", status="Design In Progress", created_by="Neeraj Kapoor", created_by_role="marketing", created_at=NOW-timedelta(days=4),  updated_at=NOW-timedelta(hours=3)),
    dict(artwork_id="ART-ZW-2026-001-02", ppd_id="PPD-ZW-2026-001", project_name="Complan Pro Chocolate Boost",     brand="Complan",    version="v1.0", artwork_type="Pouch",  sku="200g Pouch",  brief_notes="Pouch variant of same formula. Same visual language as tin but lighter — reclosable zip pouch. Must show '10% less sugar vs market leader' callout. Whey protein graphic.",                           design_link="",                                                comment="",                                                                assigned_to="Creativeland Asia", status="Brief Pending",      created_by="Neeraj Kapoor", created_by_role="marketing", created_at=NOW-timedelta(days=2),  updated_at=NOW-timedelta(hours=1)),
    dict(artwork_id="ART-ZW-2026-002-01", ppd_id="PPD-ZW-2026-002", project_name="Sugar Free Green Stevia+",        brand="Sugar Free", version="v2.1", artwork_type="Carton", sku="100 Sachets", brief_notes="Clean health design. White + Green (stevia leaf). 'No Sugar Added' claim, diabetic symbol, green dot. Updated v2.1 with green dot logo per regulatory feedback.",                                   design_link="https://drive.google.com/sf-stevia-carton-v2",   comment="v2.1 — green dot added. Awaiting marketing sign-off.",    assigned_to="Mccann Health",     status="Under Review",       created_by="Neeraj Kapoor", created_by_role="marketing", created_at=NOW-timedelta(days=10), updated_at=NOW-timedelta(hours=1)),
    dict(artwork_id="ART-ZW-2026-003-01", ppd_id="PPD-ZW-2026-003", project_name="Nycil Cool Menthol XT",           brand="Nycil",      version="v3.2", artwork_type="Pouch",  sku="150g Shaker", brief_notes="Bold XT variant. Ice blue + white. Menthol crystal visual with 'EXTRA COOLING' badge. 'Dermatologically Tested' seal. 150g Net Weight prominently.",                                               design_link="https://drive.google.com/nycil-xt-pouch-v3",    comment="Approved by marketing & packaging. Ready for print.",     assigned_to="JWT India",         status="Approved",           created_by="Neeraj Kapoor", created_by_role="marketing", created_at=NOW-timedelta(days=18), updated_at=NOW-timedelta(days=12)),
    dict(artwork_id="ART-ZW-2026-005-01", ppd_id="PPD-ZW-2026-005", project_name="Everyuth Naturals Aloe Face Wash",brand="Everyuth",   version="v1.0", artwork_type="Tube",   sku="100ml Tube",  brief_notes="Fresh green design. Aloe vera leaf visual + 'Naturals' script. Must include: dermat tested seal, FSSAI lic no, MRP zone, batch code. Key claims: 'Aloe + Neem' and 'pH 5.5 skin-friendly'.",      design_link="https://drive.google.com/everyuth-aloe-tube-v1", comment="CEO approval pending. Artwork ready once sign-off received.", assigned_to="FCB Interface",   status="Under Review",       created_by="Neeraj Kapoor", created_by_role="marketing", created_at=NOW-timedelta(days=6),  updated_at=NOW-timedelta(hours=2)),
]

# ─────────────────────────────────────────────────────────────
#  AUDIT LOGS
# ─────────────────────────────────────────────────────────────
AUDIT_LOGS = [
    dict(user_name="Priya Sharma",   user_email="fd@fmcgsoftware.com",         action="SUBMIT",   action_label="submitted formula F-04 v2.0 for sensory review",      entity="F-NP-2026-001-02", involved_roles="admin,rd_head,fd,pmsa",    ip="10.0.35.22",  time_ago="2h",  timestamp=NOW-timedelta(hours=2)),
    dict(user_name="CEO Office",     user_email="ceo@fmcgsoftware.com",        action="APPROVE",  action_label="approved final PPD for Everyuth Aloe Face Wash",      entity="NP-2026-005",      involved_roles="admin,ceo",                ip="10.0.10.1",   time_ago="30m", timestamp=NOW-timedelta(minutes=30)),
    dict(user_name="Rahul Mehta",    user_email="source@fmcgsoftware.com",     action="CREATE",   action_label="created project — Complan NutriGro Strawberry",       entity="NP-2026-006",      involved_roles="admin,source",             ip="10.0.24.15",  time_ago="6h",  timestamp=NOW-timedelta(hours=6)),
    dict(user_name="Amit Verma",     user_email="regulatory@fmcgsoftware.com", action="REWORK",   action_label="raised rework on Glucon-D PPD — elderberry issue",    entity="PPD-NP-2026-004",  involved_roles="admin,regulatory,rd_head", ip="10.0.42.22",  time_ago="6h",  timestamp=NOW-timedelta(hours=6)),
    dict(user_name="Anil Kumar",     user_email="production@fmcgsoftware.com", action="UPDATE",   action_label="updated plant trial PT-003-02 status → In Progress",  entity="PT-NP-2026-003-02",involved_roles="admin,production,rd_head", ip="10.0.55.10",  time_ago="2h",  timestamp=NOW-timedelta(hours=2)),
    dict(user_name="Dr. Anjali Rao", user_email="rd_head@fmcgsoftware.com",    action="APPROVE",  action_label="approved formula F-NP-2026-002-01 — Recommended",     entity="F-NP-2026-002-01", involved_roles="admin,rd_head,fd",         ip="10.0.35.11",  time_ago="2d",  timestamp=NOW-timedelta(days=2)),
    dict(user_name="Rajesh Nair",    user_email="packaging@fmcgsoftware.com",  action="UPDATE",   action_label="updated artwork ART-NP-2026-003-01 → Approved",       entity="ART-NP-2026-003-01",involved_roles="admin,packaging,marketing",ip="10.0.30.15",  time_ago="12d", timestamp=NOW-timedelta(days=12)),
    dict(user_name="Kavita SA",      user_email="sa@fmcgsoftware.com",         action="VERIFY",   action_label="verified claim CLM-NP-2026-001-02 — memory claim",    entity="CLM-NP-2026-001-02",involved_roles="admin,sa,rd_head",         ip="10.0.28.10",  time_ago="3d",  timestamp=NOW-timedelta(days=3)),
    dict(user_name="System",         user_email="system",                action="SAP_SYNC", action_label="synced 245 records from SAP ERP",                     entity="SAP Sync",         involved_roles="admin",                    ip="System",      time_ago="15m", timestamp=NOW-timedelta(minutes=15)),
]

# ─────────────────────────────────────────────────────────────
#  SAP MASTER CODES
# ─────────────────────────────────────────────────────────────
SAP_CODES = [
    dict(config_type="sap_pm", key="PM-4521", label="Whey Protein Isolate 90%",   meta={"category":"Raw Material","uom":"KG","vendor":"Glanbia"}),
    dict(config_type="sap_pm", key="PM-4522", label="Cocoa Powder Alkalized",      meta={"category":"Raw Material","uom":"KG","vendor":"Cargill"}),
    dict(config_type="sap_pm", key="PM-4523", label="Sucralose Powder",            meta={"category":"Sweetener","uom":"KG","vendor":"JK Sucralose"}),
    dict(config_type="sap_pm", key="PM-4524", label="Vitamin Premix NP-A",         meta={"category":"Raw Material","uom":"KG","vendor":"DSM"}),
    dict(config_type="sap_pm", key="PM-4525", label="Natural Chocolate Flavor",    meta={"category":"Flavoring","uom":"L","vendor":"Givaudan"}),
    dict(config_type="sap_pm", key="PM-4526", label="Maltodextrin DE-18",          meta={"category":"Carbohydrate","uom":"KG","vendor":"Roquette"}),
    dict(config_type="sap_pm", key="PM-4527", label="Erythritol (Food Grade)",     meta={"category":"Sweetener","uom":"KG","vendor":"Cargill"}),
    dict(config_type="sap_pm", key="PM-4528", label="Stevia RA97 Extract",         meta={"category":"Sweetener","uom":"KG","vendor":"PureCircle"}),
    dict(config_type="sap_pm", key="PM-4529", label="Talc Micronized (Cosmetic)",  meta={"category":"Raw Material","uom":"KG","vendor":"Imerys"}),
    dict(config_type="sap_pm", key="PM-4530", label="Menthol Crystals IP Grade",   meta={"category":"Active","uom":"KG","vendor":"Bhagat Industries"}),
    dict(config_type="sap_bom", key="BOM-001", label="Complan Pro Chocolate F-04 v2.0", meta={"project":"NP-2026-001","version":"v2.0"}),
    dict(config_type="sap_bom", key="BOM-002", label="Sugar Free Stevia+ F-01 v1.0",    meta={"project":"NP-2026-002","version":"v1.0"}),
    dict(config_type="sap_bom", key="BOM-003", label="Nycil Cool Menthol XT F-01 v1.0", meta={"project":"NP-2026-003","version":"v1.0"}),
    dict(config_type="sap_bom", key="BOM-004", label="Glucon-D Immunity+ F-03 v1.0",    meta={"project":"NP-2026-004","version":"v1.0"}),
    dict(config_type="sap_sfg", key="SFG-101", label="Complan Choc Base Premix",    meta={"uom":"KG","storage":"Cold Chain"}),
    dict(config_type="sap_sfg", key="SFG-102", label="SF Stevia Blend",             meta={"uom":"KG","storage":"Dry"}),
    dict(config_type="sap_sfg", key="SFG-103", label="GluconD Immunity Base",       meta={"uom":"KG","storage":"Dry"}),
    dict(config_type="sap_sfg", key="SFG-104", label="Nycil XT Talc Base",          meta={"uom":"KG","storage":"Dry"}),
    dict(config_type="sap_pkg", key="PKG-201", label="Complan 400g Tin (Printed)",  meta={"type":"Primary","material":"Tin","vendor":"Hindustan Tin Works"}),
    dict(config_type="sap_pkg", key="PKG-202", label="SF Stevia+ 100 Sachet Box",   meta={"type":"Secondary","material":"Carton","vendor":"Parksons"}),
    dict(config_type="sap_pkg", key="PKG-203", label="Nycil XT 150g Shaker HDPE",   meta={"type":"Primary","material":"HDPE","vendor":"Cosmo Films"}),
    dict(config_type="sap_pkg", key="PKG-204", label="GluconD 200g Laminate Pouch", meta={"type":"Primary","material":"Laminate","vendor":"Uflex"}),
    dict(config_type="sap_pkg", key="PKG-205", label="Complan 200g Pouch (Flex)",   meta={"type":"Primary","material":"Laminate","vendor":"Uflex"}),
]

# ─────────────────────────────────────────────────────────────
#  USERS
# ─────────────────────────────────────────────────────────────
USERS = [
    dict(name="Admin User",     email="admin@fmcgsoftware.com",      role="admin",      department="IT",                   status="Active"),
    dict(name="Rahul Mehta",    email="source@fmcgsoftware.com",     role="source",     department="Marketing / Sourcing", status="Active"),
    dict(name="Priti Nair",     email="pm@fmcgsoftware.com",         role="pm",         department="PMO",                  status="Active"),
    dict(name="Priya Sharma",   email="fd@fmcgsoftware.com",         role="fd",         department="R&D",                  status="Active"),
    dict(name="Dr. Anjali Rao", email="rd_head@fmcgsoftware.com",    role="rd_head",    department="R&D",                  status="Active"),
    dict(name="Neeraj Kapoor",  email="marketing@fmcgsoftware.com",  role="marketing",  department="Marketing",            status="Active"),
    dict(name="Amit Verma",     email="regulatory@fmcgsoftware.com", role="regulatory", department="Regulatory Affairs",   status="Active"),
    dict(name="Rajesh Nair",    email="packaging@fmcgsoftware.com",  role="packaging",  department="Packaging",            status="Active"),
    dict(name="Anil Kumar",     email="production@fmcgsoftware.com", role="production", department="Production",           status="Active"),
    dict(name="CEO Office",     email="ceo@fmcgsoftware.com",        role="ceo",        department="Leadership",           status="Active"),
    dict(name="Management MC",  email="mgmt@fmcgsoftware.com",       role="mgmt",       department="Leadership",           status="Active"),
    dict(name="Dr. Suresh ADL", email="adl@fmcgsoftware.com",        role="adl",        department="ADL Lab",              status="Active"),
    dict(name="Meena PMSA",     email="pmsa@fmcgsoftware.com",       role="pmsa",       department="PM & SA",              status="Active"),
    dict(name="Kavita SA",      email="sa@fmcgsoftware.com",         role="sa",         department="Scientific Affairs",   status="Active"),
    dict(name="Demo User",      email="demo.user@fmcgsoftware.com",  role="admin",      department="IT",                   status="Active"),
]


# ─────────────────────────────────────────────────────────────
#  SEED FUNCTION
# ─────────────────────────────────────────────────────────────
async def seed():
    from database import AsyncSessionLocal
    print("Seeding database with demo data...")
    async with AsyncSessionLocal() as db:
        # Delete existing data safely in reverse dependency order
        from sqlalchemy import text
        for tbl in ["audit_logs", "notifications", "tasks", "ppd_comments", "ppd_submissions", "formula_comments", "formulas", "lab_experiments", "plant_trials", "regulatory_checks", "sensory_evaluations", "costing_records", "claim_records", "artwork_briefs", "master_config", "users"]:
            try:
                await db.execute(text(f"DELETE FROM `{tbl}`"))
            except Exception:
                pass
        await db.commit()

    STATIC_HASH = "$2b$12$e0MYzXyjpJS7Pd0RVvHw4.O4rVn66iF0G./5L7L01V.6k54vO3i6."
    async with AsyncSessionLocal() as db:
        try:
            for t in TASKS:          db.add(Task(**t))
            await db.flush()
        except Exception as e: print("Seed task error:", e)

        try:
            for p in PPD_DATA:       db.add(PPDSubmission(**p))
            await db.flush()
            for c in PPD_COMMENTS:   db.add(PPDComment(**c))
            await db.flush()
        except Exception as e: print("Seed PPD error:", e)

        try:
            for f in FORMULAS:       db.add(Formula(**f))
            await db.flush()
            for c in FORMULA_COMMENTS: db.add(FormulaComment(**c))
            await db.flush()
        except Exception as e: print("Seed formula error:", e)

        try:
            for e in LAB_EXPS:       db.add(LabExperiment(**e))
            await db.flush()
        except Exception as e: print("Seed lab error:", e)

        try:
            for t in PLANT_TRIALS:   db.add(PlantTrial(**t))
            await db.flush()
        except Exception as e: print("Seed plant trial error:", e)

        try:
            for r in REG_CHECKS:     db.add(RegulatoryCheck(**r))
            await db.flush()
        except Exception as e: print("Seed regulatory error:", e)

        try:
            for s in SENSORY_EVALS:  db.add(SensoryEvaluation(**s))
            await db.flush()
        except Exception as e: print("Seed sensory error:", e)

        try:
            for c in COSTING:        db.add(CostingRecord(**c))
            await db.flush()
        except Exception as e: print("Seed costing error:", e)

        try:
            for c in CLAIMS:         db.add(ClaimRecord(**c))
            await db.flush()
        except Exception as e: print("Seed claims error:", e)

        try:
            for a in ARTWORKS:       db.add(ArtworkBrief(**a))
            await db.flush()
        except Exception as e: print("Seed artwork error:", e)

        try:
            for a in AUDIT_LOGS:     db.add(AuditLog(**a))
            await db.flush()
        except Exception as e: print("Seed audit error:", e)

        try:
            for u in USERS:
                db.add(User(**u, password_hash=STATIC_HASH, created_at=NOW))
            await db.flush()
        except Exception as e: print("Seed users error:", e)

        try:
            for s in SAP_CODES:
                db.add(MasterConfig(**s, is_active=True, sort_order=0))
            await db.flush()
        except Exception as e: print("Seed SAP error:", e)

        await db.commit()

    print("\nSeed complete -- all demo data loaded into MySQL.")


if __name__ == "__main__":
    asyncio.run(seed())
