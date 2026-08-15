"use client";

import { Modal } from "./Modal";
import { PolicyRow } from "./PolicyRow";
import type { PolicyDTO } from "@/lib/types";

export function PolicyListModal({
  title,
  items,
  unselected,
  onToggleSelect,
  emailCount,
  onEmailClick,
  onOpenPerson,
  onOpenPolicy,
  onSaved,
  onClose,
}: {
  title: string;
  items: PolicyDTO[];
  unselected: Set<number>;
  onToggleSelect: (id: number) => void;
  emailCount: number;
  onEmailClick: () => void;
  onOpenPerson: (personId: number) => void;
  onOpenPolicy: (policyId: number) => void;
  onSaved: (updated: PolicyDTO) => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="modal-actions" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn-mini" disabled={emailCount === 0} onClick={onEmailClick}>
          이메일 보내기 ({emailCount})
        </button>
      </div>
      {items.length ? (
        items.map((p) => (
          <PolicyRow
            key={p.id}
            policy={p}
            onOpenPerson={onOpenPerson}
            onOpenPolicy={onOpenPolicy}
            onSaved={onSaved}
            selected={!unselected.has(p.id)}
            onToggleSelect={() => onToggleSelect(p.id)}
            compact
          />
        ))
      ) : (
        <div className="empty">항목 없음</div>
      )}
    </Modal>
  );
}
