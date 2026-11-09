import sqlite3
from pathlib import Path
db_path = Path("neurovision.db")
print("neurovision.db exists?", db_path.exists())
if db_path.exists():
    conn = sqlite3.connect(str(db_path))
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in c.fetchall()]
    print("Tables in neurovision.db:", tables)
    for t in tables:
        c.execute(f"SELECT count(*) FROM {t}")
        print(f"  {t}: {c.fetchone()[0]} rows")
        
    if "analyses" in tables:
        c.execute("SELECT id, scan_id, tumor_type, confidence FROM analyses LIMIT 3")
        print("  Sample analyses:", c.fetchall())
    if "cases" in tables:
        c.execute("SELECT id, patient_id, scan_id FROM cases LIMIT 3")
        print("  Sample cases:", c.fetchall())
    if "scans" in tables:
        c.execute("SELECT id, patient_id, filename FROM scans LIMIT 3")
        print("  Sample scans:", c.fetchall())
