# Financial Relationship OS

`financial_os_app.html`의 디자인/레이아웃/탭 구성을 그대로 유지하면서, 데이터가 실제로 영속되는
로컬 앱으로 만든 버전입니다. 백엔드는 FastAPI + SQLite이고, 프론트엔드는 기존 정적 페이지를
fetch API 기반으로 전환한 것입니다.

## 로컬 실행

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

브라우저에서 http://127.0.0.1:8000 을 열면 됩니다.

첫 실행 시 `app/data/full_data.json` (clients 163건, prospects 227명, columns 104편)을
SQLite 파일 `financial_os.db`에 자동으로 시딩합니다. 이 파일은 저장소 루트에 생성되며
git에는 커밋되지 않습니다 (`.gitignore` 참고). 데이터를 초기 상태로 되돌리고 싶다면
`financial_os.db`를 삭제하고 서버를 다시 시작하면 됩니다.

## 구현된 기능

1. **데이터 영속성** — SQLite 파일에 저장되어 서버를 재시작해도 유지됩니다.
2. **검토 완료 체크** — 각 client row의 체크박스를 누르면 즉시 저장되고, "검토 필요"
   목록/Today 탭에서 제외됩니다.
3. **메모 추가** — client row의 메모 입력창에서 자유롭게 입력 후 다른 곳을 클릭하면
   (blur) 저장됩니다.
4. **잠재고객 → 고객 전환** — Prospects 탭의 "고객으로 전환" 버튼을 누르면 해당
   레코드가 clients 테이블로 이동합니다 (정책/보험 관련 필드는 비어 있는 상태로 생성되며,
   이후 필요 시 직접 채울 수 있습니다).
5. **검색** — 기존과 동일하게 클라이언트 사이드에서 이름 기준으로 필터링합니다.
6. **생일(월/일) 입력** — client row에서 월/일 숫자 입력란에 값을 넣으면 저장됩니다.

## API

| Method | Path                              | 설명                                  |
|--------|-----------------------------------|---------------------------------------|
| GET    | `/api/clients`                    | 전체 클라이언트 (daysToAnniv 등 서버에서 매번 재계산) |
| PATCH  | `/api/clients/{id}`                | `reviewed`, `note`, `birthdayMonth`, `birthdayDay` 부분 업데이트 |
| GET    | `/api/prospects`                   | 전체 잠재고객                          |
| POST   | `/api/prospects/{id}/convert`      | 잠재고객 → 클라이언트 전환             |
| GET    | `/api/columns`                     | 재정칼럼 라이브러리                    |

`daysToAnniv`/`anniv`는 저장된 값이 아니라 `issueDate`의 월/일을 기준으로 매 요청마다
오늘 날짜 기준으로 재계산됩니다.

`needsReview`/`reviewReason`은 원본 데이터(`full_data.json`)에 이미 계산되어 들어있는
값을 그대로 보존합니다. "AV가 설계예상보다 낮음 / 대출 존재" 로직을 서버에서 새로
재계산하려면 설계예상 금액·대출 여부 같은 원본 입력값이 필요한데, 현재 데이터 소스에는
계산 결과만 있고 그 원본 입력값이 포함되어 있지 않습니다. 추후 그 값들이 스키마에
추가되면 `app/main.py`에 재계산 로직을 붙이면 됩니다.

## 보안 참고

- 로컬 전용 앱이며 별도 인증(로그인) 기능은 없습니다. 외부에 배포할 경우 인증을 반드시
  추가해야 합니다.
- 비밀번호 등 민감 정보는 어디에도 저장하지 않습니다.
