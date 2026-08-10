"""List all contact messages stored in the database."""
import sqlite3
from pathlib import Path

DB = Path("/home/z/my-project/db/custom.db")
if not DB.exists():
    print("DB not found")
    raise SystemExit(1)

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
rows = conn.execute(
    "SELECT id, name, email, substr(message,1,80) as msg_preview, ip, createdAt FROM ContactMessage ORDER BY createdAt DESC LIMIT 10"
).fetchall()
print(f"Total messages: {len(rows)}")
for r in rows:
    print(f"\n  [{r['createdAt']}] {r['name']} <{r['email']}> (ip={r['ip']})")
    print(f"    {r['msg_preview']}")
conn.close()
