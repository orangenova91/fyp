export function ClassFields({ defaults }: { defaults?: { name: string; term: string; description: string } }) {
  return (
    <>
      <div>
        <label htmlFor="class-name" className="label">수업 이름</label>
        <input
          id="class-name"
          name="name"
          required
          defaultValue={defaults?.name}
          className="input"
          placeholder="예: 캡스톤 디자인 (홍길동 교수 연구실)"
        />
      </div>
      <div>
        <label htmlFor="class-term" className="label">학기 (선택)</label>
        <input id="class-term" name="term" defaultValue={defaults?.term} className="input" placeholder="예: 2026-2학기" />
      </div>
      <div>
        <label htmlFor="class-description" className="label">소개 (선택)</label>
        <textarea
          id="class-description"
          name="description"
          rows={3}
          defaultValue={defaults?.description}
          className="input"
          placeholder="학생들이 수업 목록에서 보게 될 설명입니다."
        />
      </div>
    </>
  );
}
