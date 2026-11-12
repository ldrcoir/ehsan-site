"""
Seed content models — فقط ساختار جداول (بدون داده‌ی پیش‌فرض).

این اسکریپت هیچ داده‌ای اضافه نمی‌کنه. فقط بررسی می‌کنه که جداول ساخته شدن.
محتوا از پنل ادمین اضافه می‌شه.
"""
import sqlite3
from pathlib import Path

DB = Path(__file__).parent.parent / "db" / "custom.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

# بررسی وجود جداول
tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
table_names = [t[0] for t in tables]
print(f"Tables in database: {len(table_names)}")
print("Database is ready. Add content from admin panel.")

conn.close()
