import { changePassword } from "@/app/actions/auth";
import { StatefulForm } from "@/components/stateful-form";
import { requireUser } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/forms";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">내 계정</h1>
      <section className="card text-sm">
        <dl className="grid grid-cols-[6rem_1fr] gap-y-2">
          <dt className="text-slate-500">이름</dt>
          <dd>{user.name}</dd>
          <dt className="text-slate-500">이메일</dt>
          <dd>{user.email}</dd>
          <dt className="text-slate-500">역할</dt>
          <dd>{user.role === "professor" ? "교수" : "학생"}</dd>
          {user.project_title && (
            <>
              <dt className="text-slate-500">프로젝트</dt>
              <dd>{user.project_title}</dd>
            </>
          )}
        </dl>
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
    </div>
  );
}
