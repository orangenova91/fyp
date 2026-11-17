import Link from "next/link";
import type { ReactNode } from "react";
import { joinByCodeAction, requestJoinAction } from "@/app/actions/classes";
import { ConfirmButton } from "@/components/confirm-button";
import { CreateClassModal } from "@/components/create-class-modal";
import { JoinCode } from "@/components/join-code";
import { StatefulForm } from "@/components/stateful-form";
import { requireUser } from "@/lib/auth";
import {
  formatJoinCode,
  listClassesForProfessor,
  listClassesForStudent,
  type StudentClassCard,
  type User,
} from "@/lib/data";

export default async function ClassesPage() {
  const user = await requireUser();
  return user.role === "professor" ? <ProfessorClasses professor={user} /> : <StudentClasses student={user} />;
}

async function ProfessorClasses({ professor }: { professor: User }) {
  const classes = await listClassesForProfessor(professor.id);

  if (classes.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">환영합니다, {professor.name}님</h1>
          <p className="mt-1 text-sm text-slate-500">첫 수업을 개설해 보세요.</p>
        </div>
        <CreateClassModal />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">내 수업</h1>
          <CreateClassModal />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {classes.map((cls) => (
            <li key={cls.id} className="card flex flex-col gap-3">
              <div>
                {cls.term && <p className="text-xs text-slate-500">{cls.term}</p>}
                <Link href={`/classes/${cls.id}`} className="text-lg font-semibold hover:text-indigo-700">
                  {cls.name}
                </Link>
              </div>
              <div className="text-sm text-slate-600">
                수업 코드 <JoinCode code={formatJoinCode(cls.join_code)} />
              </div>
              <div className="mt-auto flex items-center justify-between text-sm">
                <span className="text-slate-600">학생 {cls.approved_count}명</span>
                {cls.pending_count > 0 ? (
                  <Link
                    href={`/classes/${cls.id}/members`}
                    className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
                  >
                    승인 대기 {cls.pending_count}명
                  </Link>
                ) : (
                  <Link href={`/classes/${cls.id}`} className="link">
                    들어가기 →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

async function StudentClasses({ student }: { student: User }) {
  const classes = await listClassesForStudent(student.id);
  const mine = classes.filter((c) => c.my_status === "approved");
  const pending = classes.filter((c) => c.my_status === "pending");
  const others = classes.filter((c) => c.my_status === null || c.my_status === "rejected");

  return (
    <div className="space-y-8">
      <section className="card">
        <h1 className="mb-1 text-lg font-semibold">수업 코드로 참여</h1>
        <p className="mb-4 text-sm text-slate-500">교수님께 받은 코드를 입력하면 승인 없이 바로 들어갈 수 있습니다.</p>
        <StatefulForm action={joinByCodeAction} submitLabel="참여하기" pendingLabel="확인 중…" className="flex flex-wrap items-start gap-2">
          <input
            name="code"
            required
            aria-label="수업 코드"
            autoComplete="off"
            className="input max-w-48 font-mono tracking-widest uppercase"
            placeholder="ABCD-2345"
          />
        </StatefulForm>
      </section>

      <ClassCardSection title="내 수업" classes={mine} empty="아직 참여 중인 수업이 없습니다.">
        {(cls) => (
          <Link href={`/classes/${cls.id}`} className="link">
            들어가기 →
          </Link>
        )}
      </ClassCardSection>

      {pending.length > 0 && (
        <ClassCardSection title="승인 대기 중" classes={pending}>
          {() => <span className="text-xs font-medium text-amber-700">교수님의 승인을 기다리고 있습니다</span>}
        </ClassCardSection>
      )}

      <ClassCardSection title="개설된 수업" classes={others} empty="참여 신청할 수 있는 다른 수업이 없습니다.">
        {(cls) =>
          cls.my_status === "rejected" ? (
            <span className="text-xs text-slate-500">수업 코드로만 참여할 수 있습니다</span>
          ) : (
            <ConfirmButton
              action={requestJoinAction.bind(null, cls.id)}
              className="btn-secondary"
              pendingLabel="신청 중…"
            >
              참여 신청
            </ConfirmButton>
          )
        }
      </ClassCardSection>
    </div>
  );
}

function ClassCardSection({
  title,
  classes,
  empty,
  children,
}: {
  title: string;
  classes: StudentClassCard[];
  empty?: string;
  children: (cls: StudentClassCard) => ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">
        {title} <span className="text-sm font-normal text-slate-400">{classes.length}</span>
      </h2>
      {classes.length === 0 ? (
        <p className="card text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {classes.map((cls) => (
            <li key={cls.id} className="card flex flex-col gap-2" data-testid="class-card">
              <div>
                {cls.term && <p className="text-xs text-slate-500">{cls.term}</p>}
                <p className="text-lg font-semibold">{cls.name}</p>
                <p className="text-sm text-slate-600">{cls.professor_name} 교수 · 학생 {cls.approved_count}명</p>
              </div>
              {cls.description && <p className="line-clamp-3 text-sm whitespace-pre-wrap text-slate-500">{cls.description}</p>}
              <div className="mt-auto pt-2">{children(cls)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
