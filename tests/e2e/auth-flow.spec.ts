import { expect, test } from 'playwright/test';

test('login page renders Google sign-in entry', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: '작업 공간에 로그인' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible();
});

test('dashboard redirects anonymous users to login with next param', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await expect(page.getByRole('heading', { name: '작업 공간에 로그인' })).toBeVisible();
});

test('auth error page exposes reason code and request id', async ({ page }) => {
  await page.goto('/auth/auth-code-error?code=OAUTH_CODE_EXCHANGE_FAILED&requestId=req-e2e-001&retryable=1');

  await expect(page.getByRole('heading', { name: '로그인 세션 연결에 실패했습니다.' })).toBeVisible();
  await expect(page.getByText('OAUTH_CODE_EXCHANGE_FAILED')).toBeVisible();
  await expect(page.getByText('req-e2e-001')).toBeVisible();
});

test('login page shows middleware failure banner when authError query is present', async ({ page }) => {
  await page.goto('/login?authError=SESSION_CHECK_FAILED');

  await expect(page.getByText('로그인 상태를 확인하지 못했습니다.')).toBeVisible();
  await expect(page.getByText('세션 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')).toBeVisible();
});
