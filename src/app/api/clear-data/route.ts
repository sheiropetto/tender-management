import { NextResponse } from "next/server";

export async function POST() {
  // This route is just for browser-side clearing
  return NextResponse.json({ ok: true });
}
