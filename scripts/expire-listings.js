#!/usr/bin/env node
/**
 * Expire listings past their expiry date.
 * Run via cron: 0 2 * * * /usr/bin/node /var/www/daddymoto.com/scripts/expire-listings.js
 */

require("dotenv").config({ path: ".env.production" });
const { Pool } = require("pg");

const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await db.query(`
    UPDATE listings
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at < NOW()
    RETURNING id, title
  `);

  console.log(`[${new Date().toISOString()}] Expired ${result.rowCount} listing(s).`);
  if (result.rowCount > 0) {
    result.rows.forEach((r) => console.log(`  - ${r.id}: ${r.title}`));
  }

  await db.end();
}

main().catch((err) => {
  console.error("Error running expiry job:", err);
  process.exit(1);
});
