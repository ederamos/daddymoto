import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const result = await query("SELECT * FROM categories ORDER BY sort_order");
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
