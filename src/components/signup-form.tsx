"use client";

import { useState } from "react";
import { signup } from "@/app/actions/auth";
import { StatefulForm } from "@/components/stateful-form";
import { MIN_PASSWORD_LENGTH } from "@/lib/forms";

const ROLES = [
  { value: "student", label: "학생" },
  { value: "professor", label: "교수" },
] as const;

export function SignupForm() {
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("student");

  return (
    <>
      <div role="tablist" aria-label="가입 유형" className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            role="tab"
            aria-selected={role === r.value}
            onClick={() => setRole(r.value)}
            className={`rounded-md py-2 text-sm font-medium transition ${
              role === r.value ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-slate-500">
        {role === "student"
          ? "가입 후 수업 코드를 입력하거나 수업에 참여를 신청할 수 있습니다."
          : "가입 후 수업을 개설하고 학생들에게 수업 코드를 안내할 수 있습니다."}
      </p>
      <StatefulForm action={signup} submitLabel={`${role === "student" ? "학생" : "교수"}으로 가입하기`} pendingLabel="가입 중…">
        <input type="hidden" name="role" value={role} />
        <div>
          <label htmlFor="name" className="label">이름</label>
          <input id="name" name="name" required autoComplete="name" className="input" />
        </div>
        <div>
          <label htmlFor="email" className="label">이메일</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        {role === "student" && (
          <div>
            <label htmlFor="projectTitle" className="label">캡스톤 프로젝트 주제 (선택)</label>
            <input id="projectTitle" name="projectTitle" className="input" placeholder="나중에 입력해도 됩니다" />
          </div>
        )}
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
        <div>
          <label htmlFor="confirm" className="label">비밀번호 확인</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className="input"
          />
        </div>
      </StatefulForm>
    </>
  );
}
