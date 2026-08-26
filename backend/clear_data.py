"""
clear_data.py — Deletes ALL seed/demo/test data from the database.
Keeps the table structure intact.

Run: python clear_data.py
"""
import asyncio
import aiomysql
from config import get_settings

settings = get_settings()

TABLES = [
    "audit_logs",
    "notifications",
    "tasks",
    "ppd_comments",
    "ppd_submissions",
    "formula_comments",
    "formulas",
    "lab_experiments",
    "plant_trials",
    "regulatory_checks",
    "sensory_evaluations",
    "costing_records",
    "claim_records",
    "artwork_briefs",
    "master_config",
    "users",
]


async def clear():
    try:
        conn = await aiomysql.connect(
            host=settings.mysql_host,
            port=settings.mysql_port,
            user=settings.mysql_user,
            password=settings.mysql_password,
            db=settings.mysql_db,
        )
    except Exception as e:
        print(f"Could not connect to DB: {e}")
        return

    print(f"Connected to {settings.mysql_db}. Deleting all data...")
    async with conn.cursor() as cur:
        for tbl in TABLES:
            try:
                await cur.execute(f"DELETE FROM `{tbl}`")
                await conn.commit()
                print(f"  Cleared: {tbl}")
            except Exception as e:
                print(f"  Warning: could not clear {tbl}: {e}")

    conn.close()
    print("\nAll data cleared. Tables are empty.")
    print("Start the backend — it will now have a fresh database with no seed data.")


if __name__ == "__main__":
    asyncio.run(clear())
