"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { LicenseCertCategory, LicenseCertDTO } from "@/lib/types";
import { LICENSE_CERT_CATEGORY_OPTIONS } from "@/lib/options";

export function LicenseCertModal({
  itemId,
  onClose,
  onSaved,
  onCreated,
  onDeleted,
}: {
  itemId: number | null;
  onClose: () => void;
  onSaved: (item: LicenseCertDTO) => void;
  onCreated: (item: LicenseCertDTO) => void;
  onDeleted: (itemId: number) => void;
}) {
  const isNew = itemId === null;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LicenseCertCategory>("License");
  const [issuer, setIssuer] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const res = await fetch(`/api/licenses/${itemId}`);
      const data: LicenseCertDTO = await res.json();
      setTitle(data.title ?? "");
      setCategory(data.category);
      setIssuer(data.issuer ?? "");
      setIssueDate(data.issueDate ?? "");
      setExpiryDate(data.expiryDate ?? "");
      setReferenceNo(data.referenceNo ?? "");
      setLink(data.link ?? "");
      setNote(data.note ?? "");
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
      const payload = {
        title,
        category,
        issuer: issuer || null,
        issueDate: issueDate || null,
        expiryDate: expiryDate || null,
        referenceNo: referenceNo || null,
        link: link || null,
        note: note || null,
      };
      const res = await fetch(isNew ? "/api/licenses" : `/api/licenses/${itemId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("저장 실패");
      const data: LicenseCertDTO = await res.json();
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
      const res = await fetch(`/api/licenses/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      onDeleted(itemId);
      onClose();
    } catch {
      alert("삭제에 실패했습니다.");
      setDeleting(false);
    }
  }

  return (
    <Modal title={isNew ? "새 License & Certificate" : "License & Certificate 정보"} onClose={onClose}>
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
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LicenseCertCategory)}
              >
                {LICENSE_CERT_CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>발급기관</span>
              <input value={issuer} onChange={(e) => setIssuer(e.target.value)} />
            </label>
            <label className="form-field">
              <span>발급일</span>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </label>
            <label className="form-field">
              <span>만료일</span>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </label>
            <label className="form-field">
              <span>번호</span>
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
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
                placeholder="https://... (스캔본/드라이브 링크)"
              />
            </label>
            <label className="form-field form-field-wide">
              <span>비고</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
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
