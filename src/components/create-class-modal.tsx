"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createClassAction } from "@/app/actions/classes";
import { ClassFields } from "@/components/class-fields";
import { StatefulForm } from "@/components/stateful-form";

export function CreateClassModal({ buttonLabel = "수업 개설하기" }: { buttonLabel?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        {buttonLabel}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/40"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
      >
        <div className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                수업 개설
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                수업을 만들면 수업 코드가 생성됩니다. 코드를 학생들에게 안내하면 바로 수업에 들어올 수 있습니다.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setOpen(false)}
            >
              닫기
            </button>
          </div>
          <StatefulForm action={createClassAction} submitLabel="수업 개설하기" pendingLabel="개설 중…">
            <ClassFields />
          </StatefulForm>
        </div>
      </dialog>
    </>
  );
}
