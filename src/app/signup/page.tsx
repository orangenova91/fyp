import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/classes");

  return (
    <AuthShell
      title="회원가입"
      description="역할을 선택하고 계정을 만드세요."
      footer={
        <>
          이미 계정이 있으신가요? <Link href="/login" className="link">로그인</Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
