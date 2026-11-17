import Link from "next/link";
import { deleteAccountAction, updateProfileAction } from "@/app/actions/account";
import { changePassword } from "@/app/actions/auth";
import { StatefulForm } from "@/components/stateful-form";
import { requireUser } from "@/lib/auth";
import { listClassesForProfessor, type User } from "@/lib/data";
import { DELETE_ACCOUNT_PHRASE, MIN_PASSWORD_LENGTH } from "@/lib/forms";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">내 계정</h1>
      <section className="card">
        <dl className="mb-4 grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
          <dt className="text-slate-500">이메일</dt>
          <dd>{user.email}</dd>
          <dt className="text-slate-500">역할</dt>
          <dd>{user.role === "professor" ? "교수" : "학생"}</dd>
        </dl>
        <StatefulForm action={updateProfileAction} submitLabel="저장">
          <div>
            <label htmlFor="name" className="label">이름</label>
            <input id="name" name="name" required defaultValue={user.name} className="input" />
          </div>
          {user.role === "student" && (
            <div>
              <label htmlFor="projectTitle" className="label">캡스톤 프로젝트 주제</label>
              <input
                id="projectTitle"
                name="projectTitle"
                defaultValue={user.project_title ?? ""}
                className="input"
                placeholder="예: 딥러닝 기반 수면 단계 분류"
              />
            </div>
          )}
        </StatefulForm>
      </section>
      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">비밀번호 변경</h2>
        <StatefulForm action={changePassword} submitLabel="변경" resetOnSuccess>
          <div>
            <label htmlFor="current" className="label">현재 비밀번호</label>
            <input id="current" name="current" type="password" required autoComplete="current-password" className="input" />
          </div>
          <div>
            <label htmlFor="next" className="label">새 비밀번호 ({MIN_PASSWORD_LENGTH}자 이상)</label>
            <input
              id="next"
              name="next"
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="label">새 비밀번호 확인</label>
            <input id="confirm" name="confirm" type="password" required autoComplete="new-password" className="input" />
          </div>
        </StatefulForm>
      </section>
      <DeleteAccountSection user={user} />
    </div>
  );
}

async function DeleteAccountSection({ user }: { user: User }) {
  const ownedClasses = user.role === "professor" ? await listClassesForProfessor(user.id) : [];

  return (
    <section className="card space-y-3 border-red-200">
      <h2 className="text-lg font-semibold text-red-700">계정 삭제</h2>
      {ownedClasses.length > 0 ? (
        <>
          <p className="text-sm text-slate-600">
            개설한 수업이 남아 있어 계정을 삭제할 수 없습니다. 각 수업의 수업 설정에서 수업을 먼저 삭제해 주세요.
          </p>
          <ul className="space-y-1 text-sm">
            {ownedClasses.map((cls) => (
              <li key={cls.id}>
                <Link href={`/classes/${cls.id}/settings`} className="link">
                  {cls.name}
                </Link>{" "}
                <span className="text-slate-500">· 학생 {cls.approved_count}명</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            {user.role === "student"
              ? "제출물, 첨부파일, 피드백, 수업 참여 기록이 모두 영구 삭제되며 교수님도 더 이상 볼 수 없습니다."
              : "계정 정보가 영구 삭제됩니다."}{" "}
            되돌릴 수 없습니다.
          </p>
          <StatefulForm
            action={deleteAccountAction}
            submitLabel="계정 영구 삭제"
            pendingLabel="삭제 중…"
            submitClassName="btn-danger"
          >
            <div>
              <label htmlFor="delete-password" className="label">비밀번호 확인</label>
              <input
                id="delete-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="delete-phrase" className="label">
                확인을 위해 <span className="font-semibold">{DELETE_ACCOUNT_PHRASE}</span>를 입력하세요
              </label>
              <input id="delete-phrase" name="confirmPhrase" required autoComplete="off" className="input" />
            </div>
          </StatefulForm>
        </>
      )}
    </section>
  );
}
