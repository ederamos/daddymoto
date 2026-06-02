import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const result = await query("SELECT name, email, city, state, phone, bio FROM users WHERE id = $1", [userId]);
  return NextResponse.json(result.rows[0] || {});
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { name, city, state, phone, bio } = await req.json();

  await query(
    "UPDATE users SET name = $1, city = $2, state = $3, phone = $4, bio = $5 WHERE id = $6",
    [name?.trim() || null, city || null, state || null, phone || null, bio || null, userId]
  );

  return NextResponse.json({ success: true });
}
