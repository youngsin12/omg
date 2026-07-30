# Google OAuth / Supabase 운영 체크리스트

## 1. Google Cloud Console

OAuth Client의 Authorized redirect URI는 앱의 `/auth/callback` 이 아니라 Supabase callback이어야 합니다.

현재 프로젝트 기준 정확한 값:

```text
https://gfnbsnxjihulafqzxfdm.supabase.co/auth/v1/callback
```

점검 항목:
- [ ] Google Cloud OAuth Client에 위 URI가 정확히 등록되어 있다.
- [ ] `localhost:3000/auth/callback` 또는 `127.0.0.1:3010/auth/callback` 를 Google Cloud에 넣지 않았다.
- [ ] Google Client Secret은 Google Cloud와 Supabase dashboard에만 저장되어 있다.

## 2. Supabase Dashboard

Auth → Providers → Google
- [ ] Google provider가 enabled 상태다.
- [ ] Google client ID / secret이 현재 사용하는 OAuth Client와 일치한다.
- [ ] Google provider 화면에 표시되는 callback URL이 아래와 일치한다.

```text
https://gfnbsnxjihulafqzxfdm.supabase.co/auth/v1/callback
```

Auth → URL Configuration / Redirect URLs
- [ ] 기본 로컬 개발 callback이 등록되어 있다.

```text
http://localhost:3000/auth/callback
```

- [ ] 127.0.0.1:3010 으로 실행할 때는 아래 값도 등록되어 있다.

```text
http://127.0.0.1:3010/auth/callback
```

- [ ] 배포 도메인이 있으면 그 도메인의 `/auth/callback` 도 추가했다.

## 3. 앱 환경변수

`.env.local` 점검:

```text
NEXT_PUBLIC_SUPABASE_URL=https://gfnbsnxjihulafqzxfdm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

보조 alias가 필요하면:

```text
SUPABASE_URL=https://gfnbsnxjihulafqzxfdm.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

점검 항목:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 이 현재 프로젝트 ref와 일치한다.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 가 같은 프로젝트의 publishable/anon key다.
- [ ] 서로 다른 Supabase 프로젝트의 URL/key를 섞어 쓰지 않는다.

## 4. 앱 동작 기준값

이 앱은 로그인 시작 시 현재 브라우저 origin 기준으로 redirectTo를 만듭니다.

예시:
- `http://localhost:3000/auth/callback?next=%2Fdashboard`
- `http://127.0.0.1:3010/auth/callback?next=%2Fdashboard`

즉:
- Google Cloud는 Supabase callback
- Supabase Redirect URLs는 앱 callback

이 둘을 구분해야 합니다.

## 5. 장애 대응

로그인 실패 시 확인 순서:
1. 브라우저에서 `/auth/auth-code-error` 화면의 오류 코드와 요청 ID 확인
2. 서버 로그에서 `scope: "proshot.auth"` 검색
3. 아래 이벤트 기준으로 분기
   - `oauth_callback_missing_code`
   - `oauth_code_exchange_failed`
   - `session_check_failed`
   - `oauth_start_failed`

## 6. 가장 흔한 실패 패턴

- Google Cloud에 앱 callback(`/auth/callback`)을 넣음
- Supabase Redirect URLs에 실제 앱 origin이 빠짐
- `localhost:3000` 과 `127.0.0.1:3010` 을 혼용함
- Supabase URL은 A 프로젝트, anon key는 B 프로젝트 것을 씀
