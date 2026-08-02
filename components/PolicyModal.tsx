"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { PolicyDTO } from "@/lib/types";
import { computePeriodYears } from "@/lib/mapping";
import { formatMoneyInput, parseMoneyInput } from "@/lib/format";
import {
  ANNUITY_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  LIFE_TYPE_OPTIONS,
  OPTION_TYPE_OPTIONS,
  PREMIUM_METHOD_OPTIONS,
} from "@/lib/options";

function toInputStr(v: number | string | null): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function toMoneyInputStr(v: number | string | null): string {
  return formatMoneyInput(toInputStr(v));
}

function MoneyField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const isNA = value.trim().toLowerCase() === "na";
  return (
    <div className="input-money-wrap">
      {!isNA && <span className="input-money-prefix">$</span>}
      <input value={value} onChange={(e) => onChange(formatMoneyInput(e.target.value))} />
    </div>
  );
}

const OTHER = "기타 (직접 입력)";

export function PolicyModal({
  policyId,
  personId,
  onClose,
  onSaved,
  onCreated,
  onDeleted,
  carrierOptions,
  productOptions,
}: {
  policyId: number | null;
  personId?: number;
  onClose: () => void;
  onSaved: (policy: PolicyDTO) => void;
  onCreated: (policy: PolicyDTO) => void;
  onDeleted: (policyId: number) => void;
  carrierOptions: string[];
  productOptions: string[];
}) {
  const isNew = policyId === null;
  const [policy, setPolicy] = useState<PolicyDTO | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [policyNumber, setPolicyNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [carrierChoice, setCarrierChoice] = useState("");
  const [carrierCustom, setCarrierCustom] = useState("");
  const [productChoice, setProductChoice] = useState("");
  const [productCustom, setProductCustom] = useState("");
  const [category, setCategory] = useState<string>("Life");
  const [lifeType, setLifeType] = useState("");
  const [optionType, setOptionType] = useState("");
  const [deathBenefit, setDeathBenefit] = useState("");
  const [totalPremium, setTotalPremium] = useState("");
  const [premiumMethod, setPremiumMethod] = useState("");
  const [annualPremium, setAnnualPremium] = useState("");
  const [annuityType, setAnnuityType] = useState("");
  const [initialPremium, setInitialPremium] = useState("");
  const [additionalPremium, setAdditionalPremium] = useState("");
  const [accountValue, setAccountValue] = useState("");
  const [surrenderValue, setSurrenderValue] = useState("");
  const [loanOrWithdrawal, setLoanOrWithdrawal] = useState(false);
  const [surrendered, setSurrendered] = useState(false);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [policyChanged, setPolicyChanged] = useState(false);
  const [changeNeeded, setChangeNeeded] = useState(false);
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const res = await fetch(`/api/policies/${policyId}`);
      const data: PolicyDTO = await res.json();
      setPolicy(data);
      setPolicyNumber(data.policyNumber ?? "");
      setIssueDate(data.issueDate ?? "");
      const carrierVal = data.carrier;
      if (carrierVal && !carrierOptions.includes(carrierVal)) {
        setCarrierChoice(OTHER);
        setCarrierCustom(carrierVal);
      } else {
        setCarrierChoice(carrierVal ?? "");
        setCarrierCustom("");
      }
      const productVal = data.product;
      if (productVal && !productOptions.includes(productVal)) {
        setProductChoice(OTHER);
        setProductCustom(productVal);
      } else {
        setProductChoice(productVal ?? "");
        setProductCustom("");
      }
      setCategory(data.category);
      setLifeType(data.lifeType ?? "");
      setOptionType(data.optionType ?? "");
      setDeathBenefit(toMoneyInputStr(data.deathBenefit));
      setTotalPremium(toMoneyInputStr(data.totalPremium));
      setPremiumMethod(data.premiumMethod ?? "");
      setAnnualPremium(toMoneyInputStr(data.annualPremium));
      setAnnuityType(data.annuityType ?? "");
      setInitialPremium(toMoneyInputStr(data.initialPremium));
      setAdditionalPremium(toMoneyInputStr(data.additionalPremium));
      setAccountValue(toMoneyInputStr(data.accountValue));
      setSurrenderValue(toMoneyInputStr(data.surrenderValue));
      setLoanOrWithdrawal(Boolean(data.loanOrWithdrawal));
      setSurrendered(data.surrendered);
      setNeedsAttention(data.needsAttention);
      setPolicyChanged(data.policyChanged);
      setChangeNeeded(data.changeNeeded);
      setComment(data.comment ?? "");
      setNote(data.note ?? "");
      setReviewed(data.reviewed);
      setLoading(false);
    })();
    // Deliberately excludes carrierOptions/productOptions: this should only
    // re-run when a different policy is opened, not whenever the parent's
    // derived option lists change (e.g. right after this same save).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId, isNew]);

  async function handleSave() {
    setSaving(true);
    try {
      const carrier = carrierChoice === OTHER ? carrierCustom.trim() || null : carrierChoice || null;
      const product = productChoice === OTHER ? productCustom.trim() || null : productChoice || null;
      const payload = {
        policyNumber: policyNumber || null,
        issueDate: issueDate || null,
        carrier,
        product,
        category,
        lifeType: category === "Life" ? lifeType || null : null,
        optionType: category === "Life" ? optionType || null : null,
        deathBenefit: category === "Life" ? parseMoneyInput(deathBenefit) || null : null,
        totalPremium: category === "Life" ? parseMoneyInput(totalPremium) || null : null,
        premiumMethod: category === "Life" ? premiumMethod || null : null,
        annualPremium: category === "Life" ? parseMoneyInput(annualPremium) || null : null,
        annuityType: category === "Annuity" ? annuityType || null : null,
        initialPremium: category === "Annuity" ? parseMoneyInput(initialPremium) || null : null,
        additionalPremium:
          category === "Annuity" ? parseMoneyInput(additionalPremium) || null : null,
        accountValue: parseMoneyInput(accountValue) || null,
        surrenderValue: parseMoneyInput(surrenderValue) || null,
        loanOrWithdrawal,
        comment: comment || null,
        note: note || null,
      };
      const res = await fetch(isNew ? "/api/policies" : `/api/policies/${policyId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isNew
            ? { personId, ...payload }
            : { ...payload, surrendered, needsAttention, policyChanged, changeNeeded, reviewed }
        ),
      });
      if (!res.ok) throw new Error("저장 실패");
      const data: PolicyDTO = await res.json();
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
    if (!confirm("이 정책을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/policies/${policyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      onDeleted(policyId);
      onClose();
    } catch {
      alert("삭제에 실패했습니다.");
      setDeleting(false);
    }
  }

  const periodYears = computePeriodYears(issueDate || null, new Date());

  return (
    <Modal title={isNew ? "새 정책 추가" : "정책 정보"} onClose={onClose}>
      {loading ? (
        <div className="empty">불러오는 중...</div>
      ) : (
        <>
          {policy && (
            <div className="modal-subtitle">
              {policy.lastName} {policy.firstName}
            </div>
          )}
          <div className="form-grid">
            <label className="form-field">
              <span>Policy Number</span>
              <input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Issued Date</span>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Period</span>
              <input value={periodYears !== null ? `${periodYears}년차` : "-"} disabled />
            </label>
            <label className="form-field">
              <span>회사 (Carrier)</span>
              <select value={carrierChoice} onChange={(e) => setCarrierChoice(e.target.value)}>
                <option value="">미입력</option>
                {carrierOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={OTHER}>{OTHER}</option>
              </select>
            </label>
            {carrierChoice === OTHER && (
              <label className="form-field">
                <span>회사 (직접 입력)</span>
                <input value={carrierCustom} onChange={(e) => setCarrierCustom(e.target.value)} />
              </label>
            )}
            <label className="form-field">
              <span>플랜 이름 (Product)</span>
              <select value={productChoice} onChange={(e) => setProductChoice(e.target.value)}>
                <option value="">미입력</option>
                {productOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value={OTHER}>{OTHER}</option>
              </select>
            </label>
            {productChoice === OTHER && (
              <label className="form-field">
                <span>플랜 이름 (직접 입력)</span>
                <input value={productCustom} onChange={(e) => setProductCustom(e.target.value)} />
              </label>
            )}
            <label className="form-field">
              <span>구분</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {category === "Life" ? (
            <>
              <div className="modal-section-title">Life 상세</div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Type</span>
                  <select value={lifeType} onChange={(e) => setLifeType(e.target.value)}>
                    <option value="">미입력</option>
                    {LIFE_TYPE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Option</span>
                  <select value={optionType} onChange={(e) => setOptionType(e.target.value)}>
                    <option value="">미입력</option>
                    {OPTION_TYPE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Death Benefit</span>
                  <MoneyField value={deathBenefit} onChange={setDeathBenefit} />
                </label>
                <label className="form-field">
                  <span>Total Premium</span>
                  <MoneyField value={totalPremium} onChange={setTotalPremium} />
                </label>
                <label className="form-field">
                  <span>Premium Method</span>
                  <select value={premiumMethod} onChange={(e) => setPremiumMethod(e.target.value)}>
                    <option value="">미입력</option>
                    {PREMIUM_METHOD_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Annual Premium</span>
                  <MoneyField value={annualPremium} onChange={setAnnualPremium} />
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="modal-section-title">Annuity 상세</div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Type</span>
                  <select value={annuityType} onChange={(e) => setAnnuityType(e.target.value)}>
                    <option value="">미입력</option>
                    {ANNUITY_TYPE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Initial Premium</span>
                  <MoneyField value={initialPremium} onChange={setInitialPremium} />
                </label>
                <label className="form-field">
                  <span>Additional Premium</span>
                  <MoneyField value={additionalPremium} onChange={setAdditionalPremium} />
                </label>
              </div>
            </>
          )}

          <div className="modal-section-title">공통</div>
          <div className="form-grid">
            <label className="form-field">
              <span>Account Value</span>
              <MoneyField value={accountValue} onChange={setAccountValue} />
            </label>
            <label className="form-field">
              <span>Surrender Value</span>
              <MoneyField value={surrenderValue} onChange={setSurrenderValue} />
            </label>
            <label className="form-field form-field-checkbox">
              <input
                type="checkbox"
                checked={loanOrWithdrawal}
                onChange={(e) => setLoanOrWithdrawal(e.target.checked)}
              />
              <span>Loan / Withdrawal 있음</span>
            </label>
            {!isNew && (
              <>
                <label className="form-field form-field-checkbox">
                  <input
                    type="checkbox"
                    checked={surrendered}
                    onChange={(e) => setSurrendered(e.target.checked)}
                  />
                  <span>계약해지</span>
                </label>
                <label className="form-field form-field-checkbox">
                  <input
                    type="checkbox"
                    checked={needsAttention}
                    onChange={(e) => setNeedsAttention(e.target.checked)}
                  />
                  <span>주의요망</span>
                </label>
                <label className="form-field form-field-checkbox">
                  <input
                    type="checkbox"
                    checked={policyChanged}
                    onChange={(e) => setPolicyChanged(e.target.checked)}
                  />
                  <span>정책변경</span>
                </label>
                <label className="form-field form-field-checkbox">
                  <input
                    type="checkbox"
                    checked={changeNeeded}
                    onChange={(e) => setChangeNeeded(e.target.checked)}
                  />
                  <span>변경필요</span>
                </label>
                <label className="form-field form-field-checkbox">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />
                  <span>검토완료</span>
                </label>
              </>
            )}
            <label className="form-field form-field-wide">
              <span>기타 주요 변동 사항</span>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
            </label>
            <label className="form-field form-field-wide">
              <span>메모</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </label>
          </div>

          {policy?.reviewReason && (
            <div className="row-note" style={{ color: "var(--danger)" }}>
              검토 필요 사유: {policy.reviewReason}
            </div>
          )}

          <div className="modal-actions" style={{ justifyContent: isNew ? "flex-end" : "space-between" }}>
            {!isNew && (
              <button className="btn-danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? "삭제 중..." : "정책 삭제"}
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
