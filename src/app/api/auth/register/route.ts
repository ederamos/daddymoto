import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, city, state } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    await query(
      "INSERT INTO users (name, email, password_hash, city, state) VALUES ($1, $2, $3, $4, $5)",
      [name.trim(), email.toLowerCase().trim(), hash, city || null, state || null]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
