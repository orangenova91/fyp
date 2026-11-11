import {
  createStudent,
  deleteStudent,
  resetStudentPassword,
  updateStudent,
} from "@/app/actions/students";
import { ConfirmButton } from "@/components/confirm-button";
import { StatefulForm } from "@/components/stateful-form";
import { requireProfessor } from "@/lib/auth";
import { listStudents } from "@/lib/data";
import { MIN_PASSWORD_LENGTH } from "@/lib/forms";

export default async function StudentsPage() {
  await requireProfessor();
  const students = await listStudents();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">학생 관리</h1>

      <section className="card">
        <h2 className="mb-1 text-lg font-semibold">학생 추가</h2>
        <p className="mb-4 text-sm text-slate-500">
          계정을 만든 뒤 이메일과 초기 비밀번호를 학생에게 전달하세요. 학생은 로그인 후 &lsquo;내 계정&rsquo;에서 비밀번호를 바꿀 수 있습니다.
        </p>
        <StatefulForm action={createStudent} submitLabel="학생 추가" resetOnSuccess className="grid gap-3 sm:grid-cols-2">
          <input name="name" required className="input" placeholder="이름" />
          <input name="email" type="email" required className="input" placeholder="이메일" />
          <input
            name="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="input"
            placeholder={`초기 비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)`}
          />
          <input name="projectTitle" className="input" placeholder="프로젝트 주제 (선택)" />
        </StatefulForm>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          등록된 학생 <span className="text-sm font-normal text-slate-400">{students.length}명</span>
        </h2>
        {students.length === 0 ? (
          <p className="card text-sm text-slate-500">아직 등록된 학생이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {students.map((student) => (
              <li key={student.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-slate-500">
                      {student.email}
                      {student.project_title && ` · ${student.project_title}`}
                    </p>
                  </div>
                  <ConfirmButton
                    action={deleteStudent.bind(null, student.id)}
                    confirmMessage={`${student.name} 학생을 삭제하면 제출물과 피드백도 모두 삭제됩니다. 계속할까요?`}
                  >
                    삭제
                  </ConfirmButton>
                </div>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-800">
                    정보 수정 / 비밀번호 재설정
                  </summary>
                  <div className="mt-3 grid gap-6 sm:grid-cols-2">
                    <StatefulForm action={updateStudent.bind(null, student.id)} submitLabel="저장" className="space-y-2">
                      <input name="name" required defaultValue={student.name} className="input" />
                      <input
                        name="projectTitle"
                        defaultValue={student.project_title ?? ""}
                        className="input"
                        placeholder="프로젝트 주제"
                      />
                    </StatefulForm>
                    <StatefulForm
                      action={resetStudentPassword.bind(null, student.id)}
                      submitLabel="비밀번호 재설정"
                      resetOnSuccess
                      className="space-y-2"
                    >
                      <input
                        name="password"
                        required
                        minLength={MIN_PASSWORD_LENGTH}
                        className="input"
                        placeholder="새 비밀번호"
                      />
                    </StatefulForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
