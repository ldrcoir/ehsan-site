#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اعمال schema دیتابیس با SQL مستقیم (بدون نیاز به prisma CLI)
این اسکریپت جایگزین 'prisma db push' می‌شه — سریع‌تر و سبک‌تر
نسخه V17.3 — بر اساس prisma/schema.prisma
"""

import sqlite3
import os
import sys
from pathlib import Path

DB_PATH = str(Path(__file__).resolve().parent.parent / "db" / "custom.db")

SCHEMA_SQL = """
-- ============================================================================
-- User / Post (legacy/unused but kept for compatibility)
-- ============================================================================
CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS Post (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    published BOOLEAN NOT NULL DEFAULT 0,
    authorId TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);

-- ============================================================================
-- ContactMessage + Replies + Tags + Notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS ContactMessage (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    ip TEXT,
    userAgent TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contactmsg_createdAt ON ContactMessage(createdAt);
CREATE INDEX IF NOT EXISTS idx_contactmsg_email ON ContactMessage(email);
CREATE INDEX IF NOT EXISTS idx_contactmsg_status ON ContactMessage(status);

CREATE TABLE IF NOT EXISTS MessageReply (
    id TEXT PRIMARY KEY NOT NULL,
    messageId TEXT NOT NULL,
    reply TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (messageId) REFERENCES ContactMessage(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_msgreply_messageId ON MessageReply(messageId);

CREATE TABLE IF NOT EXISTS MessageTag (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#00ff41',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS MessageTagRelation (
    messageId TEXT NOT NULL,
    tagId TEXT NOT NULL,
    PRIMARY KEY (messageId, tagId),
    FOREIGN KEY (messageId) REFERENCES ContactMessage(id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES MessageTag(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS MessageNote (
    id TEXT PRIMARY KEY NOT NULL,
    messageId TEXT NOT NULL,
    note TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (messageId) REFERENCES ContactMessage(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_msgnote_messageId ON MessageNote(messageId);

-- ============================================================================
-- ChatSession + ChatMessage
-- ============================================================================
CREATE TABLE IF NOT EXISTS ChatSession (
    id TEXT PRIMARY KEY NOT NULL,
    visitorId TEXT NOT NULL,
    ip TEXT,
    userAgent TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chatsession_createdAt ON ChatSession(createdAt);
CREATE INDEX IF NOT EXISTS idx_chatsession_visitorId ON ChatSession(visitorId);

CREATE TABLE IF NOT EXISTS ChatMessage (
    id TEXT PRIMARY KEY NOT NULL,
    sessionId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sessionId) REFERENCES ChatSession(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chatmsg_sessionId ON ChatMessage(sessionId);
CREATE INDEX IF NOT EXISTS idx_chatmsg_createdAt ON ChatMessage(createdAt);

-- ============================================================================
-- SiteSetting (key-value)
-- ============================================================================
CREATE TABLE IF NOT EXISTS SiteSetting (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    updatedAt DATETIME NOT NULL
);

-- ============================================================================
-- AiProvider
-- ============================================================================
CREATE TABLE IF NOT EXISTS AiProvider (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    apiKey TEXT,
    baseUrl TEXT,
    model TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aiprovider_enabled_priority ON AiProvider(enabled, priority);

-- ============================================================================
-- LabEquipment
-- ============================================================================
CREATE TABLE IF NOT EXISTS LabEquipment (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'online',
    description TEXT,
    specs TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_labequipment_visible_order ON LabEquipment(visible, "order");
CREATE INDEX IF NOT EXISTS idx_labequipment_category ON LabEquipment(category);

-- ============================================================================
-- PageView (analytics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS PageView (
    id TEXT PRIMARY KEY NOT NULL,
    path TEXT NOT NULL,
    referrer TEXT,
    userAgent TEXT,
    ip TEXT,
    lang TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pageview_path_createdAt ON PageView(path, createdAt);
CREATE INDEX IF NOT EXISTS idx_pageview_createdAt ON PageView(createdAt);

-- ============================================================================
-- TutorialView
-- ============================================================================
CREATE TABLE IF NOT EXISTS TutorialView (
    id TEXT PRIMARY KEY NOT NULL,
    tutorialId TEXT NOT NULL,
    ip TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tutorialview_tutorialId ON TutorialView(tutorialId);
CREATE INDEX IF NOT EXISTS idx_tutorialview_createdAt ON TutorialView(createdAt);

-- ============================================================================
-- Book
-- ============================================================================
CREATE TABLE IF NOT EXISTS Book (
    id TEXT PRIMARY KEY NOT NULL,
    titleEn TEXT NOT NULL DEFAULT '',
    titleDe TEXT,
    titleFa TEXT,
    year TEXT NOT NULL DEFAULT '',
    publisherEn TEXT NOT NULL DEFAULT '',
    publisherDe TEXT,
    publisherFa TEXT,
    descEn TEXT NOT NULL DEFAULT '',
    descDe TEXT,
    descFa TEXT,
    cover TEXT NOT NULL DEFAULT 'linear-gradient(135deg,#003b00,#00ff41)',
    link TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_book_visible_order ON Book(visible, "order");

-- ============================================================================
-- Article
-- ============================================================================
CREATE TABLE IF NOT EXISTS Article (
    id TEXT PRIMARY KEY NOT NULL,
    titleEn TEXT NOT NULL DEFAULT '',
    titleDe TEXT,
    titleFa TEXT,
    venueEn TEXT NOT NULL DEFAULT '',
    venueDe TEXT,
    venueFa TEXT,
    date TEXT NOT NULL DEFAULT '',
    typeEn TEXT NOT NULL DEFAULT 'Article',
    typeDe TEXT,
    typeFa TEXT,
    summaryEn TEXT NOT NULL DEFAULT '',
    summaryDe TEXT,
    summaryFa TEXT,
    link TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_article_visible_order ON Article(visible, "order");

-- ============================================================================
-- Tutorial
-- ============================================================================
CREATE TABLE IF NOT EXISTS Tutorial (
    id TEXT PRIMARY KEY NOT NULL,
    titleEn TEXT NOT NULL DEFAULT '',
    titleDe TEXT,
    titleFa TEXT,
    duration TEXT NOT NULL DEFAULT '00:00',
    levelEn TEXT NOT NULL DEFAULT 'Beginner',
    levelDe TEXT,
    levelFa TEXT,
    descEn TEXT NOT NULL DEFAULT '',
    descDe TEXT,
    descFa TEXT,
    embedUrl TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL DEFAULT 'aparat',
    playlist TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tutorial_visible_order ON Tutorial(visible, "order");
CREATE INDEX IF NOT EXISTS idx_tutorial_playlist ON Tutorial(playlist);

-- ============================================================================
-- Skill
-- ============================================================================
CREATE TABLE IF NOT EXISTS Skill (
    id TEXT PRIMARY KEY NOT NULL,
    categoryEn TEXT NOT NULL DEFAULT '',
    categoryDe TEXT,
    categoryFa TEXT,
    items TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_skill_visible_order ON Skill(visible, "order");

-- ============================================================================
-- AiInstruction
-- ============================================================================
CREATE TABLE IF NOT EXISTS AiInstruction (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aiinstruction_enabled_order ON AiInstruction(enabled, "order");

-- ============================================================================
-- EmailConfig
-- ============================================================================
CREATE TABLE IF NOT EXISTS EmailConfig (
    id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
    smtpHost TEXT,
    smtpPort TEXT,
    smtpUser TEXT,
    smtpPass TEXT,
    fromEmail TEXT,
    fromName TEXT,
    enabled BOOLEAN NOT NULL DEFAULT 0,
    updatedAt DATETIME NOT NULL
);

-- ============================================================================
-- TelegramConfig
-- ============================================================================
CREATE TABLE IF NOT EXISTS TelegramConfig (
    id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
    botToken TEXT,
    chatId TEXT,
    enabled BOOLEAN NOT NULL DEFAULT 0,
    updatedAt DATETIME NOT NULL
);

-- ============================================================================
-- CustomTheme (primary reserved word — use quotes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS CustomTheme (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    bg TEXT NOT NULL DEFAULT '#000000',
    bgSoft TEXT NOT NULL DEFAULT '#030303',
    bgPanel TEXT NOT NULL DEFAULT '#050505',
    bgPanel2 TEXT NOT NULL DEFAULT '#080808',
    "primary" TEXT NOT NULL DEFAULT '#00ff41',
    primaryDim TEXT NOT NULL DEFAULT '#008f11',
    primaryBright TEXT NOT NULL DEFAULT '#39ff14',
    text TEXT NOT NULL DEFAULT '#c8ffc8',
    textDim TEXT NOT NULL DEFAULT '#4a7a4a',
    textFaint TEXT NOT NULL DEFAULT '#2a4a2a',
    border TEXT NOT NULL DEFAULT '#1a3a1a',
    borderBright TEXT NOT NULL DEFAULT '#2a6a2a',
    accent TEXT NOT NULL DEFAULT '#ffb000',
    red TEXT NOT NULL DEFAULT '#ff0040',
    cyan TEXT NOT NULL DEFAULT '#00fff0',
    scanlines BOOLEAN NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customtheme_visible_order ON CustomTheme(visible, "order");

-- ============================================================================
-- SiteText
-- ============================================================================
CREATE TABLE IF NOT EXISTS SiteText (
    key TEXT PRIMARY KEY NOT NULL,
    valueEn TEXT NOT NULL DEFAULT '',
    valueFa TEXT NOT NULL DEFAULT '',
    valueDe TEXT NOT NULL DEFAULT '',
    updatedAt DATETIME NOT NULL
);

-- ============================================================================
-- NavItem
-- ============================================================================
CREATE TABLE IF NOT EXISTS NavItem (
    id TEXT PRIMARY KEY NOT NULL,
    labelEn TEXT NOT NULL DEFAULT '',
    labelFa TEXT NOT NULL DEFAULT '',
    labelDe TEXT NOT NULL DEFAULT '',
    href TEXT NOT NULL DEFAULT '#',
    target TEXT NOT NULL DEFAULT '_self',
    visible BOOLEAN NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_navitem_visible_order ON NavItem(visible, "order");

-- ============================================================================
-- AccessUser + AccessLog
-- ============================================================================
CREATE TABLE IF NOT EXISTS AccessUser (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    displayName TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    permissions TEXT,
    allowedHourStart INTEGER,
    allowedHourEnd INTEGER,
    allowedDays TEXT,
    expiresAt DATETIME,
    active BOOLEAN NOT NULL DEFAULT 1,
    loginCount INTEGER NOT NULL DEFAULT 0,
    lastLoginAt DATETIME,
    deactivatedReason TEXT NOT NULL DEFAULT '',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accessuser_username ON AccessUser(username);
CREATE INDEX IF NOT EXISTS idx_accessuser_active ON AccessUser(active);

CREATE TABLE IF NOT EXISTS AccessLog (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,
    ip TEXT,
    userAgent TEXT,
    details TEXT NOT NULL DEFAULT '',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES AccessUser(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_accesslog_userId ON AccessLog(userId);
CREATE INDEX IF NOT EXISTS idx_accesslog_createdAt ON AccessLog(createdAt);
CREATE INDEX IF NOT EXISTS idx_accesslog_action ON AccessLog(action);

-- ============================================================================
-- BlockedIp + SecurityLog
-- ============================================================================
CREATE TABLE IF NOT EXISTS BlockedIp (
    id TEXT PRIMARY KEY NOT NULL,
    ip TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL DEFAULT '',
    attempts INTEGER NOT NULL DEFAULT 0,
    expiresAt DATETIME,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS SecurityLog (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    ip TEXT,
    detail TEXT NOT NULL DEFAULT '',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_seclog_type ON SecurityLog(type);
CREATE INDEX IF NOT EXISTS idx_seclog_ip ON SecurityLog(ip);
CREATE INDEX IF NOT EXISTS idx_seclog_createdAt ON SecurityLog(createdAt);

-- ============================================================================
-- AparatClip
-- ============================================================================
CREATE TABLE IF NOT EXISTS AparatClip (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    embedCode TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    visible BOOLEAN NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aparatclip_visible_order ON AparatClip(visible, "order");
"""

def main():
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    if not os.path.exists(DB_PATH):
        open(DB_PATH, "a").close()

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.executescript(SCHEMA_SQL)
        conn.commit()
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM sqlite_master WHERE type='table'")
        count = cur.fetchone()[0]
        print(f"✅ Schema applied — {count} tables created/verified in {DB_PATH}")
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
