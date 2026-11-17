"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncementAction } from "@/app/actions/announcements";
import { StatefulForm } from "@/components/stateful-form";
import type { FormState } from "@/lib/forms";

export function CreateAnnouncementModal({ classId }: { classId: number }) {
  const router = useRouter();
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

  async function action(prev: FormState, formData: FormData): Promise<FormState> {
    const result = await createAnnouncementAction(classId, prev, formData);
    if (result?.success) {
      setOpen(false);
      router.refresh();
    }
    return result;
  }

  return (
    <>
      <button type="button" className="btn-secondary w-full justify-start sm:w-auto" onClick={() => setOpen(true)}>
        새 공지사항
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
                새 공지사항
              </h2>
              <p className="mt-1 text-sm text-slate-500">수업 게시판에 올릴 공지를 작성하세요.</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setOpen(false)}
            >
              닫기
            </button>
          </div>
          <StatefulForm action={action} submitLabel="공지 등록" pendingLabel="등록 중…" resetOnSuccess>
            <div>
              <label htmlFor="announcement-title" className="label">
                제목
              </label>
              <input
                id="announcement-title"
                name="title"
                required
                className="input"
                placeholder="예: 11/18 중간발표 일정 안내"
              />
            </div>
            <div>
              <label htmlFor="announcement-body" className="label">
                내용
              </label>
              <textarea id="announcement-body" name="body" required rows={6} className="input" placeholder="내용" />
            </div>
          </StatefulForm>
        </div>
      </dialog>
    </>
  );
}
