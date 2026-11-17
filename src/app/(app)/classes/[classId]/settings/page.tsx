import { deleteClassAction, regenerateCodeAction, updateClassAction } from "@/app/actions/classes";
import { ClassFields } from "@/components/class-fields";
import { ConfirmButton } from "@/components/confirm-button";
import { JoinCode } from "@/components/join-code";
import { StatefulForm } from "@/components/stateful-form";
import { parseId, requireClassProfessor } from "@/lib/access";
import { formatJoinCode } from "@/lib/data";

export default async function ClassSettingsPage({ params }: PageProps<"/classes/[classId]/settings">) {
  const { cls } = await requireClassProfessor(parseId((await params).classId));

  return (
    <div className="max-w-xl space-y-6">
      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">수업 정보</h2>
        <StatefulForm action={updateClassAction.bind(null, cls.id)} submitLabel="저장">
          <ClassFields defaults={cls} />
        </StatefulForm>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">수업 코드</h2>
        <p className="text-sm text-slate-600">
          현재 코드 <JoinCode code={formatJoinCode(cls.join_code)} />
        </p>
        <p className="text-sm text-slate-500">
          코드가 외부에 알려졌다면 새로 발급하세요. 이전 코드는 즉시 사용할 수 없게 되며, 이미 참여한 학생에게는 영향이
          없습니다.
        </p>
        <ConfirmButton
          action={regenerateCodeAction.bind(null, cls.id)}
          confirmMessage="새 수업 코드를 발급할까요? 이전 코드는 더 이상 사용할 수 없습니다."
          className="btn-secondary"
        >
          코드 새로 발급
        </ConfirmButton>
      </section>

      <section className="card space-y-3 border-red-200">
        <h2 className="text-lg font-semibold text-red-700">수업 삭제</h2>
        <p className="text-sm text-slate-600">
          과제, 학생 제출물, 피드백, 공지와 첨부파일이 모두 영구 삭제됩니다. 학생 계정은 삭제되지 않습니다.
        </p>
        <ConfirmButton
          action={deleteClassAction.bind(null, cls.id)}
          confirmMessage={`'${cls.name}' 수업과 모든 자료를 영구 삭제합니다. 되돌릴 수 없습니다. 계속할까요?`}
        >
          수업 삭제
        </ConfirmButton>
      </section>
    </div>
  );
}
