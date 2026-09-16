"""
Seed lab equipment — فقط ساختار جدول (بدون داده‌ی پیش‌فرض).

تجهیزات از پنل ادمین اضافه می‌شن.
"""
import sqlite3
from pathlib import Path

DB = Path(__file__).parent.parent / "db" / "custom.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
table_names = [t[0] for t in tables]
print(f"Tables in database: {len(table_names)}")
print("Database is ready. Add equipment from admin panel.")

conn.close()
