"use client";

import { Modal } from "./Modal";
import type { NewsItemDTO } from "@/lib/types";

export function NewsPreviewModal({
  item,
  translatedTitle,
  translatedDescription,
  loading,
  failed,
  onClose,
}: {
  item: NewsItemDTO;
  translatedTitle: string | null;
  translatedDescription: string | null;
  loading: boolean;
  failed: boolean;
  onClose: () => void;
}) {
  return (
    <Modal title={`${item.source} 기사 미리보기`} onClose={onClose}>
      {loading ? (
        <div className="empty">번역 중...</div>
      ) : failed ? (
        <div className="empty">번역을 불러오지 못했습니다. 원문을 확인해주세요.</div>
      ) : (
        <>
          <div className="news-preview-title">{translatedTitle}</div>
          {translatedDescription && (
            <div className="news-preview-desc">{translatedDescription}</div>
          )}
        </>
      )}
      <div className="news-preview-original">
        <div className="news-preview-original-label">원문</div>
        <div className="news-preview-original-title">{item.title}</div>
      </div>
      <div className="modal-actions" style={{ justifyContent: "flex-end" }}>
        <button className="btn-mini" onClick={() => window.open(item.link, "_blank")}>
          원문 보기 ({item.source})
        </button>
      </div>
    </Modal>
  );
}
