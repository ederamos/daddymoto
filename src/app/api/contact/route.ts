import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendContactEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { listingId, name, email, body } = await req.json();

    if (!listingId || !name || !email || !body) {
      return NextResponse.json({ error: "All fields required." }, { status: 400 });
    }

    // Verify listing exists and is active
    const listing = await query(
      "SELECT id, user_id, title FROM listings WHERE id = $1 AND status = 'active'",
      [listingId]
    );
    if (!listing.rows[0]) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    // Save message
    await query(
      "INSERT INTO messages (listing_id, sender_name, sender_email, body) VALUES ($1, $2, $3, $4)",
      [listingId, name.trim(), email.toLowerCase().trim(), body.trim()]
    );

    // Get seller email
    const seller = await query<{ email: string }>("SELECT email FROM users WHERE id = $1", [listing.rows[0].user_id]);
    const sellerEmail = seller.rows[0]?.email as string | undefined;

    // Send email if configured
    if (sellerEmail && process.env.RESEND_API_KEY) {
      await sendContactEmail({
        to: sellerEmail,
        replyTo: email,
        senderName: name,
        senderEmail: email,
        listingTitle: listing.rows[0].title as string,
        body,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
