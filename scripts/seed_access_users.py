#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ساخت کاربر ادمین پیش‌فرض برای سیستم AccessUser.

این اسکریپت:
- اگه کاربر admin وجود نداشته باشه، می‌سازتش
- اگه وجود داشته باشه، هیچی نمی‌کنه (از overwrite جلوگیری می‌کنه)

نکته: حتماً بعد از اولین ورود رمز رو از پنل عوض کن!
"""

import sqlite3
import os
import sys

DB_PATH = str(Path(__file__).parent.parent / "db" / "custom.db")

def hash_password_bcrypt(password: str) -> str:
    """هش کردن رمز با bcrypt — استفاده از CLI چون Python bcrypt نصب نیست"""
    import subprocess
    import json
    # استفاده از node برای هش کردن
    result = subprocess.run(
        ["node", "-e", f"""
        const bcrypt = require('/home/z/my-project/node_modules/bcryptjs');
        console.log(JSON.stringify(bcrypt.hashSync({json.dumps(password)}, 10)));
        """],
        capture_output=True, text=True, check=True
    )
    return json.loads(result.stdout.strip())

def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # بررسی وجود جدول AccessUser
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='AccessUser'")
    if not cur.fetchone():
        print("ERROR: AccessUser table does not exist. Run: bunx prisma db push")
        sys.exit(1)

    # بررسی وجود admin
    cur.execute("SELECT id, username FROM AccessUser WHERE username = ?", ("admin",))
    existing = cur.fetchone()
    if existing:
        print(f"Admin user already exists (id={existing[0]}). Skipping.")
        return

    # ساخت admin پیش‌فرض
    password_hash = hash_password_bcrypt("admin123")
    import datetime
    now = datetime.datetime.utcnow().isoformat() + "Z"

    cur.execute("""
        INSERT INTO AccessUser (id, username, passwordHash, displayName, role, active, loginCount, deactivatedReason, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "admin-seed-" + os.urandom(4).hex(),
        "admin",
        password_hash,
        "Administrator",
        "admin",
        1,  # active = true
        0,
        "",
        now,
        now,
    ))
    conn.commit()
    print("✅ Admin user created:")
    print("   username: admin")
    print("   password: admin123")
    print("   ⚠️  CHANGE PASSWORD IMMEDIATELY FROM ADMIN PANEL!")
    conn.close()

if __name__ == "__main__":
    main()
