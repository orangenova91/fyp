import "server-only";
import postgres from "postgres";

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");
  return postgres(url, {
    max: 5,
    // Required by Supabase's transaction pooler; harmless with the session pooler.
    prepare: false,
    types: {
      // Return timestamps as ISO strings so they compare and serialize like plain values.
      timestamptz: {
        to: 1184,
        from: [1184],
        serialize: (value: string | Date) => (value instanceof Date ? value.toISOString() : value),
        parse: (value: string) => new Date(value).toISOString(),
      },
    },
  });
}

const globalForDb = globalThis as unknown as { capstoneSql?: ReturnType<typeof connect> };

export const sql = globalForDb.capstoneSql ?? connect();
if (process.env.NODE_ENV !== "production") globalForDb.capstoneSql = sql;
