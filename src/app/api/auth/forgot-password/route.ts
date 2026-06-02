import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  // Always return success to avoid user enumeration
  const result = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (result.rows.length === 0) {
    return NextResponse.json({ success: true });
  }

  const userId = result.rows[0].id;
  const token = crypto.randomBytes(32).toString("hex");

  // Invalidate any existing unused tokens for this user
  await query(
    "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
    [userId]
  );

  // Insert new token
  await query(
    "INSERT INTO password_reset_tokens (user_id, token) VALUES ($1, $2)",
    [userId, token]
  );

  await sendPasswordResetEmail(email.toLowerCase(), token);

  return NextResponse.json({ success: true });
}
