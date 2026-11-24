#!/usr/bin/env node
// ============================================================================
// maintenance-enc.mjs — ابزار رمزنگاری کانال نگهداری (v1.0 rev3)
// ============================================================================
// قالب پاکت را با src/lib/maintenance-crypto.ts مشترک نگه می‌دارد:
//   {"enc":"v1","data":"<base64(iv[12B] | ciphertext | tag[16B])>"}
// داخل پیام: {"ts": <epochMs>, "n": "<nonce hex>", ...payload}
//
// Usage:
//   node maintenance-enc.mjs enc <keyHex> ['<json>']   ← payload از آرگومان یا stdin
//        خروجی: پاکت رمزشده (ts و nonce خودکار اضافه می‌شوند)
//   node maintenance-enc.mjs dec <keyHex> ['<envelope>']  ← پاکت از آرگومان یا stdin
//        خروجی: plaintext (اگر پاکت نبود، همان ورودی برگردانده می‌شود — legacy)
//
// این اسکریپت توسط maintenance.sh و sync-from-online.sh صدا زده می‌شود؛
// اگر MAINTENANCE_ENC_KEY ست نباشد اصلا صدا زده نمی‌شود (کانال legacy).
// ============================================================================

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENC_WINDOW_MS = 5 * 60 * 1000;

function fail(msg) {
  console.error(`[maintenance-enc] ${msg}`);
  process.exit(2);
}

const [, , cmd, keyHex, inlineArg] = process.argv;
if (!cmd || !/^(enc|dec)$/.test(cmd)) fail("usage: maintenance-enc.mjs enc|dec <keyHex> ['<json>']");
if (!keyHex || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
  fail("key must be 64 hex chars (32 bytes) — MAINTENANCE_ENC_KEY");
}

// ورودی: آرگومان سوم یا stdin (برای payload بزرگ)
async function readInput() {
  if (inlineArg !== undefined) return inlineArg;
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function main() {
  const input = await readInput();
  if (!input) fail("empty input");

  if (cmd === "enc") {
    let payload;
    try {
      payload = JSON.parse(input);
    } catch {
      fail("payload is not valid JSON");
    }
    // ts + nonce یک‌بارمصرف داخل پیام — ضد replay
    payload.ts = Date.now();
    if (payload.ts < 0) fail("clock error");
    payload.n = randomBytes(16).toString("hex");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
    const ct = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    process.stdout.write(
      JSON.stringify({ enc: "v1", data: Buffer.concat([iv, ct, tag]).toString("base64") })
    );
    return;
  }

  // dec — اگر ورودی پاکت رمز بود بازش کن؛ وگرنه همانی را برگردان (legacy)
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    process.stdout.write(input);
    return;
  }
  if (!parsed || parsed.enc !== "v1" || typeof parsed.data !== "string") {
    process.stdout.write(input);
    return;
  }
  const raw = Buffer.from(parsed.data, "base64");
  if (raw.length < 12 + 16 + 2) fail("envelope too short");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const ct = raw.subarray(12, raw.length - 16);
  let decipher;
  try {
    decipher = createDecipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
    decipher.setAuthTag(tag);
  } catch {
    fail("decipher init failed — key wrong?");
  }
  let plain;
  try {
    plain = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    fail("decrypt failed — GCM auth tag mismatch (کلید اشتباه یا پیام دستکاری شده)");
  }
  process.stdout.write(plain);
}

main().catch((e) => fail(e?.message || String(e)));
