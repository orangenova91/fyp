import { redirect } from "next/navigation";
import { connection } from "next/server";
import { setupProfessor } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { StatefulForm } from "@/components/stateful-form";
import { countUsers } from "@/lib/data";
import { MIN_PASSWORD_LENGTH } from "@/lib/forms";

export default async function SetupPage() {
  await connection();
  if ((await countUsers()) > 0) redirect("/login");

  return (
    <AuthShell
      title="처음 설정"
      description="교수님 계정을 만들어 주세요. 이 화면은 최초 1회만 표시됩니다."
    >
      <StatefulForm action={setupProfessor} submitLabel="교수 계정 만들기">
        <div>
          <label htmlFor="name" className="label">이름</label>
          <input id="name" name="name" required className="input" placeholder="홍길동 교수" />
        </div>
        <div>
          <label htmlFor="email" className="label">이메일</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div>
          <label htmlFor="password" className="label">비밀번호 ({MIN_PASSWORD_LENGTH}자 이상)</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className="input"
          />
        </div>
      </StatefulForm>
    </AuthShell>
  );
}
