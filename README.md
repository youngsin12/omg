# ProShot

Gemini 이미지 편집 모델로 셀카를 프로필 사진 스타일로 변환하는 Next.js 앱입니다.

## Supabase test connection

The home page reads one non-sensitive status row from
`public.proshot_connection_checks`. Row Level Security allows read-only access to that row and
blocks browser writes. Images, prompts, IP addresses, and user data are not stored.

Copy `.env.example` to `.env.local` and configure:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# Optional server-side aliases used by the home-page connection check
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The publishable key identifies the project but does not bypass RLS. Never expose a secret key,
service-role key, database password, or `DATABASE_URL` in browser code.

## Google OAuth

The app includes:

- `/login` with Google OAuth
- cookie-based Supabase SSR sessions
- global `AuthContext`
- server and middleware protection for `/dashboard`
- `/auth/callback` PKCE code exchange
- logout from the protected dashboard

In Supabase, enable the Google provider and allow your app callback URL as a Redirect URL.
For the default local Next.js dev server, add:
`http://localhost:3000/auth/callback`

If you run the app on a different origin, add that exact origin instead, for example:
`http://127.0.0.1:3010/auth/callback`

In Google Cloud, do not use your app callback URL. Use the Supabase project callback URL shown
on the Google provider page as the Authorized redirect URI.
Typical hosted-project format:
`https://<project-ref>.supabase.co/auth/v1/callback`

If Google login fails with `redirect_uri_mismatch`, compare the Google Cloud value above with the
exact callback shown in the Supabase dashboard first.

Keep the Google Client Secret only in Google Cloud and the Supabase dashboard.

## Auth observability

The auth flow writes structured JSON logs with `scope: "proshot.auth"`.
Look for these events when debugging login failures:

- `oauth_start_requested`
- `oauth_start_failed`
- `oauth_callback_received`
- `oauth_callback_missing_code`
- `oauth_code_exchange_failed`
- `oauth_callback_redirected`
- `session_check_failed`
- `logout_failed`

The callback error page also shows an error code and request ID so support can correlate a user
report with server logs quickly.

## Server configuration

`.env.local`에 아래 환경변수를 설정합니다. 실제 키를 문서나 Git에 저장하지 마세요.

```text
GEMINI_API_KEY=<secret>
GENERATION_RATE_LIMIT_MAX=5
GENERATION_RATE_LIMIT_WINDOW_MS=600000
GENERATION_DAILY_BUDGET_USD=5
```

- 한 요청은 사용자가 선택한 Gemini 모델 하나만 호출합니다.
- rate limit과 일일 비용 한도는 배포 전 검증을 위한 프로세스 메모리 방식입니다.
- 다중 인스턴스 배포 전에는 Redis/DB 기반 공유 카운터로 교체해야 합니다.
- 생성 로그에는 이미지, 프롬프트, API 키, 원본 IP를 기록하지 않습니다.

## Getting Started

First, run the development server:

```bash
npm run dev
# or

yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
