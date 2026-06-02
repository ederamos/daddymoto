import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const result = await query(
    `SELECT prt.id, prt.user_id
     FROM password_reset_tokens prt
     WHERE prt.token = $1
       AND prt.used = FALSE
       AND prt.expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  const { id: tokenId, user_id: userId } = result.rows[0];
  const hash = await bcrypt.hash(password, 12);

  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, userId]);
  await query("UPDATE password_reset_tokens SET used = TRUE WHERE id = $1", [tokenId]);

  return NextResponse.json({ success: true });
}
