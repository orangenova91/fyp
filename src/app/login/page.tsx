import { redirect } from "next/navigation";
import { connection } from "next/server";
import { login } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { StatefulForm } from "@/components/stateful-form";
import { getCurrentUser } from "@/lib/auth";
import { countUsers } from "@/lib/data";

export default async function LoginPage() {
  await connection();
  if ((await countUsers()) === 0) redirect("/setup");
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <AuthShell title="로그인" description="교수님께 받은 계정으로 로그인하세요.">
      <StatefulForm action={login} submitLabel="로그인" pendingLabel="로그인 중…">
        <div>
          <label htmlFor="email" className="label">이메일</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div>
          <label htmlFor="password" className="label">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
          />
        </div>
      </StatefulForm>
    </AuthShell>
  );
}
