# Financial Relationship OS

`financial_os_app.html`의 디자인/레이아웃/탭 구성을 그대로 유지하면서, 데이터가 실제로 영속되는
앱으로 만든 버전입니다. **Next.js (App Router) + Supabase** 스택으로, SDWGA-APP과 동일한
방식(Next.js + Supabase, Vercel 배포)으로 구축되어 있습니다.

고객 데이터는 **사람(people)**과 **정책(policies)**으로 분리되어 있습니다 — 한 사람이 여러
정책(Life/Annuity)을 가질 수 있고, 사람 정보(성별/생년월일/직업/이메일 등)는 한 번만
입력하면 그 사람의 모든 정책에서 공유됩니다.

## 이미 배포된 프로젝트를 업그레이드하는 경우 (기존 `clients` 테이블 → `people`+`policies`)

이전 버전을 이미 Supabase에 배포해서 쓰고 계셨다면, Supabase SQL Editor에서 아래 순서로
실행하세요 (모두 두 번 실행해도 안전합니다 — 이미 끝난 단계는 아무 것도 하지 않습니다):

1. **`supabase/migrate_people_policies.sql`** — 기존 `clients` 테이블의 163건 데이터를
   이름이 같으면 같은 사람으로 묶어서 `people`(사람) + `policies`(정책) 테이블로 이전하고,
   `clients` 테이블은 삭제합니다.
2. **`supabase/migrate_add_surrendered.sql`**, **`supabase/migrate_add_needs_attention.sql`**
   — `policies`에 "계약해지"/"주의요망" 상태 컬럼을 추가합니다.
3. **`supabase/migrate_prospects_fields.sql`** — 기존 `prospects` 테이블의 `(name, segment)`를
   `(last_name, first_name, korean_name, category)`로 재구성합니다. 원래 이름(`name`)은
   `korean_name`에 그대로 보존되고, `last_name`/`first_name`은 한글 이름은 통째로
   `last_name`에, 영문 이름("Luke Chung" 같은 First-Last 순서)은 자연스러운 순서로
   분리해 넣습니다 — 자동 분리가 애매한 경우 나중에 직접 수정하시면 됩니다.

## 새로 시작하는 경우 (로컬 개발 설정)

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. Supabase 대시보드의 SQL Editor에서 `supabase/schema.sql`을 실행해 테이블
   (`people`, `policies`, `prospects`, `columns_lib`)과 `convert_prospect` 함수를 만듭니다.
3. 이어서 `supabase/seed.sql`을 실행하면 초기 데이터(people 133명, policies 163건,
   prospects 227명, columns 104편)가 채워집니다. 빈 DB에 한 번만 실행하세요.
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
2. 위 4단계의 `.env.local`과 같은 두 값(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)을
   Vercel 프로젝트의 Environment Variables에 등록합니다.
3. Deploy — 이후 `main` 브랜치에 push할 때마다 자동으로 재배포됩니다.

## 구현된 기능

1. **데이터 영속성** — Supabase(Postgres)에 저장되어 언제 어디서 접속해도 유지됩니다.
2. **Current Client 테이블** — 성/이름/Policy/Issued Date/Life-Annuity 구분/회사를
   한눈에 보는 표. 성/Issued Date/Life-Annuity/회사 컬럼 헤더를 클릭하면 정렬됩니다.
3. **사람 상세정보** — 이름(성/이름 클릭)을 누르면 성별·생년월일·연령대(자동 계산)·직업·
   Medicare 여부·이메일·전화·기타 정보와, 그 사람이 보유한 모든 정책 목록이 나옵니다.
4. **정책 상세정보** — Policy 번호를 누르면 Issued Year/Month/Date, 가입 후 경과 연수,
   회사, 플랜 이름, Life/Annuity 구분에 따라 다른 상세 필드(Life: Type/Death Benefit/
   Option/Total·Annual Premium/Premium Method, Annuity: Type/Initial·Additional
   Premium)와 Account Value/Surrender Value/Loan·Withdrawal 여부가 나옵니다.
5. **검토 완료 체크** — 정책별 체크박스를 누르면 즉시 저장되고, "검토 필요" 목록/Today
   탭에서 제외됩니다.
6. **메모 추가** — Today 탭 정책 카드의 메모 입력창에서 자유롭게 입력 후 다른 곳을
   클릭하면(blur) 저장됩니다.
7. **Potential Client 테이블** — 성/이름/한글명/Email/Phone/접촉경로를 한눈에 보는 표.
   성/접촉경로 컬럼 헤더를 클릭하면 정렬됩니다. 행을 클릭하면 상세정보(모든 필드 편집 +
   "고객으로 전환" 버튼)가 나옵니다.
8. **잠재고객 → 고객 전환** — "전환" 버튼을 누르면 해당 레코드가 사람(people)으로
   이동합니다 (`convert_prospect` Postgres 함수로 insert+delete가 하나의 트랜잭션으로
   원자적으로 처리됩니다). 아직 정책은 없는 상태로 생성되며, 이후 Current Client 탭에서
   정책을 추가하면 표시됩니다.
9. **검색** — 클라이언트 사이드에서 이름 기준으로 필터링합니다.

아직 구현되지 않은 것 (다음 순서로 예정): 엑셀처럼 프린트하는 기능.

## API

| Method | Path                              | 설명                                  |
|--------|-----------------------------------|---------------------------------------|
| GET    | `/api/policies`                   | 전체 정책 (사람 이름 join, Current Client 테이블용) |
| GET    | `/api/policies/{id}`               | 정책 상세                              |
| PATCH  | `/api/policies/{id}`               | 정책 필드 부분 업데이트 (Life/Annuity 상세 필드, `reviewed`, `note` 등) |
| GET    | `/api/people/{id}`                 | 사람 상세 + 보유 정책 목록              |
| PATCH  | `/api/people/{id}`                 | 사람 필드 부분 업데이트                |
| GET    | `/api/prospects`                   | 전체 잠재고객                          |
| GET    | `/api/prospects/{id}`              | 잠재고객 상세                          |
| PATCH  | `/api/prospects/{id}`              | 잠재고객 필드 부분 업데이트 (성/이름/한글명/이메일/전화/접촉경로/주요정보) |
| POST   | `/api/prospects/{id}/convert`      | 잠재고객 → 사람(people) 전환 (`convert_prospect` RPC 호출) |
| GET    | `/api/columns`                     | 재정칼럼 라이브러리                    |

`daysToAnniv`/`anniv`/`periodYears`는 저장된 값이 아니라 정책의 `issueDate`를 기준으로
매 요청마다 오늘 날짜 기준으로 재계산됩니다. `ageBracket`도 사람의 `dob` 기준으로 매
요청마다 재계산됩니다 (모두 `lib/mapping.ts`).

`needsReview`/`reviewReason`은 원본 데이터(`full_data.json`)에 이미 계산되어 들어있는
값을 그대로 보존합니다. "AV가 설계예상보다 낮음 / 대출 존재" 로직을 서버에서 새로
재계산하려면 설계예상 금액·대출 여부 같은 원본 입력값이 필요한데, 현재 데이터 소스에는
계산 결과만 있고 그 원본 입력값이 포함되어 있지 않습니다.

Current Client 탭은 기본적으로 last name(성) 기준 대소문자 무시 알파벳순으로 정렬되며,
테이블 헤더 클릭으로 Issued Date/Life-Annuity 구분/회사 기준으로도 정렬할 수 있습니다
(`lib/mapping.ts`의 `compareByLastName`, `components/PolicyTable.tsx`).

## 검증 상태

이 코드는 다음까지 검증되었습니다:
- `npm run build` + `npm run lint` 성공
- `supabase/schema.sql` + `supabase/seed.sql`을 실제 Postgres에 적용해 people 133명/
  policies 163건/prospects 227명/columns 104편 정상 삽입 확인
- `supabase/migrate_people_policies.sql`을 기존 `clients` 스키마가 있는 DB에 적용해
  실제로 people+policies로 정상 이전되는지, 두 번 실행해도 안전한지 확인
- `convert_prospect` 함수를 SQL로 직접 호출해 원자적 동작 확인 (사람 이름에 공백이
  없는 경우 등 엣지 케이스 포함)
- 나이대 계산(생일 당일/하루 전 경계값), 정책 경과 연수 계산, last-name 정렬 로직을
  단위 테스트로 검증

다만 실제 Supabase 프로젝트에 연결해 브라우저로 클릭해보는 종단간 테스트는
이 코드를 작성한 환경에서는 수행하지 못했습니다 (Docker 미지원으로 로컬에서 Supabase
스택을 띄울 수 없었음). 위 절차대로 연결/이전하신 뒤 한 번 실제로 확인해 주세요.

## 보안 참고

- 별도 인증(로그인) 기능은 없습니다. 배포 후 외부에 공개할 경우 인증을 추가하는 것을
  권장합니다.
- 비밀번호 등 민감 정보는 어디에도 저장하지 않습니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회하는 강력한 키입니다. `.env.local`은
  git에 커밋되지 않으며 (`.gitignore` 참고), Vercel에서는 Environment Variables에만
  등록하고 절대 클라이언트 코드나 `NEXT_PUBLIC_` 변수로 노출하지 마세요.
