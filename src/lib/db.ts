import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

export const db: Pool = globalThis._pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis._pgPool = db;

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
) {
  const result = await db.query<T>(text, params);
  return result;
}
