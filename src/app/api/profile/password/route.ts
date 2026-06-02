import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { current, next } = await req.json();

  if (!current || !next || next.length < 8) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const result = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [userId]);
  const valid = await bcrypt.compare(current, result.rows[0]?.password_hash || "");
  if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

  const hash = await bcrypt.hash(next, 12);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, userId]);

  return NextResponse.json({ success: true });
}
