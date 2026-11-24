#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ساخت کاربر ادمین پیش‌فرض برای سیستم AccessUser.

این اسکریپت:
- اگه کاربر admin وجود نداشته باشه، می‌سازتش با یه رمز تصادفی
- اگه وجود داشته باشه، هیچی نمی‌کنه (از overwrite جلوگیری می‌کنه)

نکته: رمز تصادفی فقط موقع ساخت چاپ می‌شه — حتماً یادداشتش کن
و بعد از اولین ورود از پنل عوضش کن!

v1.1: رمز تصادفی ۱۶ کاراکتری با secrets (رمز ثابت حذف شد)
      از bcryptjs موجود در node_modules استاندارد استفاده می‌کنه
"""

import sqlite3
import os
import time
import sys
import secrets
import string
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

    # v1.1 (security): رمز از env var رد می‌شه نه argv — قبلاً با f-string داخل
    # کد JS قرار می‌گرفت و در ps/proc cmdline برای همه‌ی کاربران سیستم دیده می‌شد
    result = subprocess.run(
        ["node", "-e", """
        const bcrypt = require(process.env.BCYPATH);
        console.log(JSON.stringify(bcrypt.hashSync(process.env.SEEDPW, 12)));
        """],
        capture_output=True, text=True, check=True, cwd=str(PROJECT_ROOT),
        env={**os.environ, "BCYPATH": bcrypt_path, "SEEDPW": password},
    )
    return json.loads(result.stdout.strip())

def main():
    quiet = "--quiet" in sys.argv  # v1.1: خروجی فقط رمز — برای redirect به فایل (docker)
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
        if not quiet:
            print(f"Admin user already exists (id={existing[0]}). Skipping.")
        conn.close()
        return

    # ساخت admin با رمز تصادفی — v1.1 (بدون رمز ثابت)
    password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
    if not quiet:
        print("Hashing password...")
    password_hash = hash_password_bcrypt(password)
    # v1.0 (audit W41-45 #10): Prisma DateTime را epoch-ms INTEGER ذخیره می‌کند؛
    # ISO TEXT باعث ستون mixed-type می‌شد (retention بک‌آپ هم نمی‌توانست prune کند)
    now = int(time.time() * 1000)

    cur.execute("""
        INSERT INTO AccessUser (id, username, passwordHash, displayName, role, active, loginCount, deactivatedReason, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "admin-seed-" + os.urandom(4).hex(),
        "admin",
        password_hash,
        "Owner — Ehsan Morad",
        # v1.0 (RBAC): حساب admin = مالک سایت است → نقش owner (بالاتر از admin؛
        # از پنل قابل حذف/تنزل/غیرفعال‌سازی نیست — ببین src/lib/rbac.ts)
        "owner",
        1,  # active = true
        0,
        "",
        now,
        now,
    ))
    conn.commit()
    if quiet:
        # v1.1: فقط رمز — برای نوشتن امن در فایل (docker-entrypoint)
        print(password)
    else:
        print("✅ Admin user created:")
        print("   username: admin")
        print(f"   password: {password}")
        print("   ⚠️  این رمز فقط همین یک بار نمایش داده می‌شه — یادداشتش کن!")
        print("   ⚠️  بعد از اولین ورود، از پنل → تنظیمات → تغییر رمز عوضش کن!")
    conn.close()

if __name__ == "__main__":
    main()
