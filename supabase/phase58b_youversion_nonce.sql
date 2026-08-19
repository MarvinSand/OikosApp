-- ============================================================
-- Phase 58b: OpenID-Connect verlangt bei scope=openid einen Nonce
-- (siehe error "nonce is required when scope includes openid").
-- ============================================================
alter table public.youversion_oauth_state
  add column if not exists nonce text;
