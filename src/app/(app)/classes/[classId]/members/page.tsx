import { resetMemberPasswordAction, setMemberStatusAction } from "@/app/actions/classes";
import { ConfirmButton } from "@/components/confirm-button";
import { JoinCode } from "@/components/join-code";
import { StatefulForm } from "@/components/stateful-form";
import { parseId, requireClassProfessor } from "@/lib/access";
import { formatJoinCode, listMembers, type Member } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { MIN_PASSWORD_LENGTH } from "@/lib/forms";

export default async function MembersPage({ params }: PageProps<"/classes/[classId]/members">) {
  const { cls } = await requireClassProfessor(parseId((await params).classId));
  const members = await listMembers(cls.id);
  const pending = members.filter((m) => m.status === "pending");
  const approved = members.filter((m) => m.status === "approved");
  const rejected = members.filter((m) => m.status === "rejected");
  const setStatus = (m: Member, status: "approved" | "rejected") =>
    setMemberStatusAction.bind(null, cls.id, m.id, status);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          참여 신청 <span className="text-sm font-normal text-slate-400">{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <p className="card text-sm text-slate-500">대기 중인 참여 신청이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((m) => (
              <li key={m.id} className="card flex flex-wrap items-center justify-between gap-3" data-testid="pending-member">
                <MemberInfo member={m} note={`신청 ${formatDateTime(m.requested_at)}`} />
                <div className="flex gap-2">
                  <ConfirmButton action={setStatus(m, "approved")} className="btn-primary" pendingLabel="처리 중…">
                    승인
                  </ConfirmButton>
                  <ConfirmButton
                    action={setStatus(m, "rejected")}
                    confirmMessage={`${m.name} 학생의 참여 신청을 거절할까요? 거절된 학생은 수업 코드로만 다시 들어올 수 있습니다.`}
                    className="btn-secondary"
                  >
                    거절
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          참여 중인 학생 <span className="text-sm font-normal text-slate-400">{approved.length}</span>
        </h2>
        {approved.length === 0 ? (
          <p className="card text-sm text-slate-500">
            아직 참여한 학생이 없습니다. 수업 코드 <JoinCode code={formatJoinCode(cls.join_code)} />를 학생들에게
            안내해 주세요.
          </p>
        ) : (
          <ul className="space-y-2">
            {approved.map((m) => (
              <li key={m.id} className="card space-y-3" data-testid="approved-member">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <MemberInfo
                    member={m}
                    note={m.joined_via === "code" ? "수업 코드로 참여" : "신청 후 승인"}
                  />
                  <ConfirmButton
                    action={setStatus(m, "rejected")}
                    confirmMessage={`${m.name} 학생을 수업에서 제외할까요? 제출물은 보존되며, 학생은 수업 코드로만 다시 들어올 수 있습니다.`}
                    className="btn-secondary"
                  >
                    수업에서 제외
                  </ConfirmButton>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-900">
                    비밀번호 재설정
                  </summary>
                  <StatefulForm
                    action={resetMemberPasswordAction.bind(null, cls.id, m.id)}
                    submitLabel="재설정"
                    resetOnSuccess
                    className="mt-3 flex flex-wrap items-start gap-2"
                  >
                    <input
                      name="password"
                      type="text"
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      autoComplete="off"
                      aria-label="새 비밀번호"
                      placeholder={`새 비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)`}
                      className="input max-w-64"
                    />
                  </StatefulForm>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      {rejected.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            거절 · 제외된 학생 <span className="text-sm font-normal text-slate-400">{rejected.length}</span>
          </h2>
          <ul className="space-y-2">
            {rejected.map((m) => (
              <li key={m.id} className="card flex flex-wrap items-center justify-between gap-3" data-testid="rejected-member">
                <MemberInfo member={m} note={m.decided_at ? `처리 ${formatDateTime(m.decided_at)}` : undefined} />
                <ConfirmButton action={setStatus(m, "approved")} className="btn-secondary" pendingLabel="처리 중…">
                  다시 승인
                </ConfirmButton>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MemberInfo({ member, note }: { member: Member; note?: string }) {
  return (
    <div>
      <p className="font-medium">
        {member.name} <span className="text-sm font-normal text-slate-500">{member.email}</span>
      </p>
      <p className="text-sm text-slate-500">
        {[member.project_title ?? "프로젝트 주제 미등록", note].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}
