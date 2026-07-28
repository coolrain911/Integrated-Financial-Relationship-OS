"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { KnowledgeItemDTO } from "@/lib/types";
import { KNOWLEDGE_CATEGORY_PRESETS } from "@/lib/options";

export function KnowledgeItemModal({
  itemId,
  onClose,
  onSaved,
  onCreated,
  onDeleted,
}: {
  itemId: number | null;
  onClose: () => void;
  onSaved: (item: KnowledgeItemDTO) => void;
  onCreated: (item: KnowledgeItemDTO) => void;
  onDeleted: (itemId: number) => void;
}) {
  const isNew = itemId === null;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [categoryChoice, setCategoryChoice] = useState("");
  const [categoryCustom, setCategoryCustom] = useState("");
  const [itemDate, setItemDate] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const res = await fetch(`/api/knowledge-items/${itemId}`);
      const data: KnowledgeItemDTO = await res.json();
      setTitle(data.title ?? "");
      const cat = data.category;
      if (cat && !KNOWLEDGE_CATEGORY_PRESETS.includes(cat)) {
        setCategoryChoice("기타");
        setCategoryCustom(cat);
      } else {
        setCategoryChoice(cat ?? "");
        setCategoryCustom("");
      }
      setItemDate(data.itemDate ?? "");
      setContent(data.content ?? "");
      setLink(data.link ?? "");
      setLoading(false);
    })();
  }, [itemId, isNew]);

  async function handleSave() {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const category = categoryChoice === "기타" ? categoryCustom.trim() || null : categoryChoice || null;
      const payload = {
        title,
        category,
        itemDate: itemDate || null,
        content: content || null,
        link: link || null,
      };
      const res = await fetch(isNew ? "/api/knowledge-items" : `/api/knowledge-items/${itemId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("저장 실패");
      const data: KnowledgeItemDTO = await res.json();
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
    if (!confirm("이 항목을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/knowledge-items/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      onDeleted(itemId);
      onClose();
    } catch {
      alert("삭제에 실패했습니다.");
      setDeleting(false);
    }
  }

  return (
    <Modal title={isNew ? "새 지식 창고 항목" : "지식 창고 항목"} onClose={onClose}>
      {loading ? (
        <div className="empty">불러오는 중...</div>
      ) : (
        <>
          <div className="form-grid">
            <label className="form-field form-field-wide">
              <span>제목</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="form-field">
              <span>분류</span>
              <select value={categoryChoice} onChange={(e) => setCategoryChoice(e.target.value)}>
                <option value="">미입력</option>
                {KNOWLEDGE_CATEGORY_PRESETS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {categoryChoice === "기타" && (
              <label className="form-field">
                <span>분류 (직접 입력)</span>
                <input value={categoryCustom} onChange={(e) => setCategoryCustom(e.target.value)} />
              </label>
            )}
            <label className="form-field">
              <span>날짜</span>
              <input type="date" value={itemDate} onChange={(e) => setItemDate(e.target.value)} />
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
              <span>내용</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder="답변 내용이나 관련 정보를 정리해 주세요."
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
