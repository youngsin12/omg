import assert from "node:assert/strict";
import test from "node:test";
import { safeNextPath } from "../app/auth/redirect.ts";

test("safeNextPath accepts local paths", () => {
  assert.equal(safeNextPath("/dashboard"), "/dashboard");
  assert.equal(safeNextPath("/dashboard?tab=recent"), "/dashboard?tab=recent");
});

test("safeNextPath rejects external and protocol-relative redirects", () => {
  assert.equal(safeNextPath("https://evil.example"), "/dashboard");
  assert.equal(safeNextPath("//evil.example"), "/dashboard");
  assert.equal(safeNextPath(null), "/dashboard");
});
