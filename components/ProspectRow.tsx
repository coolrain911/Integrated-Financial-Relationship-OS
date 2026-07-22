"use client";

import { useState } from "react";
import type { ProspectDTO } from "@/lib/types";

export function ProspectRow({
  prospect,
  onConverted,
}: {
  prospect: ProspectDTO;
  onConverted: (prospectId: number) => void;
}) {
  const [converting, setConverting] = useState(false);

  async function convert() {
    setConverting(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/convert`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("전환 실패");
      onConverted(prospect.id);
    } catch {
      alert("전환에 실패했습니다.");
      setConverting(false);
    }
  }

  return (
    <div className="row-card">
      <div className="row-card-top">
        <div>
          <div className="row-name">{prospect.name || "(이름 미상)"}</div>
          <div className="row-meta">
            {prospect.email || ""}
            {prospect.phone ? ` · ${prospect.phone}` : ""}
          </div>
          {prospect.note && <div className="row-note">{prospect.note}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="pill accent">{prospect.segment}</span>
          <button className="btn-mini" disabled={converting} onClick={convert}>
            {converting ? "전환 중..." : "고객으로 전환"}
          </button>
        </div>
      </div>
    </div>
  );
}
