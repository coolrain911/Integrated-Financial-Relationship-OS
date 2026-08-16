"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { ColumnDTO } from "@/lib/types";
import { COLUMN_CATEGORY_OPTIONS } from "@/lib/options";

export function ColumnModal({
  columnId,
  onClose,
  onSaved,
  onCreated,
  onDeleted,
}: {
  columnId: number | null;
  onClose: () => void;
  onSaved: (column: ColumnDTO) => void;
  onCreated: (column: ColumnDTO) => void;
  onDeleted: (columnId: number) => void;
}) {
  const isNew = columnId === null;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [num, setNum] = useState("");
  const [title, setTitle] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [file, setFile] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const res = await fetch(`/api/columns/${columnId}`);
      const data: ColumnDTO = await res.json();
      setNum(data.num !== null ? String(data.num) : "");
      setTitle(data.title ?? "");
      setCategories(data.categories ?? []);
      setFile(data.file ?? "");
      setContent(data.content ?? "");
      setLink(data.link ?? "");
      setLoading(false);
    })();
  }, [columnId, isNew]);

  function toggleCategory(cat: string) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function handleSave() {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        num: num.trim() ? Number(num) : null,
        title,
        categories,
        file: file || null,
        content: content || null,
        link: link || null,
      };
      const res = await fetch(isNew ? "/api/columns" : `/api/columns/${columnId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("저장 실패");
      const data: ColumnDTO = await res.json();
      if (isNew) {
        onCreated(data);
      } else {
        onSaved(data);
      }
      onClose();
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew) return;
    if (!confirm("이 칼럼을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/columns/${columnId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      onDeleted(columnId);
      onClose();
    } catch {
      alert("삭제에 실패했습니다.");
      setDeleting(false);
    }
  }

  return (
    <Modal title={isNew ? "새 칼럼 추가" : "칼럼 정보"} onClose={onClose}>
      {loading ? (
        <div className="empty">불러오는 중...</div>
      ) : (
        <>
          <div className="form-grid">
            <label className="form-field">
              <span>번호</span>
              <input value={num} onChange={(e) => setNum(e.target.value)} />
            </label>
            <label className="form-field form-field-wide">
              <span>제목</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="form-field">
              <span>파일명</span>
              <input value={file} onChange={(e) => setFile(e.target.value)} />
            </label>
            <label className="form-field form-field-wide">
              <span>카테고리 (복수 선택 가능)</span>
              <div className="filter-chip-row">
                {COLUMN_CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`filter-chip${categories.includes(cat) ? " active" : ""}`}
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </label>
            <label className="form-field form-field-wide">
              <span>
                링크 (선택){" "}
                {link && (
                  <a href={link} target="_blank" rel="noreferrer" className="link-cell">
                    새 탭에서 열기 ↗
                  </a>
                )}
              </span>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="form-field form-field-wide">
              <span>본문</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                placeholder="칼럼 본문 내용을 붙여넣어 주세요."
              />
            </label>
          </div>

          <div className="modal-actions" style={{ justifyContent: isNew ? "flex-end" : "space-between" }}>
            {!isNew && (
              <button className="btn-danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            )}
            <button className="btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
