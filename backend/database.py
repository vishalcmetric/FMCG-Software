"""
SQLAlchemy async engine + session factory for MySQL.
Auto-creates the database if it does not exist.
"""
import aiomysql
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import get_settings
from datetime import datetime
try:
    import zoneinfo
    IST = zoneinfo.ZoneInfo("Asia/Kolkata")
except ImportError:
    from datetime import timezone, timedelta
    IST = timezone(timedelta(hours=5, minutes=30))  # IST = UTC+5:30 fallback

def now_ist() -> datetime:
    """Return the current time as a timezone-aware IST datetime."""
    return datetime.now(IST)

def now_ist_naive() -> datetime:
    """Return the current time in IST as a *naive* datetime (for MySQL storage)."""
    return datetime.now(IST).replace(tzinfo=None)

def fmt_ist(dt) -> str | None:
    """
    Serialise a datetime for API responses.
    MySQL stores naive datetimes; after setting the connection timezone to +05:30
    those values are in IST.  We append '+05:30' so the browser parses them
    correctly instead of treating them as local (UTC) time.
    Returns None when dt is None.
    """
    if dt is None:
        return None
    return dt.strftime("%Y-%m-%dT%H:%M:%S+05:30")

settings = get_settings()


async def _ensure_database() -> None:
    """Connect without specifying a DB and run CREATE DATABASE IF NOT EXISTS."""
    try:
        conn = await aiomysql.connect(
            host=settings.mysql_host,
            port=settings.mysql_port,
            user=settings.mysql_user,
            password=settings.mysql_password,
        )
        async with conn.cursor() as cur:
            await cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{settings.mysql_db}` "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        conn.close()
    except Exception as e:
        print(f"Warning: _ensure_database skipped or failed ({e})")


engine = create_async_engine(
    settings.async_db_url,
    pool_size=10,
    max_overflow=20,
    pool_recycle=300,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables():
    """Ensure DB exists, then create all tables if they don't exist."""
    await _ensure_database()
    from orm_models import Base as OrmBase  # import here to avoid circular
    async with engine.begin() as conn:
        await conn.run_sync(OrmBase.metadata.create_all)
    # Run incremental column migrations for columns added after initial deploy
    await _migrate_columns()


ALL_ROLES = "admin,source,pm,fd,fd_member,rd_team,regulatory_team,rd_head,marketing_head,sales_head,gdso_head,regulatory,cfo,marketing,packaging,adl,pmsa,sa,ceo,production"


async def _migrate_columns() -> None:
    """Add any new columns to already-deployed tables."""
    column_migrations = [
        # (table, column, column_definition)
        ("ppd_submissions",  "mgmt_approvals",   "JSON NULL"),
        ("ppd_submissions",  "ppd_title",         "VARCHAR(255) NULL"),
        ("ppd_submissions",  "draft_form",        "JSON NULL"),
        ("ppd_submissions",  "project_type",      "VARCHAR(150) NULL"),
        ("ppd_submissions",  "ppd_date",          "DATE NULL"),
        ("ppd_submissions",  "project_leader", "VARCHAR(150) NULL"),
        ("ppd_submissions",  "marketing", "VARCHAR(150) NULL"),
        ("ppd_submissions",  "rd_product", "VARCHAR(150) NULL"),
        ("ppd_submissions",  "rd_packaging", "VARCHAR(150) NULL"),
        ("ppd_submissions",  "legal_regulatory", "VARCHAR(150) NULL"),
        ("ppd_submissions",  "overall_goal", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "consumer_target_group", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "consumer_evidence", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "flavour", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "attributes", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "business_logic", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "product_description", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "performance_claims", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "benchmark", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "primary_pack_description", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "patent_legal_requirements", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "legal_regulatory_considerations", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "target_objective", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "minimum_objective", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "assumptions", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "constraints", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "risks", "MEDIUMTEXT NULL"),
        ("ppd_submissions",  "draft_attachments", "JSON NULL"),
        ("ppd_submissions",  "draft_rich_html",   "JSON NULL"),
        ("ppd_submissions",  "rd_assignees",      "JSON NULL"),
        ("ppd_submissions",  "fd_assignees",      "JSON NULL"),
        ("ppd_comments",     "user_email",        "VARCHAR(255) NULL"),
        ("ppd_comments",     "attachments",       "JSON NULL"),
        ("tasks",            "assigned_to_email", "VARCHAR(255) NULL"),
        ("formulas",         "rich_html",         "JSON NULL"),
        ("formulas",         "attachments",       "JSON NULL"),
        ("lab_experiments",  "formula_id",        "VARCHAR(30) NULL"),
        ("lab_experiments",  "version",           "VARCHAR(10) NULL"),
        ("lab_experiments",  "ppd_id",            "VARCHAR(50) NULL"),
        ("formulas",         "ppd_id",            "VARCHAR(50) NULL"),
        ("plant_trials",     "ppd_id",            "VARCHAR(50) NULL"),
        ("regulatory_checks","ppd_id",            "VARCHAR(50) NULL"),
        ("sensory_evaluations","ppd_id",          "VARCHAR(50) NULL"),
        ("costing_records",  "ppd_id",            "VARCHAR(50) NULL"),
        ("claim_records",    "ppd_id",            "VARCHAR(50) NULL"),
        ("artwork_briefs",   "ppd_id",            "VARCHAR(50) NULL"),
        ("artwork_briefs",   "assigned_to",        "VARCHAR(150) NULL"),
        ("artwork_briefs",   "comment",            "TEXT NULL"),
        ("artwork_briefs",   "version",            "VARCHAR(10) NULL DEFAULT 'v1.0'"),
        ("artwork_briefs",   "created_by",         "VARCHAR(150) NULL"),
        ("artwork_briefs",   "created_by_role",    "VARCHAR(50) NULL"),
        ("artwork_briefs",   "brief_notes",        "TEXT NULL"),
        ("artwork_briefs",   "design_link",        "VARCHAR(500) NULL"),
        ("tasks",            "ppd_id",            "VARCHAR(50) NULL"),
        ("ppd_comments",     "attachment_url",    "VARCHAR(500) NULL"),
        ("ppd_comments",     "attachment_name",   "VARCHAR(255) NULL"),
        # New columns for rework workflow
        ("ppd_comments",     "rework_resolved",   "TINYINT(1) NOT NULL DEFAULT 0"),
        ("ppd_comments",     "visible_to_roles",  "VARCHAR(500) NULL"),
        # Post-approval full visibility list
        ("ppd_submissions",  "full_teams_involved", "VARCHAR(500) NULL"),
        # Multi-stage approval columns
        ("ppd_submissions",  "final_approvals",         "JSON NULL"),
        ("ppd_submissions",  "rework_from_stage",        "VARCHAR(30) NULL"),
        # New formula fields
        ("formulas",         "trial_no",                "VARCHAR(50) NULL"),
        ("formulas",         "batch_no",                "VARCHAR(50) NULL"),
        ("formulas",         "batch_size",              "VARCHAR(50) NULL"),
        ("formulas",         "unit_qty",                "VARCHAR(50) NULL"),
        ("formulas",         "mfg_date",                "VARCHAR(30) NULL"),
        ("formulas",         "trial_taken_by",          "VARCHAR(255) NULL"),
        ("formulas",         "evaluated_by",            "VARCHAR(255) NULL"),
        ("formulas",         "method_of_preparation",   "TEXT NULL"),
        ("formulas",         "observation",             "TEXT NULL"),
        ("formulas",         "conclusion",              "TEXT NULL"),
        # Formula approval workflow columns
        ("formulas",         "approval_status",         "VARCHAR(20) NULL"),
        ("formulas",         "approval_comment",        "TEXT NULL"),
        ("formulas",         "approved_by",             "VARCHAR(150) NULL"),
        ("formulas",         "approved_at",             "DATETIME NULL"),
    ]

    try:
        conn = await aiomysql.connect(
            host=settings.mysql_host,
            port=settings.mysql_port,
            user=settings.mysql_user,
            password=settings.mysql_password,
            db=settings.mysql_db,
        )
    except Exception as e:
        print(f"Warning: _migrate_columns could not connect to DB ({e})")
        return

    async with conn.cursor() as cur:
        for table, column, col_def in column_migrations:
            try:
                await cur.execute(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                    (settings.mysql_db, table, column),
                )
                (exists,) = await cur.fetchone()
                if not exists:
                    await cur.execute(
                        f"ALTER TABLE `{table}` ADD COLUMN `{column}` {col_def}"
                    )
                    await conn.commit()
                    print(f"Migration: added column {table}.{column}")
            except Exception as e:
                print(f"Warning: column migration {table}.{column} failed ({e})")

        # Make project_id nullable on ppd_submissions, formulas, and artwork_briefs — these columns
        # exist in the DB from before the project module was removed, but ORM no longer sets them.
        for _tbl in ("ppd_submissions", "formulas", "artwork_briefs", "lab_experiments", "plant_trials", "regulatory_checks", "sensory_evaluations", "costing_records", "claim_records"):
            try:
                await cur.execute(
                    "SELECT IS_NULLABLE FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = 'project_id'",
                    (settings.mysql_db, _tbl),
                )
                row = await cur.fetchone()
                if row and row[0] == 'NO':
                    await cur.execute(
                        f"ALTER TABLE `{_tbl}` MODIFY COLUMN `project_id` VARCHAR(20) NULL DEFAULT NULL"
                    )
                    await conn.commit()
                    print(f"Migration: made {_tbl}.project_id nullable")
            except Exception as e:
                print(f"Warning: {_tbl} project_id nullable migration failed ({e})")

        # Backfill Draft PPD columns from the JSON draft_form written by the first Draft PPD release
        _draft_cols = [("project_type", "project_type"), ("ppd_date", "date")] + [
            (k, k) for k in ("project_leader", "marketing", "rd_product", "rd_packaging", "legal_regulatory", "overall_goal", "consumer_target_group", "consumer_evidence", "flavour", "attributes", "business_logic", "product_description", "performance_claims", "benchmark", "primary_pack_description", "patent_legal_requirements", "legal_regulatory_considerations", "target_objective", "minimum_objective", "assumptions", "constraints", "risks")
        ]
        try:
            for col, key in _draft_cols:
                await cur.execute(
                    f"UPDATE `ppd_submissions` SET `{col}` = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`draft_form`, '$.{key}')), '') "
                    f"WHERE `{col}` IS NULL AND `draft_form` IS NOT NULL "
                    f"AND NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`draft_form`, '$.{key}')), '') IS NOT NULL"
                )
            await cur.execute(
                "UPDATE `ppd_submissions` SET `draft_attachments` = "
                "COALESCE(JSON_EXTRACT(`draft_form`, '$.attachments'), JSON_OBJECT()) "
                "WHERE `draft_attachments` IS NULL AND `draft_form` IS NOT NULL AND JSON_LENGTH(`draft_form`) > 0"
            )
            await conn.commit()
        except Exception as e:
            print(f"Warning: Draft PPD column backfill failed ({e})")

        # Rich-text columns: convert stored HTML to plain text, keeping the HTML in draft_rich_html
        try:
            import json
            from ppd_fields import RICH_KEYS, html_to_text
            cols = ", ".join(f"`{k}`" for k in RICH_KEYS)
            await cur.execute(f"SELECT `id`, `draft_rich_html`, {cols} FROM `ppd_submissions`")
            for row in await cur.fetchall():
                rich = json.loads(row[1]) if row[1] else {}
                sets = {}
                for k, v in zip(RICH_KEYS, row[2:]):
                    if v and "<" in v:
                        rich.setdefault(k, v)
                        sets[k] = html_to_text(v) or None
                if sets:
                    assign = ", ".join(f"`{k}` = %s" for k in sets)
                    await cur.execute(
                        f"UPDATE `ppd_submissions` SET {assign}, `draft_rich_html` = %s WHERE `id` = %s",
                        (*sets.values(), json.dumps(rich), row[0]),
                    )
            await conn.commit()
        except Exception as e:
            print(f"Warning: Draft PPD plain-text migration failed ({e})")

        # Role split: combined "R&D / F&D Team" label is now "F&D Team Head" (role key fd unchanged)
        try:
            await cur.execute(
                "UPDATE `ppd_submissions` SET `reviewers` = CAST(REPLACE(CAST(`reviewers` AS CHAR), "
                "'R&D / F&D Team', 'F&D Team Head') AS JSON) WHERE CAST(`reviewers` AS CHAR) LIKE '%R&D / F&D Team%'"
            )
            await cur.execute(
                "UPDATE `ppd_submissions` SET `reviewers` = CAST(REPLACE(CAST(`reviewers` AS CHAR), "
                "'\"Project Management\"', '\"Project Management Team\"') AS JSON) "
                "WHERE CAST(`reviewers` AS CHAR) LIKE '%\"Project Management\"%'"
            )
            await conn.commit()
        except Exception as e:
            print(f"Warning: reviewer label rename failed ({e})")

        # New Stage-1 flow (PM + R&D Head + F&D Team Head): bring PPDs still in Stage 1 into it
        # so R&D Head can see, assign R&D Team members and approve them (same as F&D Team Head).
        try:
            import json as _json
            await cur.execute("SELECT `ppd_id`, `project_name`, `teams_involved`, `reviewers` FROM `ppd_submissions` "
                              "WHERE `status` = 'Pending' OR (`status` = 'Rework' AND `rework_from_stage` = 'initial')")
            for ppd_id, pname, teams, revs in await cur.fetchall():
                revs = _json.loads(revs) if revs else []
                team_set = set(filter(None, (teams or "").split(",")))
                if any(r.get("role") == "rd_head" for r in revs) and "rd_head" in team_set:
                    continue
                if not any(r.get("role") == "rd_head" for r in revs):
                    revs.insert(0, {"role": "rd_head", "team_label": "R&D Head", "status": "Pending", "comment": "", "updated_at": ""})
                team_set.add("rd_head")
                await cur.execute("UPDATE `ppd_submissions` SET `reviewers` = %s, `teams_involved` = %s WHERE `ppd_id` = %s",
                                  (_json.dumps(revs), ",".join(sorted(team_set)), ppd_id))
                await cur.execute("SELECT COUNT(*) FROM `tasks` WHERE `ppd_id`=%s AND `assigned_role`='rd_head' AND `type`='ppd_review'", (ppd_id,))
                if not (await cur.fetchone())[0]:
                    await cur.execute("INSERT INTO `tasks` (`title`,`project_name`,`ppd_id`,`assigned_role`,`type`,`status`,`priority`,`due_label`) "
                                      "VALUES (%s,%s,%s,'rd_head','ppd_review','pending','High','Today')",
                                      (f"Review PPD {ppd_id} — {pname}", pname, ppd_id))
            await conn.commit()
        except Exception as e:
            print(f"Warning: Stage-1 R&D Head migration failed ({e})")

        # Formula ingredients: copy legacy JSON rows into formula_ingredients (one-time)
        try:
            import json as _json
            from formula_ingredients import clean_row
            await cur.execute("SELECT f.`formula_id`, f.`ingredients` FROM `formulas` f "
                              "WHERE f.`ingredients` IS NOT NULL AND JSON_LENGTH(f.`ingredients`) > 0 "
                              "AND NOT EXISTS (SELECT 1 FROM `formula_ingredients` i WHERE i.`formula_id` = f.`formula_id`)")
            for fid, raw in await cur.fetchall():
                rows = [r for r in (clean_row(x) for x in (_json.loads(raw) or [])) if r]
                for n, r in enumerate(rows, 1):
                    await cur.execute(
                        "INSERT INTO `formula_ingredients` (`formula_id`,`sr_no`,`name`,`ins_cas_inci`,`vendor`,`use_function`,"
                        "`cost_per_kg`,`qty_pct`,`qty_per_unit`,`cost_per_unit`) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                        (fid, n, r["name"], r["ins_cas_inci"], r["vendor"], r["use_function"],
                         r["cost_per_kg"], r["qty_pct"], r["qty_per_unit"], r["cost_per_unit"]))
            await conn.commit()
        except Exception as e:
            print(f"Warning: formula ingredient backfill failed ({e})")

        # Master Data access: R&D Head + F&D Team Head manage INCI master data
        try:
            import json as _json
            await cur.execute("SELECT `id`, `permissions` FROM `role_permissions` WHERE `module` = 'Master Data' AND `role` IN ('rd_head','fd')")
            for pid_, perms in await cur.fetchall():
                perms = _json.loads(perms) if perms else {}
                if not (perms.get("view") and perms.get("create") and perms.get("edit")):
                    perms.update({"view": True, "create": True, "edit": True})
                    await cur.execute("UPDATE `role_permissions` SET `permissions` = %s WHERE `id` = %s", (_json.dumps(perms), pid_))
            await conn.commit()
        except Exception as e:
            print(f"Warning: Master Data permission update failed ({e})")

        # Personal review tasks for team members assigned before tasks existed
        try:
            import json as _json
            await cur.execute("SELECT `ppd_id`, `project_name`, `rd_assignees`, `fd_assignees` FROM `ppd_submissions` "
                              "WHERE (`rd_assignees` IS NOT NULL OR `fd_assignees` IS NOT NULL) "
                              "AND `status` NOT IN ('Approved','Completed')")
            for ppd_id, pname, rd, fd in await cur.fetchall():
                for raw, mrole, label in ((rd, "rd_team", "R&D Team"), (fd, "fd_member", "F&D Team")):
                    for m in (_json.loads(raw) if raw else []):
                        email = (m.get("email") or "").lower()
                        await cur.execute("SELECT COUNT(*) FROM `tasks` WHERE `ppd_id`=%s AND `type`='ppd_team_review' "
                                          "AND `assigned_to_email`=%s", (ppd_id, email))
                        if email and not (await cur.fetchone())[0]:
                            await cur.execute(
                                "INSERT INTO `tasks` (`title`,`project_name`,`ppd_id`,`assigned_role`,`assigned_to_email`,"
                                "`type`,`status`,`priority`,`due_label`) VALUES (%s,%s,%s,%s,%s,'ppd_team_review','pending','High','Today')",
                                (f"Review PPD {ppd_id} — {pname} ({label})", pname, ppd_id, mrole, email))
            await conn.commit()
        except Exception as e:
            print(f"Warning: team review task backfill failed ({e})")

        # Backfill PPD submissions with empty reviewers if NULL
        _default_reviewers = (
            '[{"role":"fd","team_label":"F&D Team Head","head_name":"",'
            '"status":"Pending","comment":"","updated_at":""},'
            '{"role":"pm","team_label":"Project Management Team","head_name":"",'
            '"status":"Pending","comment":"","updated_at":""}]'
        )
        try:
            await cur.execute(
                "UPDATE `ppd_submissions` SET `reviewers` = %s "
                "WHERE `reviewers` IS NULL OR JSON_LENGTH(`reviewers`) = 0",
                (_default_reviewers,),
            )
            await conn.commit()
        except Exception as e:
            print(f"Warning: ppd_submissions reviewers backfill failed ({e})")

        # Backfill full_teams_involved for existing rows that don't have it set yet
        _all_roles = "admin,source,pm,fd,fd_member,rd_team,regulatory_team,rd_head,marketing_head,sales_head,gdso_head,regulatory,cfo,marketing,packaging,adl,pmsa,sa,ceo,production"
        try:
            await cur.execute(
                "UPDATE `ppd_submissions` SET `full_teams_involved` = %s "
                "WHERE `full_teams_involved` IS NULL OR `full_teams_involved` = ''",
                (_all_roles,),
            )
            await conn.commit()
        except Exception as e:
            print(f"Warning: ppd_submissions full_teams_involved backfill failed ({e})")

        # For already-Approved PPDs: ensure teams_involved is the full list
        try:
            await cur.execute(
                "UPDATE `ppd_submissions` SET `teams_involved` = `full_teams_involved` "
                "WHERE `status` = 'Approved' AND (`full_teams_involved` IS NOT NULL AND `full_teams_involved` != '')"
            )
            await conn.commit()
        except Exception as e:
            print(f"Warning: ppd_submissions approved teams_involved backfill failed ({e})")

    conn.close()
