# Capstone Hub

교수님과 학생들이 수업 단위로 캡스톤 과제를 주고받는 웹 플랫폼입니다.

- **교수**: 수업 개설과 수업 코드 발급, 참여 신청 승인·거절, 과제 게시(전체 또는 일부 학생, 첨부파일), 학생별 제출 현황, 피드백과 재제출 요청, 공지사항
- **학생**: 수업 코드로 바로 참여하거나 수업 목록에서 참여 신청, 해야 할 과제 목록(D-day), 제출(설명·링크·파일, 재제출 시 버전 기록), 피드백 확인과 답글

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

### 사용 흐름

1. 로그인 화면의 **회원가입**에서 교수 또는 학생 탭을 골라 계정을 만듭니다. (MVP 단계라 교수 가입에도 인증 코드가 없습니다.)
2. 교수는 **수업 개설**을 하면 `ABCD-2345` 형태의 수업 코드가 생깁니다. 이 코드를 학생들에게 알려 주세요.
3. 학생은 수업 코드를 입력하면 바로 참여됩니다. 코드 없이 수업 카드의 **참여 신청**을 누르면 교수가 `구성원` 탭에서 승인하거나 거절합니다.
4. 거절되거나 수업에서 제외된 학생은 수업 코드로만 다시 들어올 수 있습니다. 코드가 유출되면 `수업 설정`에서 새로 발급하세요.
5. 잘못된 수업 코드를 15분 동안 10번 입력하면 잠시 입력이 막힙니다.

### 데모 데이터로 체험하기

DB에 사용자가 한 명도 없을 때만 동작합니다.

```bash
npm run seed:demo
```

- 교수: `prof@demo.ac.kr`, `prof2@demo.ac.kr` (각자 수업 1개, 수업 코드는 실행 결과에 표시)
- 학생: `student1@demo.ac.kr` ~ `student6@demo.ac.kr` (승인 대기 중인 참여 신청 2건 포함)
- 비밀번호는 모두 `demo1234`입니다.

데모 데이터를 지우려면 Supabase SQL Editor에서 아래 명령을 실행하고, Storage의 `uploads` 버킷에 있는 파일도 삭제하세요.

```sql
TRUNCATE users, classes, enrollments, join_code_failures, assignments, assignment_targets,
         assignment_views, submissions, files, comments, reviews, announcements RESTART IDENTITY CASCADE;
```

## 구조

| 경로 | 내용 |
|---|---|
| `src/lib/schema.ts` | 테이블 정의 (`npm run db:setup`이 실행) |
| `src/lib/data.ts` | 모든 DB 조회·저장 함수 |
| `src/lib/files.ts`, `supabase.ts` | Supabase Storage 업로드·다운로드·삭제 |
| `src/lib/progress.ts` | 학생별 과제 상태 계산 (미확인 → 확인함 → 제출함 → 재제출 요청 / 피드백 완료) |
| `src/lib/auth.ts`, `session.ts` | 로그인 세션(암호화 쿠키) |
| `src/lib/access.ts` | 수업 접근 권한: 개설한 교수와 승인된 학생만 수업에 들어갈 수 있음 |
| `src/app/actions/` | 폼 처리 서버 액션 (모든 액션에서 권한을 다시 확인) |
| `src/app/(app)/classes/` | 수업 목록, 수업별 게시판·과제·구성원·설정 |
| `src/app/files/[id]/route.ts` | 권한을 확인한 뒤 Storage에서 파일을 내려줌 |

## 보안

- 모든 테이블에 RLS(Row Level Security)를 켜고 정책은 만들지 않았습니다. 그래서 Supabase 공개 API(anon/publishable 키)로는 아무 데이터도 읽을 수 없습니다. 앱은 DB에 직접 접속하므로 영향을 받지 않습니다.
- Storage 버킷은 비공개입니다. 파일은 앱의 `/files/[id]` 경로를 거쳐서만 받을 수 있고, 교수는 자기 수업의 파일만, 학생은 승인된 수업에서 자기에게 배정된 과제의 첨부파일과 자기 제출물만 받을 수 있습니다.
- 학생 목록 화면에는 수업 코드가 노출되지 않습니다. 코드는 교수 화면에만 표시됩니다.

## 배포 (Vercel)

이제 서버에 파일을 저장하지 않으므로 Vercel에 배포할 수 있습니다. Vercel 환경변수에 위 네 값을 넣되, `DATABASE_URL`은 Supabase의 **Transaction pooler**(포트 6543) 주소를 사용하세요. 운영 환경에서는 로그인 쿠키가 `Secure`로 설정되므로 HTTPS로 접속해야 합니다.
