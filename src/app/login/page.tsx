import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { login } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { StatefulForm } from "@/components/stateful-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  await connection();
  if (await getCurrentUser()) redirect("/classes");
  const { deleted } = await searchParams;

  return (
    <AuthShell
      title="로그인"
      description="가입한 이메일과 비밀번호로 로그인하세요."
      footer={
        <>
          계정이 없으신가요? <Link href="/signup" className="link">회원가입</Link>
        </>
      }
    >
      {deleted === "1" && (
        <p role="status" className="mb-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
          계정이 삭제되었습니다. 이용해 주셔서 감사합니다.
        </p>
      )}
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
