// ============================================================================
// /api/user/logout — خروج کاربر (پاک کردن cookie)
// ============================================================================

import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("access_session");
  return response;
}
