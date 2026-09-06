# Supabase 마이그레이션 설정 가이드

Replit 백엔드를 Supabase(무료, 항상 켜짐)로 교체하기 위한 설정 절차입니다.

---

## 1단계: Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) → **Start your project** → GitHub 계정으로 로그인
2. **New project** 클릭
   - Organization: 기존 조직 선택
   - Name: `moodng-hr` (아무 이름 가능)
   - Database Password: 안전한 비밀번호 입력 후 **따로 메모** (이후 필요 없음)
   - Region: **Northeast Asia (Seoul)** 선택
3. **Create new project** 클릭 → 2분 정도 대기

---

## 2단계: 데이터베이스 스키마 생성

1. 좌측 메뉴 → **SQL Editor** 클릭
2. **New query** 클릭
3. `supabase/migrations/001_initial.sql` 파일 전체 내용을 붙여넣기
4. **Run** (또는 Ctrl+Enter) → "Success" 메시지 확인

---

## 3단계: Edge Function 시크릿 설정

1. 좌측 메뉴 → **Edge Functions** 클릭
2. **Manage secrets** 클릭
3. **Add new secret** 클릭 후 아래 값 추가:

   | Name | Value |
   |------|-------|
   | `CLERK_JWKS_URL` | `https://enough-ladybug-9703.clerk.accounts.dev/.well-known/jwks.json` |

4. **Save** 클릭

---

## 4단계: Clerk 세션 토큰에 이메일 포함 설정

Edge Function이 회원가입 시 이메일을 JWT에서 읽습니다. Clerk 대시보드에서 설정이 필요합니다.

1. [https://dashboard.clerk.com](https://dashboard.clerk.com) → 앱(**연차 정산 도구**) 선택
2. 좌측 메뉴 → **Sessions** → **Edit** (Session token 섹션)
3. 아래 JSON을 추가 (기존 내용에 merge):

   ```json
   {
     "email": "{{user.primary_email_address}}",
     "email_verified": "{{user.primary_email_address.verification.status}}"
   }
   ```

4. **Save** 클릭

---

## 5단계: GitHub 시크릿 추가

GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

아래 4개를 추가합니다:

### `VITE_API_URL`
- Supabase 대시보드 → **Settings** → **API** → **Project URL** 복사
- 값: `https://[프로젝트 ref].supabase.co/functions/v1`
- 예: `https://abcdefghijklmn.supabase.co/functions/v1`

### `SUPABASE_PROJECT_ID`
- Supabase 대시보드 → **Settings** → **General** → **Reference ID** 복사
- 예: `abcdefghijklmn`

### `SUPABASE_ACCESS_TOKEN`
- [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → **Generate new token**
- 이름: `github-actions` 입력 후 생성
- 생성된 토큰 복사 (다시 볼 수 없음)

### `VITE_CLERK_PUBLISHABLE_KEY`
- 이미 설정되어 있으면 건너뛰세요.
- Clerk 대시보드 → **API Keys** → **Publishable key** 복사

---

## 6단계: 배포 실행

1. GitHub 저장소 → **Actions** 탭
2. **Deploy Vite App to GitHub Pages** 워크플로우 클릭
3. **Run workflow** 버튼 클릭 (또는 main 브랜치에 push)
4. 워크플로우 완료 확인 (약 2~3분 소요)

워크플로우가 완료되면:
- 프론트엔드가 GitHub Pages에 배포됩니다
- `api` Edge Function이 Supabase에 배포됩니다

---

## 7단계: 기존 데이터 이관 (선택사항)

기존 Replit PostgreSQL에 데이터가 있다면:

1. Replit에서 DB 덤프: `pg_dump $DATABASE_URL > backup.sql`
2. Supabase SQL Editor에서 데이터만 붙여넣기 (테이블 생성 구문 제외)

---

## 완료 후 확인

- 사이트 주소: `https://[GitHub 유저명].github.io/my-leaflet-app/`
- 로그인 후 직원 정보가 정상 조회되면 성공

---

## 비용 요약

| 서비스 | 무료 한도 | 예상 사용량 (50명) |
|--------|-----------|-------------------|
| Supabase DB | 500MB | ~5MB |
| Edge Functions | 월 500,000회 | 월 ~5,000회 |
| GitHub Pages | 무제한 | - |
| Clerk | 월 10,000 MAU | ~50명 |

**모두 무료 범위 내 운영 가능합니다.**
