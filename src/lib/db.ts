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

type Sql = ReturnType<typeof connect>;

const globalForDb = globalThis as unknown as { capstoneSql?: Sql };

function getSql(): Sql {
  if (!globalForDb.capstoneSql) globalForDb.capstoneSql = connect();
  return globalForDb.capstoneSql;
}

// Connects on first use rather than at import, so `next build` works without database credentials.
export const sql = new Proxy((() => {}) as unknown as Sql, {
  apply: (_target, _thisArg, args) => Reflect.apply(getSql(), undefined, args),
  get: (_target, property) => {
    const value = Reflect.get(getSql(), property);
    return typeof value === "function" ? value.bind(getSql()) : value;
  },
});
