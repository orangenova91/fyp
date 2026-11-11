// Creates the tables and the private Storage bucket. Safe to re-run: `npm run db:setup`
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { SCHEMA_SQL, STORAGE_BUCKET } from "../src/lib/schema.ts";

const { DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!DATABASE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(".env.local에 DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 모두 넣어 주세요.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { prepare: false, onnotice: () => {} });
await sql.unsafe(SCHEMA_SQL);
await sql.end();
console.log("✓ 데이터베이스 테이블 준비 완료");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { data: bucket } = await supabase.storage.getBucket(STORAGE_BUCKET);
if (bucket) {
  if (bucket.public) {
    console.error(`! '${STORAGE_BUCKET}' 버킷이 공개(Public) 상태입니다. Storage 설정에서 비공개로 바꿔 주세요.`);
    process.exit(1);
  }
  console.log(`✓ 파일 저장소 '${STORAGE_BUCKET}' 버킷이 이미 있습니다 (비공개)`);
} else {
  const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: "25MB",
  });
  if (error) {
    console.error(`! 버킷 생성 실패: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ 파일 저장소 '${STORAGE_BUCKET}' 버킷 생성 완료 (비공개)`);
}
