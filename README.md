# Financial Relationship OS

`financial_os_app.html`의 디자인/레이아웃/탭 구성을 그대로 유지하면서, 데이터가 실제로 영속되는
앱으로 만든 버전입니다. **Next.js (App Router) + Supabase** 스택으로, SDWGA-APP과 동일한
방식(Next.js + Supabase, Vercel 배포)으로 구축되어 있습니다.

## 로컬 개발 설정

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. Supabase 대시보드의 SQL Editor에서 `supabase/schema.sql`을 실행해 테이블
   (`clients`, `prospects`, `columns_lib`)과 `convert_prospect` 함수를 만듭니다.
3. 이어서 `supabase/seed.sql`을 실행하면 초기 데이터(clients 163건, prospects 227명,
   columns 104편)가 채워집니다. 빈 DB에 한 번만 실행하세요.
4. `.env.local.example`을 `.env.local`로 복사하고, Supabase 대시보드의
   **Project Settings > API**에서 값을 채웁니다:
   - `SUPABASE_URL` — Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — service_role secret key (anon key 아님)

   두 값 모두 서버에서만 쓰이고 브라우저에는 절대 노출되지 않습니다 (`NEXT_PUBLIC_` 접두사를
   붙이지 않은 이유입니다) — 이 앱은 브라우저가 Supabase에 직접 접속하지 않고, 항상 이
   앱의 `/api/*` 라우트를 거쳐 service role 키로만 접근합니다.
5. 의존성 설치 후 개발 서버 실행:
   ```bash
   npm install
   npm run dev
   ```
6. 브라우저에서 http://localhost:3000 을 엽니다.

## 배포 (Vercel)

1. 이 저장소를 Vercel 프로젝트로 import 합니다 (Vercel 대시보드 > Add New > Project).
2. 위 2단계의 `.env.local`과 같은 두 값(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)을
   Vercel 프로젝트의 Environment Variables에 등록합니다.
3. Deploy — 이후 `main` 브랜치에 push할 때마다 자동으로 재배포됩니다.

## 구현된 기능

1. **데이터 영속성** — Supabase(Postgres)에 저장되어 언제 어디서 접속해도 유지됩니다.
2. **검토 완료 체크** — 각 client row의 체크박스를 누르면 즉시 저장되고, "검토 필요"
   목록/Today 탭에서 제외됩니다.
3. **메모 추가** — client row의 메모 입력창에서 자유롭게 입력 후 다른 곳을 클릭하면
   (blur) 저장됩니다.
4. **잠재고객 → 고객 전환** — Prospects 탭의 "고객으로 전환" 버튼을 누르면 해당
   레코드가 clients 테이블로 이동합니다 (`convert_prospect` Postgres 함수로 insert+delete가
   하나의 트랜잭션으로 원자적으로 처리됩니다). 정책/보험 관련 필드는 비어 있는 상태로
   생성되며, 이후 필요 시 직접 채울 수 있습니다.
5. **검색** — 클라이언트 사이드에서 이름 기준으로 필터링합니다.
6. **생일(월/일) 입력** — client row에서 월/일 숫자 입력란에 값을 넣으면 저장됩니다.

## API

| Method | Path                              | 설명                                  |
|--------|-----------------------------------|---------------------------------------|
| GET    | `/api/clients`                    | 전체 클라이언트 (daysToAnniv 등 요청마다 재계산) |
| PATCH  | `/api/clients/{id}`                | `reviewed`, `note`, `birthdayMonth`, `birthdayDay` 부분 업데이트 |
| GET    | `/api/prospects`                   | 전체 잠재고객                          |
| POST   | `/api/prospects/{id}/convert`      | 잠재고객 → 클라이언트 전환 (`convert_prospect` RPC 호출) |
| GET    | `/api/columns`                     | 재정칼럼 라이브러리                    |

`daysToAnniv`/`anniv`는 저장된 값이 아니라 `issueDate`의 월/일을 기준으로 매 요청마다
오늘 날짜 기준으로 재계산됩니다 (`lib/clientMapping.ts`의 `computeAnniversary`).

`needsReview`/`reviewReason`은 원본 데이터(`full_data.json`)에 이미 계산되어 들어있는
값을 그대로 보존합니다. "AV가 설계예상보다 낮음 / 대출 존재" 로직을 서버에서 새로
재계산하려면 설계예상 금액·대출 여부 같은 원본 입력값이 필요한데, 현재 데이터 소스에는
계산 결과만 있고 그 원본 입력값이 포함되어 있지 않습니다. 추후 그 값들이 스키마에
추가되면 API 라우트에 재계산 로직을 붙이면 됩니다.

Clients 탭은 last name(이름이 "성 이름" 순서로 저장되어 있어 첫 단어) 기준
대소문자 무시 알파벳순으로 정렬됩니다 (`lib/clientMapping.ts`의 `compareByLastName`).

## 검증 상태

이 코드는 다음까지 검증되었습니다:
- `npm run build` 타입체크/빌드 성공
- `supabase/schema.sql` + `supabase/seed.sql`을 실제 Postgres에 적용해 163/227/104건
  정상 삽입 확인, `convert_prospect` 함수 직접 SQL 호출로 원자적 동작 확인
- 기념일 계산(윤년 2/29 포함), last-name 정렬, `faceAmount`/`premium`/`av`의 `'na'`/숫자/`null`
  처리 로직을 단위 테스트로 검증

다만 실제 Supabase 프로젝트에 연결해 브라우저로 클릭해보는 종단간 테스트는
이 코드를 작성한 환경에서는 수행하지 못했습니다 (Docker 미지원으로 로컬에서 Supabase
스택을 띄울 수 없었음). 위 로컬 개발 설정대로 연결하신 뒤 한 번 실제로 확인해 주세요.

## 보안 참고

- 별도 인증(로그인) 기능은 없습니다. 배포 후 외부에 공개할 경우 인증을 추가하는 것을
  권장합니다.
- 비밀번호 등 민감 정보는 어디에도 저장하지 않습니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회하는 강력한 키입니다. `.env.local`은
  git에 커밋되지 않으며 (`.gitignore` 참고), Vercel에서는 Environment Variables에만
  등록하고 절대 클라이언트 코드나 `NEXT_PUBLIC_` 변수로 노출하지 마세요.
