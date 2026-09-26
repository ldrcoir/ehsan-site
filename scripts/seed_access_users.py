#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ساخت کاربر ادمین پیش‌فرض برای سیستم AccessUser.

این اسکریپت:
- اگه کاربر admin وجود نداشته باشه، می‌سازتش
- اگه وجود داشته باشه، هیچی نمی‌کنه (از overwrite جلوگیری می‌کنه)

نکته: حتماً بعد از اولین ورود رمز رو از پنل عوض کن!

V17.2: از bcryptjs موجود در node_modules استاندارد استفاده می‌کنه
       (نه مسیر هاردکد شده‌ی dev machine)
"""

import sqlite3
import os
import sys
import subprocess
import json
from pathlib import Path

# مسیر دیتابیس — relative به ریشه‌ی پروژه
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = str(PROJECT_ROOT / "db" / "custom.db")

def find_bcryptjs():
    """پیدا کردن bcryptjs در node_modules (relative به cwd یا PROJECT_ROOT)"""
    candidates = [
        PROJECT_ROOT / "node_modules" / "bcryptjs",
        Path.cwd() / "node_modules" / "bcryptjs",
    ]
    for p in candidates:
        if p.exists():
            return str(p)
    return None

def hash_password_bcrypt(password: str) -> str:
    """هش کردن رمز با bcryptjs از طریق node"""
    bcrypt_path = find_bcryptjs()
    if not bcrypt_path:
        # Fallback: استفاده از node crypto scrypt (بدون نیاز به bcryptjs)
        # این فرمت با bcrypt.compare سازگاره (prefix $2a$)
        # ولی scrypt فرمت متفاوتی داره — پس fallback به PBKDF2
        # اما برای سازگاری با bcrypt.compare، حتماً bcrypt لازمه
        print("ERROR: bcryptjs not found. Install with: npm install bcryptjs")
        sys.exit(1)

    # استفاده از node با مسیر relative
    result = subprocess.run(
        ["node", "-e", f"""
        const bcrypt = require({json.dumps(bcrypt_path)});
        console.log(JSON.stringify(bcrypt.hashSync({json.dumps(password)}, 10)));
        """],
        capture_output=True, text=True, check=True, cwd=str(PROJECT_ROOT)
    )
    return json.loads(result.stdout.strip())

def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        print("Run: node -e \"require('child_process').execSync('npx prisma db push', {stdio:'inherit'})\"")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # بررسی وجود جدول AccessUser
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='AccessUser'")
    if not cur.fetchone():
        print("ERROR: AccessUser table does not exist.")
        print("Running prisma db push to create tables...")
        conn.close()
        # اجرای prisma db push با node
        try:
            subprocess.run(
                ["node", "node_modules/prisma/build/index.js", "db", "push", "--accept-data-loss"],
                check=True, cwd=str(PROJECT_ROOT)
            )
        except Exception as e:
            print(f"ERROR: Could not create tables: {e}")
            sys.exit(1)
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='AccessUser'")
        if not cur.fetchone():
            print("ERROR: AccessUser table still does not exist after db push")
            sys.exit(1)

    # بررسی وجود admin
    cur.execute("SELECT id, username FROM AccessUser WHERE username = ?", ("admin",))
    existing = cur.fetchone()
    if existing:
        print(f"Admin user already exists (id={existing[0]}). Skipping.")
        conn.close()
        return

    # ساخت admin پیش‌فرض
    print("Hashing password...")
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
