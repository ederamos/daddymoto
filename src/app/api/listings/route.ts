import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const body = await req.json();
    const {
      category_id, title, description, price, price_obo,
      year, make, model, mileage, engine_cc, color, condition, vin,
      city, state, zip,
    } = body;

    if (!category_id || !title || !description) {
      return NextResponse.json({ error: "Category, title, and description are required." }, { status: 400 });
    }

    const result = await query<{ id: string }>(`
      INSERT INTO listings
        (user_id, category_id, title, description, price, price_obo, year, make, model,
         mileage, engine_cc, color, condition, vin, city, state, zip)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING id
    `, [
      userId, category_id, title.trim(), description.trim(),
      price ? Math.round(parseFloat(price) * 100) : null,
      price_obo || false,
      year || null, make || null, model || null,
      mileage || null, engine_cc || null, color || null,
      condition || null, vin || null,
      city || null, state || null, zip || null,
    ]);

    return NextResponse.json({ id: result.rows[0].id });
  } catch (err) {
    console.error("Create listing error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
