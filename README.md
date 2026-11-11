# Capstone Hub

교수 1명과 학생 5~6명이 캡스톤 과제를 주고받는 웹 플랫폼입니다.

- **교수**: 과제 게시(전체 또는 일부 학생, 첨부파일), 학생별 제출 현황, 피드백과 재제출 요청, 공지사항, 학생 계정 관리
- **학생**: 해야 할 과제 목록(D-day), 과제 확인, 제출(설명·링크·파일, 재제출 시 버전 기록), 피드백 확인과 답글

데이터는 Supabase에 저장합니다. 글자 데이터는 Postgres에, 첨부파일은 Storage의 비공개 버킷 `uploads`에 들어갑니다. 로그인은 앱이 직접 처리하며 Supabase Auth는 사용하지 않습니다.

## 실행 방법

Node.js 22 이상이 필요합니다.

```bash
npm install
cp .env.example .env.local   # 값 채우기 (아래 참고)
npm run db:setup             # 테이블과 Storage 버킷 생성 (처음 한 번, 다시 실행해도 안전)
npm run dev                  # http://localhost:3000
```

`.env.local`에 넣을 값:

| 변수 | 위치 |
|---|---|
| `SESSION_SECRET` | `openssl rand -hex 32`로 생성 |
| `DATABASE_URL` | Supabase → Connect → Direct → **Session pooler** |
| `SUPABASE_URL` | Supabase → Project Settings → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | 같은 화면의 **Secret key** (`sb_secret_...`), 서버 전용 |

처음 접속하면 **교수 계정 만들기** 화면이 나옵니다. 그다음 `학생 관리` 메뉴에서 학생 계정을 만들고, 이메일과 초기 비밀번호를 학생에게 전달하세요.

### 데모 데이터로 체험하기

DB에 사용자가 한 명도 없을 때만 동작합니다.

```bash
npm run seed:demo
```

- 교수: `prof@demo.ac.kr`
- 학생: `student1@demo.ac.kr` ~ `student5@demo.ac.kr`
- 비밀번호는 모두 `demo1234`입니다.

데모 데이터를 지우려면 Supabase SQL Editor에서 아래 명령을 실행하고, Storage의 `uploads` 버킷에 있는 파일도 삭제하세요.

```sql
TRUNCATE users, assignments, assignment_targets, assignment_views, submissions,
         files, comments, reviews, announcements RESTART IDENTITY CASCADE;
```

## 구조

| 경로 | 내용 |
|---|---|
| `src/lib/schema.ts` | 테이블 정의 (`npm run db:setup`이 실행) |
| `src/lib/data.ts` | 모든 DB 조회·저장 함수 |
| `src/lib/files.ts`, `supabase.ts` | Supabase Storage 업로드·다운로드·삭제 |
| `src/lib/progress.ts` | 학생별 과제 상태 계산 (미확인 → 확인함 → 제출함 → 재제출 요청 / 피드백 완료) |
| `src/lib/auth.ts`, `session.ts` | 로그인 세션(암호화 쿠키)과 권한 확인 |
| `src/app/actions/` | 폼 처리 서버 액션 (모든 액션에서 권한을 다시 확인) |
| `src/app/(app)/` | 로그인 후 화면들 |
| `src/app/files/[id]/route.ts` | 권한을 확인한 뒤 Storage에서 파일을 내려줌 |

## 보안

- 모든 테이블에 RLS(Row Level Security)를 켜고 정책은 만들지 않았습니다. 그래서 Supabase 공개 API(anon/publishable 키)로는 아무 데이터도 읽을 수 없습니다. 앱은 DB에 직접 접속하므로 영향을 받지 않습니다.
- Storage 버킷은 비공개입니다. 파일은 앱의 `/files/[id]` 경로를 거쳐서만 받을 수 있고, 학생은 자기 제출물과 자기에게 배정된 과제의 첨부파일만 받을 수 있습니다.

## 배포 (Vercel)

이제 서버에 파일을 저장하지 않으므로 Vercel에 배포할 수 있습니다. Vercel 환경변수에 위 네 값을 넣되, `DATABASE_URL`은 Supabase의 **Transaction pooler**(포트 6543) 주소를 사용하세요. 운영 환경에서는 로그인 쿠키가 `Secure`로 설정되므로 HTTPS로 접속해야 합니다.
